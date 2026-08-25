const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  getKpiSummary,
  getHourlyTrend,
  getDepartmentStats,
} = require("../controllers/analytics.controller");

router.get("/analytics/kpi-summary", verifyToken, getKpiSummary);
router.get("/analytics/hourly-trend", verifyToken, getHourlyTrend);
router.get("/analytics/department-stats", verifyToken, getDepartmentStats);

module.exports = router;