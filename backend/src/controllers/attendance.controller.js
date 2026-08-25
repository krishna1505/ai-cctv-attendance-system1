const prisma = require("../config/prisma");
const { evaluateShiftStatus } = require("../utils/shiftEngine");

// POST /api/attendance/ingest
const ingestDetection = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { employeeId, cameraId, confidenceScore, snapshotUrl, timestamp } = req.body;

    if (!employeeId || !cameraId) {
      return res.status(400).json({
        success: false,
        message: "employeeId and cameraId are required",
      });
    }

    // 1. Verify Employee & Camera belong to tenant
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      include: { shiftSnapshot: true },
    });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found in this company" });
    }

    const camera = await prisma.camera.findFirst({
      where: { id: cameraId, companyId },
    });
    if (!camera) {
      return res.status(404).json({ success: false, message: "Camera not found in this company" });
    }

    const punchTime = timestamp ? new Date(timestamp) : new Date();

    // 2. 60-second cooldown de-duplication
    const cooldownWindow = new Date(punchTime.getTime() - 60 * 1000);
    const recentPunch = await prisma.attendanceRawLog.findFirst({
      where: {
        companyId,
        employeeId,
        punchTimestamp: { gte: cooldownWindow },
      },
    });

    if (recentPunch) {
      return res.status(200).json({
        success: true,
        message: "Punch ignored: duplicate detection within 60s cooldown window",
        deduplicated: true,
        existingLogId: recentPunch.id,
      });
    }

    // 3. Save Raw Log
    const rawLog = await prisma.attendanceRawLog.create({
      data: {
        companyId,
        employeeId,
        cameraId,
        punchTimestamp: punchTime,
        confidenceScore: confidenceScore !== undefined ? parseFloat(confidenceScore) : 0.95,
        snapshotUrl: snapshotUrl || null,
        syncStatus: "PENDING",
      },
      include: {
        employee: { select: { name: true, employeeCode: true, designation: true } },
        camera: { select: { name: true, location: true } },
      },
    });

    // 4. Module 5 Shift Engine: Update DailyAttendance Record
    const attendanceDate = new Date(punchTime);
    attendanceDate.setHours(0, 0, 0, 0);

    const existingDaily = await prisma.dailyAttendance.findUnique({
      where: {
        companyId_employeeId_attendanceDate: {
          companyId,
          employeeId,
          attendanceDate,
        },
      },
    });

    let firstIn = existingDaily?.firstIn || punchTime;
    let lastOut = existingDaily ? punchTime : null;

    if (existingDaily && punchTime < existingDaily.firstIn) {
      firstIn = punchTime;
    }

    const evaluation = evaluateShiftStatus(firstIn, lastOut, employee.shiftSnapshot);

    const dailyRecord = await prisma.dailyAttendance.upsert({
      where: {
        companyId_employeeId_attendanceDate: {
          companyId,
          employeeId,
          attendanceDate,
        },
      },
      update: {
        firstIn,
        lastOut,
        totalWorkMinutes: evaluation.totalWorkMinutes,
        status: evaluation.status,
        lateByMinutes: evaluation.lateByMinutes,
      },
      create: {
        companyId,
        employeeId,
        attendanceDate,
        firstIn,
        lastOut,
        totalWorkMinutes: evaluation.totalWorkMinutes,
        status: evaluation.status,
        lateByMinutes: evaluation.lateByMinutes,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Attendance punch logged and shift processed successfully",
      deduplicated: false,
      data: {
        rawLog,
        dailyAttendance: dailyRecord,
      },
    });
  } catch (error) {
    console.error("Ingest detection error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/attendance/logs
const getAttendanceLogs = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { employeeId, date, limit = 50 } = req.query;

    let filter = { companyId };
    if (employeeId) filter.employeeId = employeeId;

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.punchTimestamp = { gte: startOfDay, lte: endOfDay };
    }

    const logs = await prisma.attendanceRawLog.findMany({
      where: filter,
      include: {
        employee: { select: { name: true, employeeCode: true, designation: true } },
        camera: { select: { name: true, location: true } },
      },
      orderBy: { punchTimestamp: "desc" },
      take: Number(limit),
    });

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error("Get attendance logs error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/attendance/daily-summary
const getDailySummary = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const summaries = await prisma.dailyAttendance.findMany({
      where: {
        companyId,
        attendanceDate: targetDate,
      },
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
      orderBy: { firstIn: "asc" },
    });

    return res.status(200).json({
      success: true,
      count: summaries.length,
      attendanceDate: targetDate,
      data: summaries,
    });
  } catch (error) {
    console.error("Get daily summary error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  ingestDetection,
  getAttendanceLogs,
  getDailySummary,
};