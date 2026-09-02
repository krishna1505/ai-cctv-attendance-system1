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
  testCameraConnection,
} = require("../controllers/camera.controller");

// Base path already "/api/cameras" hai app.js me
router.get("/", verifyToken, getCameras);
router.post("/", verifyToken, addCamera);
router.get("/:id", verifyToken, getCameraById);
router.put("/:id", verifyToken, updateCamera);
router.delete("/:id", verifyToken, deleteCamera);
router.post("/:id/ping", verifyToken, pingCamera);
router.post("/:id/test", verifyToken, testCameraConnection);

module.exports = router;