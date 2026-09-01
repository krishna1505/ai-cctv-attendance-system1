const prisma = require("../config/prisma");
const { processDailyAttendanceForPunch } = require("../services/shiftEngineService");
const { processSyncQueueBatch } = require("../services/hrmsOutboundService");
const { processPresenceAndZoneSessions } = require("../services/presenceEngineService");
const { shouldProcessPersonDetection } = require("../utils/personTracker.util");
const { decrypt } = require("../utils/crypto.util");

const COOLDOWN_SECONDS = 60;

// Deterministic Zone Priority Resolver for Multi-Zone Camera Mappings
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
    const { employeeId, cameraId, punchTimestamp, confidenceScore = 0.0, snapshotUrl } = req.body;
    
    // Safely extract companyId from auth middleware session
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Company ID missing from auth session",
      });
    }

    if (!employeeId || !cameraId) {
      return res.status(400).json({
        success: false,
        message: "employeeId and cameraId are required",
      });
    }

    // 1. Fetch Company Config (Dynamic Threshold) & Employee Profile
    const [company, employee] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.employee.findFirst({
        where: { id: employeeId, companyId },
        include: { company: true },
      }),
    ]);

    const requiredThreshold = company?.confidenceThreshold ?? 0.85;

    // 2. Module 5: Dynamic Confidence Threshold & UNKNOWN_PERSON Classification
    if (confidenceScore < requiredThreshold) {
      return res.status(200).json({
        success: true,
        classification: "UNKNOWN_PERSON",
        message: `Detection rejected: Confidence score (${confidenceScore}) is below required company threshold (${requiredThreshold})`,
      });
    }

    // 3. Module 5: Person Tracker (Short-lived 10s debounce across frames)
    const shouldTrack = shouldProcessPersonDetection(companyId, employeeId, 10);
    if (!shouldTrack) {
      return res.status(200).json({
        success: true,
        deduplicated: true,
        message: "Detection skipped: Person already tracked in active frame sequence",
      });
    }

    const currentPunchTime = punchTimestamp ? new Date(punchTimestamp) : new Date();
    const cooldownThreshold = new Date(currentPunchTime.getTime() - COOLDOWN_SECONDS * 1000);

    // 4. Check 60-Second Cooldown Debounce Window
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

    // 5. Active Employee Status Check (Deactivation Protection)
    if (!employee || employee.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Recognition blocked: Employee is inactive or non-existent in company scope",
      });
    }

    // 6. Deterministic Zone Resolution (Multi-Zone Mapping Handled)
    const cameraWithZones = await prisma.camera.findUnique({
      where: { id: cameraId },
      include: { cameraZones: { include: { zone: true } } },
    });
    const zoneType = resolveZonePriority(cameraWithZones?.cameraZones);

    // 7. Save Raw Attendance Log
    const rawLog = await prisma.attendanceRawLog.create({
      data: {
        companyId,
        employeeId,
        cameraId,
        punchTimestamp: currentPunchTime,
        confidenceScore,
        snapshotUrl: snapshotUrl || null,
        syncStatus: "PENDING",
      },
    });

    // 8. Trigger Shift Engine with real zoneType (Wired Here)
    const dailySummary = await processDailyAttendanceForPunch(
      companyId,
      employeeId,
      currentPunchTime,
      zoneType
    );

    // 9. Trigger Dynamic Stateful Presence Engine & AttendanceEvent Logger (Module 6 & 7)
    processPresenceAndZoneSessions({
      companyId,
      employeeId,
      cameraId,
      punchTimestamp: currentPunchTime,
      confidenceScore,
      snapshotUrl: snapshotUrl || null,
    }).catch((err) => console.error("Async Presence Engine Error:", err));

    // 10. Module 6/7: Create Outbound HRMS Sync Queue Task with Decrypted Company ID
    const plainHrmsCompanyId = decrypt(employee.company.hrmsCompanyId) || employee.company.hrmsCompanyId;
    const hrmsPayload = {
      hrmsCompanyId: plainHrmsCompanyId,
      hrmsEmployeeId: employee.hrmsEmployeeId,
      employeeCode: employee.employeeCode,
      punchDateTime: currentPunchTime.toISOString(),
      rawLogId: rawLog.id,
      cameraId: cameraId,
    };

    const queueItem = await prisma.hrmsSyncQueue.create({
      data: {
        companyId,
        rawLogId: rawLog.id,
        payload: hrmsPayload,
        status: "PENDING",
      },
    });

    return res.status(201).json({
      success: true,
      deduplicated: false,
      message: "Attendance punch recorded & enqueued for HRMS sync",
      data: {
        rawLog,
        dailySummary,
        zoneType,
        queueId: queueItem.id,
      },
    });
  } catch (error) {
    console.error("Ingest Error:", error);
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
      include: {
        camera: {
          include: { cameraZones: { include: { zone: true } } },
        },
      },
      orderBy: { punchTimestamp: "asc" },
    });

    const logsByEmployee = {};
    logs.forEach((log) => {
      if (!logsByEmployee[log.employeeId]) logsByEmployee[log.employeeId] = [];
      logsByEmployee[log.employeeId].push(log);
    });

    const results = [];
    for (const [employeeId, empLogs] of Object.entries(logsByEmployee)) {
      for (const log of empLogs) {
        const zoneType = resolveZonePriority(log.camera?.cameraZones);
        const summary = await processDailyAttendanceForPunch(
          companyId,
          employeeId,
          log.punchTimestamp,
          zoneType
        );
        if (summary) results.push(summary);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Recalculated attendance for ${Object.keys(logsByEmployee).length} employee(s)`,
      attendanceDate: startOfDay,
      data: results,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  ingestDetection,
  getAttendanceLogs,
  getDailySummary,
  getSyncQueue,
  triggerSyncWorker,
  recalculateDailyAttendance,
};