const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  ingestDetection,
  getAttendanceLogs,
  getDailySummary,
  getSyncQueue,
  triggerSyncWorker,
  recalculateDailyAttendance,
} = require("../controllers/attendance.controller");

// Base path already "/api/attendance" hai app.js me
router.get("/", verifyToken, getAttendanceLogs); // <-- Yeh line zaroori hai (Frontend /api/attendance hit karta hai)
router.get("/logs", verifyToken, getAttendanceLogs);
router.get("/daily-summary", verifyToken, getDailySummary);
router.post("/ingest", verifyToken, ingestDetection);
router.get("/sync-queue", verifyToken, getSyncQueue);
router.post("/sync-retry", verifyToken, triggerSyncWorker);
router.post("/recalculate-daily", verifyToken, recalculateDailyAttendance);

module.exports = router;