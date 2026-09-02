const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Use the pre-configured project prisma instance
const prisma = require("../src/config/prisma");

async function runSimulation() {
  console.log("🚀 Running AI CCTV End-to-End Pipeline Simulation...");

  // 1. Fetch active company, employee, and camera
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error("❌ No Company found in database. Run seed first.");
    return;
  }

  const employee = await prisma.employee.findFirst({ where: { companyId: company.id } });
  const camera = await prisma.camera.findFirst({ where: { companyId: company.id } });

  if (!employee || !camera) {
    console.error("❌ Missing Employee or Camera records for company:", company.name);
    return;
  }

  const now = new Date();
  const checkInTime = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago
  const checkOutTime = now; // Current time

  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // 2. Simulate Morning Check-IN Raw Log
  const checkInLog = await prisma.attendanceRawLog.create({
    data: {
      companyId: company.id,
      employeeId: employee.id,
      cameraId: camera.id,
      punchTimestamp: checkInTime,
      confidenceScore: 0.96,
      syncStatus: "SYNCED",
    },
  });

  // 3. Simulate Evening Check-OUT Raw Log
  await prisma.attendanceRawLog.create({
    data: {
      companyId: company.id,
      employeeId: employee.id,
      cameraId: camera.id,
      punchTimestamp: checkOutTime,
      confidenceScore: 0.94,
      syncStatus: "SYNCED",
    },
  });

  // 4. Update Daily Attendance (4 Hours = 240 mins)
  await prisma.dailyAttendance.upsert({
    where: {
      companyId_employeeId_attendanceDate: {
        companyId: company.id,
        employeeId: employee.id,
        attendanceDate: startOfDay,
      },
    },
    update: {
      firstIn: checkInTime,
      lastOut: checkOutTime,
      totalWorkMinutes: 240,
      status: "PRESENT",
    },
    create: {
      companyId: company.id,
      employeeId: employee.id,
      attendanceDate: startOfDay,
      firstIn: checkInTime,
      lastOut: checkOutTime,
      totalWorkMinutes: 240,
      status: "PRESENT",
    },
  });

  // 5. Update Daily Analytics Engine (Module 7)
  await prisma.employeeDailyAnalytics.upsert({
    where: {
      companyId_employeeId_date: {
        companyId: company.id,
        employeeId: employee.id,
        date: startOfDay,
      },
    },
    update: {
      officePresenceMin: 240,
      deskPresenceMin: 180,
      breakMin: 30,
      meetingMin: 30,
      awayMin: 0,
      firstSeen: checkInTime,
      lastSeen: checkOutTime,
    },
    create: {
      companyId: company.id,
      employeeId: employee.id,
      date: startOfDay,
      officePresenceMin: 240,
      deskPresenceMin: 180,
      breakMin: 30,
      meetingMin: 30,
      awayMin: 0,
      firstSeen: checkInTime,
      lastSeen: checkOutTime,
    },
  });

  // 6. Enqueue Outbound Punch for StaffPie HRMS (Module 10)
  await prisma.hrmsSyncQueue.create({
    data: {
      companyId: company.id,
      rawLogId: checkInLog.id,
      payload: {
        mode: "face",
        employeeCode: employee.employeeCode,
        deviceId: camera.name,
        eventType: "check_in",
        timestamp: checkInTime.toISOString(),
      },
      status: "PENDING",
    },
  });

  console.log(`✅ Pipeline Simulation Finished for: ${employee.name} (${employee.employeeCode})`);
  console.log(`📊 Office Presence: 4h 0m | Desk Presence: 3h 0m | Status: PRESENT`);
}

runSimulation()
  .catch((e) => console.error("Simulation Failed:", e))
  .finally(() => prisma.$disconnect());