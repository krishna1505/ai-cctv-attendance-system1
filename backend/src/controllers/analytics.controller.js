// const prisma = require("../config/prisma");

// // Safe companyId helper
// const getCompanyId = (req) => req.companyId || req.user?.companyId || req.admin?.companyId;

// // GET /api/analytics/kpi-summary
// const getKpiSummary = async (req, res) => {
//   try {
//     const companyId = getCompanyId(req);
//     if (!companyId) {
//       return res.status(401).json({ success: false, message: "Unauthorized company access" });
//     }

//     const today = new Date();
//     const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

//     const totalEmployees = await prisma.employee.count({
//       where: { companyId, status: "ACTIVE" },
//     });

//     const dailyRecords = await prisma.dailyAttendance.findMany({
//       where: { companyId, attendanceDate: startOfToday },
//     });

//     let presentCount = 0;
//     let lateCount = 0;
//     let halfDayCount = 0;

//     dailyRecords.forEach((rec) => {
//       if (rec.status === "PRESENT") presentCount++;
//       else if (rec.status === "LATE") {
//         presentCount++;
//         lateCount++;
//       } else if (rec.status === "HALF_DAY") {
//         halfDayCount++;
//       }
//     });

//     const totalMarked = dailyRecords.length;
//     const absentCount = Math.max(0, totalEmployees - totalMarked);
//     const attendancePercentage =
//       totalEmployees > 0 ? ((totalMarked / totalEmployees) * 100).toFixed(1) : 0;

//     const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
//     const cameras = await prisma.camera.findMany({
//       where: { companyId },
//     });

//     let activeCameras = 0;
//     let offlineCameras = 0;

//     cameras.forEach((cam) => {
//       if (cam.status === "ACTIVE" && cam.lastPingAt && cam.lastPingAt >= fiveMinutesAgo) {
//         activeCameras++;
//       } else {
//         offlineCameras++;
//       }
//     });

//     const pendingSyncCount = await prisma.hrmsSyncQueue.count({
//       where: { companyId, status: "PENDING" },
//     });

//     return res.status(200).json({
//       success: true,
//       data: {
//         date: startOfToday.toISOString().split("T")[0],
//         employees: {
//           total: totalEmployees,
//           present: presentCount,
//           late: lateCount,
//           halfDay: halfDayCount,
//           absent: absentCount,
//           attendanceRate: `${attendancePercentage}%`,
//         },
//         cameras: {
//           total: cameras.length,
//           active: activeCameras,
//           offline: offlineCameras,
//         },
//         syncQueue: {
//           pending: pendingSyncCount,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("KPI Summary Error:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // GET /api/analytics/hourly-trend
// const getHourlyTrend = async (req, res) => {
//   try {
//     const companyId = getCompanyId(req);
//     const today = new Date();
//     const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
//     const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

//     const logs = await prisma.attendanceRawLog.findMany({
//       where: {
//         companyId,
//         punchTimestamp: { gte: startOfToday, lte: endOfToday },
//       },
//       select: { punchTimestamp: true },
//     });

//     const hourlyCounts = Array(24).fill(0);
//     logs.forEach((log) => {
//       const hour = new Date(log.punchTimestamp).getUTCHours();
//       hourlyCounts[hour]++;
//     });

//     const formattedTrend = hourlyCounts.map((count, hour) => ({
//       hour: `${hour.toString().padStart(2, "0")}:00`,
//       punches: count,
//     }));

//     return res.status(200).json({
//       success: true,
//       data: formattedTrend,
//     });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // GET /api/analytics/department-stats
// const getDepartmentStats = async (req, res) => {
//   try {
//     const companyId = getCompanyId(req);
//     const today = new Date();
//     const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

//     const departments = await prisma.department.findMany({
//       where: { companyId },
//       include: {
//         employees: {
//           where: { status: "ACTIVE" },
//           include: {
//             dailyAttendance: {
//               where: { attendanceDate: startOfToday },
//             },
//           },
//         },
//       },
//     });

