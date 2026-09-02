const prisma = require("../config/prisma");
const {
  syncEmployeesFromStaffPie,
  syncFaceEnrollmentsFromStaffPie,
  syncShiftsFromStaffPie,
  checkStaffPieHealth,
} = require("../services/staffpieIntegrationService");

/**
 * 1. Health check & latency for StaffPie HRMS
 * GET /api/hrms/health
 */
const getHrmsHealth = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized tenant" });
    }

    const health = await checkStaffPieHealth(companyId);
    return res.status(200).json({ success: true, data: health });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Trigger Full/Partial Sync from StaffPie HRMS
 * POST /api/hrms/sync
 */
const triggerHrmsSync = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;
    const authHeader = req.headers.authorization;
    const jwtToken = authHeader ? authHeader.replace("Bearer ", "") : null;
    const { type = "ALL" } = req.body || {};

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized tenant" });
    }

    const syncResults = {};

    if (type === "ALL" || type === "EMPLOYEES") {
      syncResults.employees = await syncEmployeesFromStaffPie(companyId, jwtToken);
    }
    if (type === "ALL" || type === "SHIFTS") {
      syncResults.shifts = await syncShiftsFromStaffPie(companyId, jwtToken);
    }
    if (type === "ALL" || type === "FACES") {
      syncResults.faces = await syncFaceEnrollmentsFromStaffPie(companyId, jwtToken);
    }

    return res.status(200).json({
      success: true,
      message: `StaffPie HRMS sync (${type}) completed successfully`,
      data: syncResults,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to sync with StaffPie HRMS",
    });
  }
};

/**
 * 3. Fetch Sync History Logs
 * GET /api/hrms/sync-logs
 */
const getSyncLogs = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [total, logs] = await Promise.all([
      prisma.syncLog.count({ where: { companyId } }),
      prisma.syncLog.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getHrmsHealth,
  triggerHrmsSync,
  getSyncLogs,
};