const prisma = require("../config/prisma");

// GET /api/cameras - List all cameras for the company
const getCameras = async (req, res) => {
  try {
    const { companyId } = req.user;

    const cameras = await prisma.camera.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: cameras.length,
      data: cameras,
    });
  } catch (error) {
    console.error("Fetch cameras error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/cameras/:id - Get single camera details
const getCameraById = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const camera = await prisma.camera.findFirst({
      where: { id, companyId },
    });

    if (!camera) {
      return res.status(404).json({ success: false, message: "Camera not found" });
    }

    return res.status(200).json({
      success: true,
      data: camera,
    });
  } catch (error) {
    console.error("Fetch camera by ID error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/cameras - Register a new camera
const addCamera = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { name, location, rtspUrl } = req.body;

    if (!name || !rtspUrl) {
      return res.status(400).json({
        success: false,
        message: "Camera name and rtspUrl are required",
      });
    }

    const camera = await prisma.camera.create({
      data: {
        companyId,
        name,
        location,
        rtspUrl,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Camera registered successfully",
      data: camera,
    });
  } catch (error) {
    console.error("Add camera error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PUT /api/cameras/:id - Update camera configuration or status
const updateCamera = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    const { name, location, rtspUrl, status } = req.body;

    const existingCamera = await prisma.camera.findFirst({
      where: { id, companyId },
    });

    if (!existingCamera) {
      return res.status(404).json({ success: false, message: "Camera not found" });
    }

    const updatedCamera = await prisma.camera.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(location !== undefined && { location }),
        ...(rtspUrl && { rtspUrl }),
        ...(status && { status }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Camera updated successfully",
      data: updatedCamera,
    });
  } catch (error) {
    console.error("Update camera error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/cameras/:id - Delete a camera
const deleteCamera = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const existingCamera = await prisma.camera.findFirst({
      where: { id, companyId },
    });

    if (!existingCamera) {
      return res.status(404).json({ success: false, message: "Camera not found" });
    }

    await prisma.camera.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: "Camera deleted successfully",
    });
  } catch (error) {
    console.error("Delete camera error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/cameras/:id/ping - Heartbeat ping from camera/edge device
const pingCamera = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const existingCamera = await prisma.camera.findFirst({
      where: { id, companyId },
    });

    if (!existingCamera) {
      return res.status(404).json({ success: false, message: "Camera not found" });
    }

    const updatedCamera = await prisma.camera.update({
      where: { id },
      data: {
        lastPingAt: new Date(),
        status: "ACTIVE",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Camera ping updated",
      lastPingAt: updatedCamera.lastPingAt,
    });
  } catch (error) {
    console.error("Camera ping error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getCameras,
  getCameraById,
  addCamera,
  updateCamera,
  deleteCamera,
  pingCamera,
};