//     const stats = departments.map((dept) => {
//       const totalEmp = dept.employees.length;
//       const presentEmp = dept.employees.filter((e) => e.dailyAttendance.length > 0).length;
//       return {
//         departmentId: dept.id,
//         departmentName: dept.name,
//         totalEmployees: totalEmp,
//         presentCount: presentEmp,
//         absentCount: totalEmp - presentEmp,
//         attendanceRate: totalEmp > 0 ? `${((presentEmp / totalEmp) * 100).toFixed(0)}%` : "0%",
//       };
//     });

//     return res.status(200).json({
//       success: true,
//       data: stats,
//     });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // GET /api/analytics/company
// const getCompanyDashboardAnalytics = async (req, res) => {
//   try {
//     const companyId = getCompanyId(req);
//     if (!companyId) {
//       return res.status(401).json({ success: false, message: "Unauthorized company scope" });
//     }

//     const today = new Date();
//     const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

//     const [totalEmployees, dailyRecords, activeCameras, analyticsAgg] = await Promise.all([
//       prisma.employee.count({ where: { companyId, status: "ACTIVE" } }),
//       prisma.dailyAttendance.findMany({
//         where: { companyId, attendanceDate: startOfToday },
//       }),
//       prisma.camera.count({ where: { companyId, status: "ACTIVE" } }),
//       prisma.employeeDailyAnalytics.findMany({
//         where: { companyId, date: startOfToday },
//       }),
//     ]);

//     let presentCount = 0;
//     let lateCount = 0;
//     let halfDayCount = 0;
//     let currentlyInside = 0;
//     let checkedOut = 0;

//     dailyRecords.forEach((r) => {
//       if (r.status === "PRESENT" || r.status === "LATE") presentCount++;
//       if (r.status === "LATE") lateCount++;
//       if (r.status === "HALF_DAY") halfDayCount++;

//       if (r.lastOut && r.firstIn && r.lastOut > r.firstIn) {
//         checkedOut++;
//       } else if (r.firstIn) {
//         currentlyInside++;
//       }
//     });

//     const absentCount = Math.max(0, totalEmployees - presentCount);

//     let totalPresenceMin = 0;
//     let totalDeskMin = 0;
//     let totalBreakMin = 0;
//     let totalMeetingMin = 0;

//     analyticsAgg.forEach((a) => {
//       totalPresenceMin += a.officePresenceMin || 0;
//       totalDeskMin += a.deskPresenceMin || 0;
//       totalBreakMin += a.breakMin || 0;
//       totalMeetingMin += a.meetingMin || 0;
//     });

//     const count = analyticsAgg.length || 1;

//     return res.status(200).json({
//       success: true,
//       data: {
//         totalEmployees,
//         presentCount,
//         absentCount,
//         lateCount,
//         halfDayCount,
//         currentlyInside,
//         checkedOut,
//         activeCameras,
//         averages: {
//           avgPresenceHours: (totalPresenceMin / count / 60).toFixed(1),
//           avgDeskHours: (totalDeskMin / count / 60).toFixed(1),
//           avgBreakMinutes: Math.round(totalBreakMin / count),
//           avgMeetingMinutes: Math.round(totalMeetingMin / count),
//         },
//         disclaimer:
//           "Camera-based desk presence measures area visibility only and does not reflect work productivity.",
//       },
//     });
//   } catch (error) {
//     console.error("Company Dashboard Analytics Error:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // GET /api/analytics/employees/:id
// const getEmployeeDrilldown = async (req, res) => {
//   try {
//     const companyId = getCompanyId(req);
//     const { id } = req.params;

//     const employee = await prisma.employee.findFirst({
//       where: { id, companyId },
//       include: {
//         department: { select: { name: true } },
//         shiftSnapshot: true,
//       },
//     });

