const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  getZones,
  createZone,
  updateZone,
  deleteZone,
} = require("../controllers/zone.controller");

// Base path already "/api/zones" hai app.js me
router.get("/", verifyToken, getZones);
router.post("/", verifyToken, createZone);
router.put("/:id", verifyToken, updateZone);
router.delete("/:id", verifyToken, deleteZone);

module.exports = router;