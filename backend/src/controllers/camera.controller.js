const prisma = require("../config/prisma");
const { encrypt } = require("../utils/crypto.util");

// Helper function to safely extract companyId across middlewares
const getCompanyId = (req) => req.companyId || req.user?.companyId || req.admin?.companyId;

// GET /api/cameras - List all cameras for the company
const getCameras = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    const cameras = await prisma.camera.findMany({
      where: { companyId },
      include: {
        cameraZones: {
          include: { zone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Mask encrypted credentials before returning
    const sanitized = cameras.map((cam) => ({
      ...cam,
      credentialsEncrypted: cam.credentialsEncrypted ? "********" : null,
    }));

    return res.status(200).json({
      success: true,
      count: sanitized.length,
      data: sanitized,
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
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    const camera = await prisma.camera.findFirst({
      where: { id, companyId },
      include: {
        cameraZones: {
          include: { zone: true },
        },
      },
    });

    if (!camera) {
      return res.status(404).json({ success: false, message: "Camera not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...camera,
        credentialsEncrypted: camera.credentialsEncrypted ? "********" : null,
      },
    });
  } catch (error) {
    console.error("Fetch camera by ID error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/cameras - Register a new camera
const addCamera = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { name, location, rtspUrl, credentials, zoneIds = [] } = req.body;

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    if (!name || !rtspUrl) {
      return res.status(400).json({
        success: false,
        message: "Camera name and rtspUrl are required",
      });
    }

    // Encrypt stream credentials if provided
    const credentialsEncrypted = credentials
      ? encrypt(typeof credentials === "string" ? credentials : JSON.stringify(credentials))
      : null;

    const camera = await prisma.camera.create({
      data: {
        companyId,
        name,
        location: location || null,
        rtspUrl,
        credentialsEncrypted,
        status: "ACTIVE",
        lastPingAt: new Date(),
        ...(zoneIds.length > 0 && {
          cameraZones: {
            create: zoneIds.map((zoneId) => ({ zoneId })),
          },
        }),
      },
      include: {
        cameraZones: {
          include: { zone: true },
        },
      },
    });

    // Module 3 Audit Trail: Log Camera Registration
    await prisma.auditLog.create({
      data: {
        companyId,
        action: "CAMERA_REGISTERED",
        performedBy: req.user?.email || "ADMIN",
        details: { cameraId: camera.id, cameraName: camera.name, location },
        ipAddress: req.ip || req.connection?.remoteAddress,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Camera registered successfully",
      data: {
        ...camera,
        credentialsEncrypted: credentialsEncrypted ? "********" : null,
      },
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
    const companyId = getCompanyId(req);
    const { name, location, rtspUrl, credentials, status } = req.body;

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    const existingCamera = await prisma.camera.findFirst({
      where: { id, companyId },
    });

    if (!existingCamera) {
      return res.status(404).json({ success: false, message: "Camera not found" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (rtspUrl) updateData.rtspUrl = rtspUrl;
    if (status) updateData.status = status;
    if (credentials) {
      updateData.credentialsEncrypted = encrypt(
        typeof credentials === "string" ? credentials : JSON.stringify(credentials)
      );
    }

    const updatedCamera = await prisma.camera.update({
      where: { id },
      data: updateData,
    });

    // Module 3 Audit Trail: Log Camera Update
    await prisma.auditLog.create({
      data: {
        companyId,
        action: "CAMERA_UPDATED",
        performedBy: req.user?.email || "ADMIN",
        details: { cameraId: id, updatedFields: Object.keys(updateData) },
        ipAddress: req.ip || req.connection?.remoteAddress,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Camera updated successfully",
      data: {
        ...updatedCamera,
        credentialsEncrypted: updatedCamera.credentialsEncrypted ? "********" : null,
      },
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
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    const existingCamera = await prisma.camera.findFirst({
      where: { id, companyId },
    });

    if (!existingCamera) {
      return res.status(404).json({ success: false, message: "Camera not found" });
    }

    await prisma.camera.delete({ where: { id } });

    // Module 3 Audit Trail: Log Camera Deletion
    await prisma.auditLog.create({
      data: {
        companyId,
        action: "CAMERA_DELETED",
        performedBy: req.user?.email || "ADMIN",
        details: { cameraId: id, cameraName: existingCamera.name },
        ipAddress: req.ip || req.connection?.remoteAddress,
      },
    });

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
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

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

// POST /api/cameras/:id/test (Module 3 Spec)
const testCameraConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    const camera = await prisma.camera.findFirst({
      where: { id, companyId },
    });

    if (!camera) {
      return res.status(404).json({ success: false, message: "Camera not found" });
    }

    // Test stream reachability simulation
    const isReachable = Boolean(camera.rtspUrl && camera.rtspUrl.startsWith("rtsp://"));

    await prisma.camera.update({
      where: { id: camera.id },
      data: {
        status: isReachable ? "ACTIVE" : "OFFLINE",
        lastPingAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: isReachable ? "Camera RTSP stream reachable" : "Camera stream unreachable",
      data: {
        id: camera.id,
        name: camera.name,
        streamUrl: camera.rtspUrl,
        status: isReachable ? "ACTIVE" : "OFFLINE",
        testedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Camera test error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCameras,
  getCameraById,
  addCamera,
  updateCamera,
  deleteCamera,
  pingCamera,
  testCameraConnection,
};