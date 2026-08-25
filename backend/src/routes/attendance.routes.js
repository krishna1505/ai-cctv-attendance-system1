const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  ingestDetection,
  getAttendanceLogs,
  getDailySummary,
} = require("../controllers/attendance.controller");

router.post("/attendance/ingest", verifyToken, ingestDetection);
router.get("/attendance/logs", verifyToken, getAttendanceLogs);
router.get("/attendance/daily-summary", verifyToken, getDailySummary); // <-- Module 5 Endpoint

module.exports = router;