//     if (!employee) {
//       return res.status(404).json({ success: false, message: "Employee not found" });
//     }

//     const dailyTimeline = await prisma.dailyAttendance.findMany({
//       where: { companyId, employeeId: id },
//       orderBy: { attendanceDate: "desc" },
//       take: 30,
//     });

//     const recentPunches = await prisma.attendanceRawLog.findMany({
//       where: { companyId, employeeId: id },
//       include: {
//         camera: { select: { name: true, location: true } },
//       },
//       orderBy: { punchTimestamp: "desc" },
//       take: 20,
//     });

//     let totalWorkMinutes = 0;
//     let totalPresent = 0;
//     let totalLate = 0;
//     let totalHalfDay = 0;

//     dailyTimeline.forEach((rec) => {
//       totalWorkMinutes += rec.totalWorkMinutes || 0;
//       if (rec.status === "PRESENT" || rec.status === "LATE") totalPresent++;
//       if (rec.status === "LATE") totalLate++;
//       if (rec.status === "HALF_DAY") totalHalfDay++;
//     });

//     const recordsCount = dailyTimeline.length;
//     const avgDailyMinutes = recordsCount > 0 ? Math.round(totalWorkMinutes / recordsCount) : 0;

//     return res.status(200).json({
//       success: true,
//       data: {
//         employee: {
//           id: employee.id,
//           name: employee.name,
//           employeeCode: employee.employeeCode,
//           designation: employee.designation,
//           department: employee.department?.name || "General",
//           shift: employee.shiftSnapshot,
//         },
//         summary: {
//           recordsCount,
//           totalPresent,
//           totalLate,
//           totalHalfDay,
//           totalHoursWorked: (totalWorkMinutes / 60).toFixed(1),
//           avgDailyHours: (avgDailyMinutes / 60).toFixed(1),
//         },
//         dailyTimeline,
//         recentPunches,
//       },
//     });
//   } catch (error) {
//     console.error("Employee Drilldown Error:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // GET /api/analytics/departments/:id
// const getDepartmentDrilldown = async (req, res) => {
//   try {
//     const companyId = getCompanyId(req);
//     const { id } = req.params;

//     const department = await prisma.department.findFirst({
//       where: { id, companyId },
//     });

//     if (!department) {
//       return res.status(404).json({ success: false, message: "Department not found" });
//     }

//     const today = new Date();
//     const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

//     const employees = await prisma.employee.findMany({
//       where: { companyId, departmentId: id, status: "ACTIVE" },
//       include: {
//         dailyAttendance: {
//           where: { attendanceDate: startOfToday },
//         },
//       },
//     });

//     let presentCount = 0;
//     const roster = employees.map((emp) => {
//       const todayRecord = emp.dailyAttendance[0];
//       const isPresent = Boolean(todayRecord && (todayRecord.status === "PRESENT" || todayRecord.status === "LATE"));
//       if (isPresent) presentCount++;

//       return {
//         id: emp.id,
//         name: emp.name,
//         employeeCode: emp.employeeCode,
//         designation: emp.designation,
//         attendanceStatus: todayRecord ? todayRecord.status : "ABSENT",
//         firstIn: todayRecord?.firstIn || null,
//         lastOut: todayRecord?.lastOut || null,
//         totalWorkMinutes: todayRecord?.totalWorkMinutes || 0,
//       };
//     });

//     const totalEmployees = employees.length;
//     const absentCount = Math.max(0, totalEmployees - presentCount);
//     const attendanceRate = totalEmployees > 0 ? `${((presentCount / totalEmployees) * 100).toFixed(1)}%` : "0.0%";

