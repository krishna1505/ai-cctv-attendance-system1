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

router.get("/analytics/kpi-summary", verifyToken, getKpiSummary);
router.get("/analytics/hourly-trend", verifyToken, getHourlyTrend);
router.get("/analytics/department-stats", verifyToken, getDepartmentStats);
router.get("/analytics/company", verifyToken, getCompanyDashboardAnalytics);
router.get("/analytics/employees/:id", verifyToken, getEmployeeAnalytics);
router.get("/analytics/employees/:id/timeline", verifyToken, getEmployeeFullTimeline);
router.get("/analytics/departments/:id", verifyToken, getDepartmentAnalytics);

module.exports = router;