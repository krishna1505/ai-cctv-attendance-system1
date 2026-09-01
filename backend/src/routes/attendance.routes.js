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

router.post("/attendance/ingest", verifyToken, ingestDetection);
router.get("/attendance/logs", verifyToken, getAttendanceLogs);
router.get("/attendance/daily-summary", verifyToken, getDailySummary);
router.get("/attendance/sync-queue", verifyToken, getSyncQueue);
router.post("/attendance/sync-retry", verifyToken, triggerSyncWorker);
router.post("/attendance/recalculate-daily", verifyToken, recalculateDailyAttendance);

module.exports = router;