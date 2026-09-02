const express = require("express");
const router = express.Router();

// 1. Auth Middleware Safe Import
const authModule = require("../middlewares/auth.middleware");
const verifyToken =
  typeof authModule === "function"
    ? authModule
    : authModule.verifyToken || authModule.authenticate || authModule.authMiddleware || ((req, res, next) => next());

// 2. Controller Safe Import (handles both reports.controller.js and report.controller.js)
let reportsController;
try {
  reportsController = require("../controllers/reports.controller");
} catch (err) {
  reportsController = require("../controllers/report.controller");
}

const handler = reportsController.getReports || reportsController.exportReport;
const exportHandler = reportsController.exportReport || reportsController.getReports;
const dashboardHandler = reportsController.getReportsDashboard || reportsController.getReports || exportHandler;

// ==========================================
// Base Routes (Mounted at app.use("/api/reports", router))
// ==========================================
router.get("/dashboard", verifyToken, dashboardHandler); // 👈 Added for advanced reports dashboard UI
router.get("/", verifyToken, handler);
router.get("/history", verifyToken, handler);
router.get("/export", verifyToken, exportHandler);
router.get("/attendance", verifyToken, handler);

// ==========================================
// Redundant Fallback Routes (If mounted at app.use("/api", router))
// ==========================================
router.get("/reports/dashboard", verifyToken, dashboardHandler); // 👈 Added fallback for dashboard
router.get("/reports", verifyToken, handler);
router.get("/reports/history", verifyToken, handler);
router.get("/reports/export", verifyToken, exportHandler);
router.get("/reports/attendance", verifyToken, handler);

module.exports = router;