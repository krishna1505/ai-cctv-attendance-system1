const prisma = require("../config/prisma");

// GET /api/analytics/kpi-summary
const getKpiSummary = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company access" });
    }

    const today = new Date();
    const startOfToday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );

    // 1. Total Active Employees in Company
    const totalEmployees = await prisma.employee.count({
      where: { companyId, status: "ACTIVE" },
    });

    // 2. Today's Attendance Aggregations
    const dailyRecords = await prisma.dailyAttendance.findMany({
      where: { companyId, attendanceDate: startOfToday },
    });

    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;

    dailyRecords.forEach((rec) => {
      if (rec.status === "PRESENT") presentCount++;
      else if (rec.status === "LATE") {
        presentCount++;
        lateCount++;
      } else if (rec.status === "HALF_DAY") {
        halfDayCount++;
      }
    });

    const totalMarked = dailyRecords.length;
    const absentCount = Math.max(0, totalEmployees - totalMarked);
    const attendancePercentage =
      totalEmployees > 0 ? ((totalMarked / totalEmployees) * 100).toFixed(1) : 0;

    // 3. Camera Health Metrics (Offline if no ping within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const cameras = await prisma.camera.findMany({
      where: { companyId },
    });

    let activeCameras = 0;
    let offlineCameras = 0;

    cameras.forEach((cam) => {
      if (cam.status === "ACTIVE" && cam.lastPingAt && cam.lastPingAt >= fiveMinutesAgo) {
        activeCameras++;
      } else {
        offlineCameras++;
      }
    });

    // 4. Pending Outbound HRMS Sync Queue Count
    const pendingSyncCount = await prisma.hrmsSyncQueue.count({
      where: { companyId, status: "PENDING" },
    });

    return res.status(200).json({
      success: true,
      data: {
        date: startOfToday.toISOString().split("T")[0],
        employees: {
          total: totalEmployees,
          present: presentCount,
          late: lateCount,
          halfDay: halfDayCount,
          absent: absentCount,
          attendanceRate: `${attendancePercentage}%`,
        },
        cameras: {
          total: cameras.length,
          active: activeCameras,
          offline: offlineCameras,
        },
        syncQueue: {
          pending: pendingSyncCount,
        },
      },
    });
  } catch (error) {
    console.error("KPI Summary Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/analytics/hourly-trend
const getHourlyTrend = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;
    const today = new Date();
    const startOfToday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

    const logs = await prisma.attendanceRawLog.findMany({
      where: {
        companyId,
        punchTimestamp: { gte: startOfToday, lte: endOfToday },
      },
      select: { punchTimestamp: true },
    });

    // Bucket counts by hour (0 to 23)
    const hourlyCounts = Array(24).fill(0);
    logs.forEach((log) => {
      const hour = new Date(log.punchTimestamp).getUTCHours();
      hourlyCounts[hour]++;
    });

    const formattedTrend = hourlyCounts.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, "0")}:00`,
      punches: count,
    }));

    return res.status(200).json({
      success: true,
      data: formattedTrend,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/analytics/department-stats
const getDepartmentStats = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;
    const today = new Date();
    const startOfToday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );

    const departments = await prisma.department.findMany({
      where: { companyId },
      include: {
        employees: {
          where: { status: "ACTIVE" },
          include: {
            dailyAttendance: {
              where: { attendanceDate: startOfToday },
            },
          },
        },
      },
    });

    const stats = departments.map((dept) => {
      const totalEmp = dept.employees.length;
      const presentEmp = dept.employees.filter((e) => e.dailyAttendance.length > 0).length;
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        totalEmployees: totalEmp,
        presentCount: presentEmp,
        absentCount: totalEmp - presentEmp,
        attendanceRate: totalEmp > 0 ? `${((presentEmp / totalEmp) * 100).toFixed(0)}%` : "0%",
      };
    });

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getKpiSummary,
  getHourlyTrend,
  getDepartmentStats,
};