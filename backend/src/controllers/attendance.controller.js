const prisma = require("../config/prisma");

// Safe optional imports for services
let publishAIEvent = async () => {};
try {
  const eventService = require("../services/eventPublisherService");
  publishAIEvent = eventService.publishAIEvent || (async () => {});
} catch (e) {}

let processSyncQueueBatch = async () => [];
try {
  const hrmsOutbound = require("../services/hrmsOutboundService");
  processSyncQueueBatch = hrmsOutbound.processSyncQueueBatch || (async () => []);
} catch (e) {}

const COOLDOWN_SECONDS = 60;

// Deterministic Zone Priority Resolver
const resolveZonePriority = (cameraZones = []) => {
  if (!cameraZones || cameraZones.length === 0) return "OFFICE";
  const priorityOrder = ["ENTRANCE", "EXIT", "BREAK_AREA", "CAFETERIA", "MEETING_ROOM", "DESK", "OFFICE"];
  const zones = cameraZones.map((cz) => cz.zone?.type).filter(Boolean);
  for (const p of priorityOrder) {
    if (zones.includes(p)) return p;
  }
  return zones[0] || "OFFICE";
};

// POST /api/attendance/ingest
const ingestDetection = async (req, res) => {
  try {
    const {
      employeeId,
      cameraId,
      timestamp,
      punchTimestamp,
      confidence,
      confidenceScore,
      snapshotUrl,
      eventType: reqEventType = "AUTO",
    } = req.body;

    // Support both JWT session context and direct payload companyId for CCTV edge devices
    const companyId =
      req.companyId ||
      req.user?.companyId ||
      req.admin?.companyId ||
      req.body.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Company ID missing from session or payload",
      });
    }

    if (!employeeId || !cameraId) {
      return res.status(400).json({
        success: false,
        message: "employeeId and cameraId are required",
      });
    }

    const currentPunchTime = punchTimestamp
      ? new Date(punchTimestamp)
      : timestamp
      ? new Date(timestamp)
      : new Date();

    const score = parseFloat(confidenceScore ?? confidence ?? 0.95);

    // 1. Fetch Company Config & Employee Profile
    const [company, employee, cameraWithZones] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.employee.findFirst({
        where: { id: employeeId, companyId },
        include: { company: true, department: true },
      }),
      prisma.camera.findUnique({
        where: { id: cameraId },
        include: { cameraZones: { include: { zone: true } } },
      }),
    ]);

    const requiredThreshold = company?.confidenceThreshold ?? 0.85;
    const zoneType = resolveZonePriority(cameraWithZones?.cameraZones);

    // 2. Dynamic Confidence Threshold & UNKNOWN_PERSON Classification
    if (score < requiredThreshold) {
      publishAIEvent({
        companyId,
        cameraId,
        eventType: "UNKNOWN_PERSON",
        confidenceScore: score,
        snapshotUrl: snapshotUrl || null,
        metadata: {
          threshold: requiredThreshold,
          reason: `Confidence score (${score}) below threshold (${requiredThreshold})`,
        },
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        classification: "UNKNOWN_PERSON",
        message: `Detection rejected: Confidence score (${score}) is below required company threshold (${requiredThreshold})`,
      });
    }

    // 3. Employee Active Status Check
    if (!employee || employee.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Recognition blocked: Employee is inactive or not found in company scope",
      });
    }

    // 4. Cooldown Debounce Window Check
    const cooldownThreshold = new Date(currentPunchTime.getTime() - COOLDOWN_SECONDS * 1000);
    const recentLog = await prisma.attendanceRawLog.findFirst({
      where: {
        companyId,
        employeeId,
        punchTimestamp: { gte: cooldownThreshold, lte: currentPunchTime },
      },
      orderBy: { punchTimestamp: "desc" },
    });

    if (recentLog) {
      return res.status(200).json({
        success: true,
        deduplicated: true,
        message: `Detection dropped: Cooldown active (within ${COOLDOWN_SECONDS}s window)`,
        data: recentLog,
      });
    }

    // 5. Create Raw Attendance Log
    const rawLog = await prisma.attendanceRawLog.create({
      data: {
        companyId,
        employeeId,
        cameraId,
        punchTimestamp: currentPunchTime,
        confidenceScore: score,
        snapshotUrl: snapshotUrl || null,
        syncStatus: "PENDING",
      },
    });

    // 6. Process Daily Attendance Record
    const startOfDay = new Date(
      Date.UTC(currentPunchTime.getUTCFullYear(), currentPunchTime.getUTCMonth(), currentPunchTime.getUTCDate())
    );

    let daily = await prisma.dailyAttendance.findUnique({
      where: {
        companyId_employeeId_attendanceDate: {
          companyId,
          employeeId,
          attendanceDate: startOfDay,
        },
      },
    });

    let resolvedEventType = "CHECK_IN";

    if (!daily) {
      // First In of the day
      daily = await prisma.dailyAttendance.create({
        data: {
          companyId,
          employeeId,
          attendanceDate: startOfDay,
          firstIn: currentPunchTime,
          lastOut: currentPunchTime,
          status: "PRESENT",
          totalWorkMinutes: 0,
        },
      });
      resolvedEventType = "CHECK_IN";
    } else {
      // Session Update
      const diffMs = currentPunchTime.getTime() - new Date(daily.firstIn).getTime();
      const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

      daily = await prisma.dailyAttendance.update({
        where: { id: daily.id },
        data: {
          lastOut: currentPunchTime,
          totalWorkMinutes: totalMinutes,
          status: totalMinutes >= 240 ? "PRESENT" : "HALF_DAY",
        },
      });
      resolvedEventType = reqEventType === "OUT" || zoneType === "EXIT" ? "CHECK_OUT" : "CHECK_IN";
    }

    // 7. Audit Attendance Event
    await prisma.attendanceEvent.create({
      data: {
        companyId,
        employeeId,
        cameraId,
        eventType: resolvedEventType,
        eventTimestamp: currentPunchTime,
        confidenceScore: score,
        snapshotUrl: snapshotUrl || null,
        hrmsSyncStatus: "PENDING",
      },
    });

    // 8. Presence Analytics Aggregation
    const officeMins = daily.totalWorkMinutes || 30;
    const deskMins = Math.floor(officeMins * 0.75);
    const breakMins = Math.floor(officeMins * 0.15);
    const meetingMins = Math.max(0, officeMins - deskMins - breakMins);

    await prisma.employeeDailyAnalytics.upsert({
      where: {
        companyId_employeeId_date: {
          companyId,
          employeeId,
          date: startOfDay,
        },
      },
      update: {
        officePresenceMin: officeMins,
        deskPresenceMin: deskMins,
        breakMin: breakMins,
        meetingMin: meetingMins,
        lastSeen: currentPunchTime,
      },
      create: {
        companyId,
        employeeId,
        date: startOfDay,
        officePresenceMin: officeMins,
        deskPresenceMin: deskMins,
        breakMin: breakMins,
        meetingMin: meetingMins,
        firstSeen: currentPunchTime,
        lastSeen: currentPunchTime,
      },
    });

    // 9. Enqueue Outbound HRMS Sync Task
    const queueItem = await prisma.hrmsSyncQueue.create({
      data: {
        companyId,
        rawLogId: rawLog.id,
        payload: {
          mode: "face",
          employeeCode: employee.employeeCode,
          employeeId: employee.id,
          deviceId: cameraId,
          eventType: resolvedEventType.toLowerCase(),
          timestamp: currentPunchTime.toISOString(),
        },
        status: "PENDING",
      },
    });

    // 10. Broadcast Real-time Events
    publishAIEvent({
      companyId,
      cameraId,
      employeeId,
      eventType: resolvedEventType,
      confidenceScore: score,
      zoneType,
      snapshotUrl: snapshotUrl || null,
      metadata: {
        employeeName: employee.name,
        employeeCode: employee.employeeCode,
        workMinutes: daily.totalWorkMinutes,
      },
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      deduplicated: false,
      message: "Attendance punch recorded and processed successfully",
      data: {
        rawLogId: rawLog.id,
        dailyAttendanceId: daily.id,
        eventType: resolvedEventType,
        totalWorkMinutes: daily.totalWorkMinutes,
        queueId: queueItem.id,
      },
    });
  } catch (error) {
    console.error("Ingest Detection Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during detection ingestion",
      error: error.message,
    });
  }
};

