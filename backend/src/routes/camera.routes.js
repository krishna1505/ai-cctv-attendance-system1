const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  getCameras,
  getCameraById,
  addCamera,
  updateCamera,
  deleteCamera,
  pingCamera,
} = require("../controllers/camera.controller");

router.get("/cameras", verifyToken, getCameras);
router.get("/cameras/:id", verifyToken, getCameraById);
router.post("/cameras", verifyToken, addCamera);
router.put("/cameras/:id", verifyToken, updateCamera);
router.delete("/cameras/:id", verifyToken, deleteCamera);
router.post("/cameras/:id/ping", verifyToken, pingCamera);

module.exports = router;