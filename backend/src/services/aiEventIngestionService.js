const prisma = require("../config/prisma");
const { pushAttendancePunch } = require("./hrmsOutboundService");

const DEBOUNCE_MINUTES = 5;

/**
 * Process incoming detection event from Python AI / Edge stream
 */
async function processAIEvent({ companyId, cameraId, employeeCode, confidenceScore, snapshotUrl }) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const threshold = company?.confidenceThreshold || 0.85;

  // 1. Low Confidence & Unknown Person Rule
  if (!employeeCode || confidenceScore < threshold) {
    return await prisma.aIEvent.create({
      data: {
        companyId,
        cameraId,
        eventType: "UNKNOWN_PERSON",
        confidenceScore: confidenceScore || 0.0,
        snapshotUrl,
      },
    });
  }

  // 2. Identify Employee
  const employee = await prisma.employee.findFirst({
    where: { companyId, employeeCode, status: "ACTIVE" },
  });

  if (!employee) {
    return await prisma.aIEvent.create({
      data: {
        companyId,
        cameraId,
        eventType: "UNKNOWN_PERSON",
        confidenceScore,
        snapshotUrl,
      },
    });
  }

  // 3. Debounce & Cooldown Window Rule (Prevent duplicate punches)
  const debounceWindow = new Date(Date.now() - DEBOUNCE_MINUTES * 60 * 1000);
  const recentEvent = await prisma.attendanceEvent.findFirst({
    where: {
      companyId,
      employeeId: employee.id,
      eventTimestamp: { gte: debounceWindow },
    },
    orderBy: { eventTimestamp: "desc" },
  });

  if (recentEvent) {
    return {
      status: "DEBOUNCED",
      message: `Detection debounced. Last punch was at ${recentEvent.eventTimestamp}`,
      lastEventId: recentEvent.id,
    };
  }

  // 4. Determine Check-In vs Check-Out (Session state)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayPunches = await prisma.attendanceEvent.findMany({
    where: {
      companyId,
      employeeId: employee.id,
      eventTimestamp: { gte: today },
    },
    orderBy: { eventTimestamp: "asc" },
  });

  const eventType = todayPunches.length % 2 === 0 ? "CHECK_IN" : "CHECK_OUT";

  // 5. Create Attendance Event in PostgreSQL
  const attendanceEvent = await prisma.attendanceEvent.create({
    data: {
      companyId,
      employeeId: employee.id,
      cameraId,
      eventType,
      eventTimestamp: new Date(),
      confidenceScore,
      snapshotUrl,
      hrmsSyncStatus: "PENDING",
      retryCount: 0,
    },
  });

  // 6. Log meaningful AI Detection event
  await prisma.aIEvent.create({
    data: {
      companyId,
      cameraId,
      employeeId: employee.id,
      eventType,
      confidenceScore,
      snapshotUrl,
    },
  });

  // 7. Dispatch Outbound Punch to StaffPie (HRMS Down fallback handled inside)
  pushAttendancePunch(attendanceEvent.id).catch((err) => {
    console.error(`Async punch push failed for event ${attendanceEvent.id}:`, err.message);
  });

  return {
    status: "PROCESSED",
    attendanceEvent,
  };
}

module.exports = { processAIEvent };