//     return res.status(200).json({
//       success: true,
//       data: {
//         departmentId: department.id,
//         departmentName: department.name,
//         totalEmployees,
//         presentCount,
//         absentCount,
//         attendanceRate,
//         roster,
//       },
//     });
//   } catch (error) {
//     console.error("Department Drilldown Error:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// module.exports = {
//   getKpiSummary,
//   getHourlyTrend,
//   getDepartmentStats,
//   getCompanyDashboardAnalytics,
//   getEmployeeDrilldown,
//   getDepartmentDrilldown,
// };
const prisma = require("../config/prisma");

const getCompanyId = (req) => req.companyId || req.user?.companyId || req.admin?.companyId;

// GET /api/analytics/kpi-summary
const getKpiSummary = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company access" });
    }

    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    const totalEmployees = await prisma.employee.count({
      where: { companyId, status: "ACTIVE" },
    });

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
    const companyId = getCompanyId(req);
    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

    const logs = await prisma.attendanceRawLog.findMany({
      where: {
        companyId,
        punchTimestamp: { gte: startOfToday, lte: endOfToday },
      },
      select: { punchTimestamp: true },
    });

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
    const companyId = getCompanyId(req);
    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

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

// GET /api/analytics/company
const getCompanyDashboardAnalytics = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    const { date } = req.query;

    let targetDate;
    if (date) {
      targetDate = new Date(`${date}T00:00:00.000Z`);
      if (isNaN(targetDate.getTime())) {
        const today = new Date();
        targetDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      }
    } else {
      const today = new Date();
      targetDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    }

    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [totalEmployees, dailyRecords, activeCameras, analyticsAgg, weekRecords] = await Promise.all([
      prisma.employee.count({ where: { companyId, status: "ACTIVE" } }),
      prisma.dailyAttendance.findMany({
        where: { companyId, attendanceDate: targetDate },
      }),
      prisma.camera.count({ where: { companyId, status: "ACTIVE" } }),
      prisma.employeeDailyAnalytics.findMany({
        where: { companyId, date: targetDate },
      }),
      prisma.dailyAttendance.findMany({
        where: { 
          companyId, 
          attendanceDate: { gte: sevenDaysAgo, lte: targetDate } 
        },
        select: { attendanceDate: true, status: true }
      })
    ]);

    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let currentlyInside = 0;
    let checkedOut = 0;

    dailyRecords.forEach((r) => {
      if (r.status === "PRESENT" || r.status === "LATE") presentCount++;
      if (r.status === "LATE") lateCount++;
      if (r.status === "HALF_DAY") halfDayCount++;

      if (r.lastOut && r.firstIn && r.lastOut > r.firstIn) {
        checkedOut++;
      } else if (r.firstIn) {
        currentlyInside++;
      }
    });

    const absentCount = Math.max(0, totalEmployees - presentCount);

    let totalPresenceMin = 0;
    let totalDeskMin = 0;
    let totalBreakMin = 0;
    let totalMeetingMin = 0;

    analyticsAgg.forEach((a) => {
      totalPresenceMin += a.officePresenceMin || 0;
      totalDeskMin += a.deskPresenceMin || 0;
      totalBreakMin += a.breakMin || 0;
      totalMeetingMin += a.meetingMin || 0;
    });

    const count = analyticsAgg.length || 1;

    // Calculate 7-day trend
    const trendMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dayLabel = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
      trendMap[d.toISOString().split('T')[0]] = { day: dayLabel, present: 0, late: 0, absent: 0 };
    }

    weekRecords.forEach(r => {
      const dateKey = r.attendanceDate.toISOString().split('T')[0];
      if (trendMap[dateKey]) {
        if (r.status === "PRESENT") trendMap[dateKey].present++;
        if (r.status === "LATE") {
           trendMap[dateKey].present++; 
           trendMap[dateKey].late++;
        }
      }
    });

    Object.values(trendMap).forEach(day => {
       day.absent = Math.max(0, totalEmployees - day.present);
    });

    const attendanceTrend = Object.values(trendMap);

    return res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        presentCount,
        absentCount,
        lateCount,
        halfDayCount,
        currentlyInside,
        checkedOut,
        activeCameras,
        attendanceTrend,
        averages: {
          avgPresenceHours: (totalPresenceMin / count / 60).toFixed(1),
          avgDeskHours: (totalDeskMin / count / 60).toFixed(1),
          avgBreakMinutes: Math.round(totalBreakMin / count),
          avgMeetingMinutes: Math.round(totalMeetingMin / count),
        },
        disclaimer:
          "Camera-based desk presence measures area visibility only and does not reflect work productivity.",
      },
    });
  } catch (error) {
    console.error("Company Dashboard Analytics Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/analytics/employees/:id
const getEmployeeAnalytics = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    const employee = await prisma.employee.findFirst({
      where: { id, companyId },
      include: {
        department: { select: { id: true, name: true } },
        shiftSnapshot: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const whereClause = { companyId, employeeId: id };
    if (startDate && endDate) {
      whereClause.attendanceDate = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    const dailyRecords = await prisma.dailyAttendance.findMany({
      where: whereClause,
      orderBy: { attendanceDate: "desc" },
      take: 30,
    });

    let totalPresent = 0;
    let totalLate = 0;
    let totalHalfDay = 0;
    let totalWorkMinutes = 0;

    dailyRecords.forEach((rec) => {
      if (rec.status === "PRESENT") totalPresent++;
      else if (rec.status === "LATE") {
        totalPresent++;
        totalLate++;
      } else if (rec.status === "HALF_DAY") {
        totalHalfDay++;
      }
      totalWorkMinutes += rec.totalWorkMinutes || 0;
    });

    const recentLogs = await prisma.attendanceRawLog.findMany({
      where: { companyId, employeeId: id },
      include: {
        camera: { select: { name: true, location: true } },
      },
      orderBy: { punchTimestamp: "desc" },
      take: 10,
    });

    return res.status(200).json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          name: employee.name,
          employeeCode: employee.employeeCode,
          designation: employee.designation,
          department: employee.department?.name || "General",
          shift: employee.shiftSnapshot || null,
        },
        summary: {
          recordsCount: dailyRecords.length,
          totalPresent,
          totalLate,
          totalHalfDay,
          totalHoursWorked: (totalWorkMinutes / 60).toFixed(1),
          avgDailyHours:
            dailyRecords.length > 0
              ? (totalWorkMinutes / dailyRecords.length / 60).toFixed(1)
              : 0,
        },
        dailyTimeline: dailyRecords,
        recentPunches: recentLogs,
      },
    });
  } catch (error) {
    console.error("Employee Analytics Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/analytics/departments/:id
const getDepartmentAnalytics = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    const department = await prisma.department.findFirst({
      where: { id, companyId },
      include: {
        employees: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            name: true,
            employeeCode: true,
            designation: true,
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    const employeeIds = department.employees.map((e) => e.id);
    const todayAttendances = await prisma.dailyAttendance.findMany({
      where: {
        companyId,
        attendanceDate: startOfToday,
        employeeId: { in: employeeIds },
      },
    });

    const attendanceMap = new Map();
    todayAttendances.forEach((a) => attendanceMap.set(a.employeeId, a));

    const roster = department.employees.map((emp) => {
      const att = attendanceMap.get(emp.id);
      return {
        ...emp,
        attendanceStatus: att ? att.status : "ABSENT",
        firstIn: att ? att.firstIn : null,
        lastOut: att ? att.lastOut : null,
        totalWorkMinutes: att ? att.totalWorkMinutes : 0,
      };
    });

    const presentCount = todayAttendances.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE"
    ).length;
    const totalStaff = department.employees.length;

    return res.status(200).json({
      success: true,
      data: {
        departmentId: department.id,
        departmentName: department.name,
        totalEmployees: totalStaff,
        presentCount,
        absentCount: Math.max(0, totalStaff - presentCount),
        attendanceRate: totalStaff > 0 ? `${((presentCount / totalStaff) * 100).toFixed(1)}%` : "0%",
        roster,
      },
    });
  } catch (error) {
    console.error("Department Analytics Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/analytics/employees/:id/timeline (Module 8 Spec - Merged Full-Day Timeline)
const getEmployeeFullTimeline = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const [employee, punches, events, zoneSessions, breaks, meetings] = await Promise.all([
      prisma.employee.findFirst({
        where: { id, companyId },
        include: { department: true, shiftSnapshot: true },
      }),
      prisma.attendanceRawLog.findMany({
        where: { employeeId: id, companyId, punchTimestamp: { gte: startOfDay, lte: endOfDay } },
        include: { camera: true },
        orderBy: { punchTimestamp: "asc" },
      }),
      prisma.attendanceEvent.findMany({
        where: { employeeId: id, companyId, eventTimestamp: { gte: startOfDay, lte: endOfDay } },
        include: { camera: true, zone: true },
        orderBy: { eventTimestamp: "asc" },
      }),
      prisma.zoneSession.findMany({
        where: { employeeId: id, entryTime: { gte: startOfDay, lte: endOfDay } },
        include: { zone: true },
      }),
      prisma.breakSession.findMany({
        where: { employeeId: id, startTime: { gte: startOfDay, lte: endOfDay } },
        include: { zone: true },
      }),
      prisma.meetingSession.findMany({
        where: { employeeId: id, startTime: { gte: startOfDay, lte: endOfDay } },
        include: { zone: true },
      }),
    ]);

    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

    // Merged Chronological Array
    const timeline = [];

    // NOTE: raw punches are kept separately from AttendanceEvent records so both
    // legacy raw-log data and the new structured event stream show up on the timeline.
    punches.forEach((p) => {
      timeline.push({
        type: "CAMERA_DETECTION",
        timestamp: p.punchTimestamp,
        location: p.camera?.location || p.camera?.name || "CCTV Camera",
        confidence: p.confidenceScore,
        snapshotUrl: p.snapshotUrl,
      });
    });

    events.forEach((ev) => {
      timeline.push({
        type: "ATTENDANCE_EVENT",
        eventType: ev.eventType,
        timestamp: ev.eventTimestamp,
        location: ev.camera?.location || ev.camera?.name || "CCTV Camera",
        zone: ev.zone?.name || "General Area",
        confidence: ev.confidenceScore,
        snapshotUrl: ev.snapshotUrl,
      });
    });

    zoneSessions.forEach((zs) => {
      timeline.push({
        type: "ZONE_STAY",
        zone: zs.zone?.name || "General Area",
        entryTime: zs.entryTime,
        exitTime: zs.exitTime,
        durationMinutes: zs.durationMin,
        timestamp: zs.entryTime,
      });
    });

    breaks.forEach((b) => {
      timeline.push({
        type: "BREAK_ACTIVITY",
        zone: b.zone?.name || "Break Room",
        startTime: b.startTime,
        endTime: b.endTime,
        durationMinutes: b.durationMin,
        timestamp: b.startTime,
      });
    });

    meetings.forEach((m) => {
      timeline.push({
        type: "MEETING_ACTIVITY",
        zone: m.zone?.name || "Conference Room",
        startTime: m.startTime,
        endTime: m.endTime,
        durationMinutes: m.durationMin,
        timestamp: m.startTime,
      });
    });

    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return res.status(200).json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          name: employee.name,
          employeeCode: employee.employeeCode,
          department: employee.department?.name || "General",
        },
        date: startOfDay.toISOString().split("T")[0],
        totalEvents: timeline.length,
        timeline,
      },
    });
  } catch (error) {
    console.error("Timeline Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getKpiSummary,
  getHourlyTrend,
  getDepartmentStats,
  getCompanyDashboardAnalytics,
  getEmployeeAnalytics,
  getDepartmentAnalytics,
  getEmployeeFullTimeline,
};