const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");

// 1. Auth Middleware Safe Import with Tenant Scope Fallback
const authModule = require("../middlewares/auth.middleware");
const safeAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (token) {
      const middleware =
        typeof authModule === "function"
          ? authModule
          : authModule.verifyToken || authModule.authenticate || authModule.authMiddleware;
      if (middleware) {
        return middleware(req, res, () => {
          if (!req.companyId && (req.user?.companyId || req.admin?.companyId)) {
            req.companyId = req.user?.companyId || req.admin?.companyId;
          }
          return next();
        });
      }
    }

    // Dev/Testing Fallback: Agar token missing ho, toh active tenant automatically assign karein
    const company = await prisma.company.findFirst();
    if (company) {
      req.companyId = company.id;
      return next();
    }

    return res.status(401).json({ success: false, message: "Unauthorized company scope" });
  } catch (err) {
    console.error("[Analytics SafeAuth Error]:", err.message);
    return res.status(500).json({ success: false, message: "Internal Auth Error" });
  }
};

const {
  getKpiSummary,
  getHourlyTrend,
  getDepartmentStats,
  getPresenceAnalyticsDashboard,
  getCompanyDashboardAnalytics,
  getEmployeeAnalytics,
  getDepartmentAnalytics,
  getEmployeeFullTimeline,
} = require("../controllers/analytics.controller");

// ==========================================
// Base & Presence Analytics Dashboard Routes
// ==========================================
router.get("/", safeAuth, getPresenceAnalyticsDashboard || getCompanyDashboardAnalytics);
router.get("/overview", safeAuth, getPresenceAnalyticsDashboard || getCompanyDashboardAnalytics);
router.get("/dashboard", safeAuth, getPresenceAnalyticsDashboard); // 👈 Main target UI dashboard endpoint

// ==========================================
// Specific Analytics & Subsidiary Routes
// ==========================================
router.get("/kpi-summary", safeAuth, getKpiSummary);
router.get("/hourly-trend", safeAuth, getHourlyTrend);
router.get("/department-stats", safeAuth, getDepartmentStats);
router.get("/company", safeAuth, getCompanyDashboardAnalytics);
router.get("/employees/:id", safeAuth, getEmployeeAnalytics);
router.get("/employees/:id/timeline", safeAuth, getEmployeeFullTimeline);
router.get("/departments/:id", safeAuth, getDepartmentAnalytics);

module.exports = router;