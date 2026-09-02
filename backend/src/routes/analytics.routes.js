const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  getKpiSummary,
  getHourlyTrend,
  getDepartmentStats,
  getCompanyDashboardAnalytics,
  getEmployeeAnalytics,
  getDepartmentAnalytics,
  getEmployeeFullTimeline,
} = require("../controllers/analytics.controller");

// Base path already "/api/analytics" hai app.js me
router.get("/kpi-summary", verifyToken, getKpiSummary);
router.get("/hourly-trend", verifyToken, getHourlyTrend);
router.get("/department-stats", verifyToken, getDepartmentStats);
router.get("/company", verifyToken, getCompanyDashboardAnalytics);
router.get("/employees/:id", verifyToken, getEmployeeAnalytics);
router.get("/employees/:id/timeline", verifyToken, getEmployeeFullTimeline);
router.get("/departments/:id", verifyToken, getDepartmentAnalytics);

module.exports = router;