const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  getZones,
  createZone,
  updateZone,
  deleteZone,
} = require("../controllers/zone.controller");

router.get("/zones", verifyToken, getZones);
router.post("/zones", verifyToken, createZone);
router.put("/zones/:id", verifyToken, updateZone);
router.delete("/zones/:id", verifyToken, deleteZone);

module.exports = router;