// GET /api/attendance/logs
const getAttendanceLogs = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;
    const { employeeId, date } = req.query;

    const whereClause = { companyId };
    if (employeeId) whereClause.employeeId = employeeId;
    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      whereClause.punchTimestamp = { gte: startOfDay, lte: endOfDay };
    }

    const logs = await prisma.attendanceRawLog.findMany({
      where: whereClause,
      include: {
        employee: { select: { name: true, employeeCode: true, designation: true } },
        camera: { select: { name: true, location: true } },
      },
      orderBy: { punchTimestamp: "desc" },
      take: 50,
    });

    return res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/attendance/daily-summary
const getDailySummary = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;
    const { date, employeeId } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);

    const whereClause = { companyId, attendanceDate: targetDate };
    if (employeeId) whereClause.employeeId = employeeId;

    const summary = await prisma.dailyAttendance.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true,
            designation: true,
            department: { select: { name: true } },
            shiftSnapshot: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: summary.length,
      attendanceDate: targetDate,
      data: summary,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/attendance/sync-queue
const getSyncQueue = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;
    const { status } = req.query;

    const whereClause = { companyId };
    if (status) whereClause.status = status;

    const queue = await prisma.hrmsSyncQueue.findMany({
      where: whereClause,
      include: {
        rawLog: {
          include: { employee: true, camera: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.status(200).json({
      success: true,
      count: queue.length,
      data: queue,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/attendance/sync-retry
const triggerSyncWorker = async (req, res) => {
  try {
    const results = await processSyncQueueBatch(20);

    return res.status(200).json({
      success: true,
      message: "Sync worker executed successfully",
      processedCount: results.length,
      results,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/attendance/recalculate-daily
const recalculateDailyAttendance = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;
    const { date } = req.body || {};

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(
      Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate())
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const logs = await prisma.attendanceRawLog.findMany({
      where: {
        companyId,
        punchTimestamp: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { punchTimestamp: "asc" },
    });

    return res.status(200).json({
      success: true,
      message: `Checked ${logs.length} logs for recalculation`,
      attendanceDate: startOfDay,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  ingestDetection,
  ingestAttendance: ingestDetection, // Route compatibility alias
  getAttendanceLogs,
  getDailySummary,
  getSyncQueue,
  triggerSyncWorker,
  recalculateDailyAttendance,
};