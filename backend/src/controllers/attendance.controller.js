const prisma = require("../config/prisma");
const { processDailyAttendanceForPunch } = require("../services/shiftEngineService");
const { sendPunchToHrms, processSyncQueueBatch } = require("../services/hrmsOutboundService");

const COOLDOWN_SECONDS = 60;

// POST /api/attendance/ingest
const ingestDetection = async (req, res) => {
  try {
    const { employeeId, cameraId, punchTimestamp, confidenceScore, snapshotUrl } = req.body;
    
    // Safely extract companyId from whatever property the middleware sets
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

    const currentPunchTime = punchTimestamp ? new Date(punchTimestamp) : new Date();
    const cooldownThreshold = new Date(currentPunchTime.getTime() - COOLDOWN_SECONDS * 1000);

    // 1. Check 60-Second Cooldown
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

    // 2. Fetch Employee with Company details
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      include: { company: true },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found in company scope",
      });
    }

    // 3. Save Raw Attendance Log
    const rawLog = await prisma.attendanceRawLog.create({
      data: {
        companyId,
        employeeId,
        cameraId,
        punchTimestamp: currentPunchTime,
        confidenceScore: confidenceScore || 0.0,
        snapshotUrl: snapshotUrl || null,
        syncStatus: "PENDING",
      },
    });

    // 4. Trigger Module 5 Shift Engine
    const dailySummary = await processDailyAttendanceForPunch(
      companyId,
      employeeId,
      currentPunchTime
    );

    // 5. Module 6: Create Outbound HRMS Sync Queue Task
    const hrmsPayload = {
      hrmsCompanyId: employee.company.hrmsCompanyId,
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

module.exports = {
  ingestDetection,
  getAttendanceLogs,
  getDailySummary,
  getSyncQueue,
  triggerSyncWorker,
};