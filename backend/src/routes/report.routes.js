const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const { exportReport } = require("../controllers/report.controller");

// Base path mapping (Works with app.use("/api/reports", ...))
router.get("/export", verifyToken, exportReport);
router.get("/attendance", verifyToken, exportReport);

// Fallback mapping (Works if app.use("/api", ...) is mounted)
router.get("/reports/export", verifyToken, exportReport);
router.get("/reports/attendance", verifyToken, exportReport);

module.exports = router;