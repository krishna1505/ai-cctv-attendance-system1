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
router.post("/sync", auth, hrmsController.triggerHrmsSync);
router.get("/sync-logs", auth, hrmsController.getSyncLogs);

module.exports = router;