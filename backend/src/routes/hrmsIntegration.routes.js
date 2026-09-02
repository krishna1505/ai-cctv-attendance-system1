const express = require("express");
const router = express.Router();
const hrmsController = require("../controllers/hrmsIntegration.controller");
const authModule = require("../middlewares/auth.middleware");

// Handle both default export and named export for auth middleware
const auth = typeof authModule === "function" 
  ? authModule 
  : (authModule.authenticate || authModule.authMiddleware || authModule.verifyToken || ((req, res, next) => next()));

// Company Admin Protected Routes
router.get("/health", auth, hrmsController.getHrmsHealth);

// Sync trigger mappings (supports both /sync and /trigger)
router.post("/sync", auth, hrmsController.triggerHrmsSync);
router.post("/trigger", auth, hrmsController.triggerHrmsSync);

// Sync logs mappings (Frontend /logs mang raha hai)
router.get("/logs", auth, hrmsController.getSyncLogs);       // <-- Isse 404 resolve hoga
router.get("/sync-logs", auth, hrmsController.getSyncLogs);
router.get("/", auth, hrmsController.getSyncLogs);

module.exports = router;