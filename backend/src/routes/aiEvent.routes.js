const express = require("express");
const router = express.Router();
const { getAIEvents } = require("../controllers/aiEvent.controller");

// Auth middleware import (named ya default dono handle karta hai)
const authModule = require("../middlewares/auth.middleware");
const authMiddleware = authModule.verifyToken || authModule.authMiddleware || authModule;

router.get("/", authMiddleware, getAIEvents);

module.exports = router;