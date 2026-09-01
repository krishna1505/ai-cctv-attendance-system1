const prisma = require("../config/prisma");

// GET /api/zones
const getZones = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    const zones = await prisma.zone.findMany({
      where: { companyId },
      include: {
        cameraZones: {
          include: { camera: { select: { id: true, name: true, location: true } } },
        },
      },
    });
    return res.status(200).json({ success: true, data: zones });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/zones
const createZone = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;
    const { name, type, cameraIds, coordinatesJson } = req.body;

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    if (!name) {
      return res.status(400).json({ success: false, message: "Zone name is required" });
    }

    const zone = await prisma.zone.create({
      data: {
        companyId,
        name,
        type: type || "OFFICE",
        coordinatesJson: coordinatesJson ? JSON.stringify(coordinatesJson) : null,
      },
    });

    if (cameraIds && Array.isArray(cameraIds) && cameraIds.length > 0) {
      const cameraZoneData = cameraIds.map((cameraId) => ({
        zoneId: zone.id,
        cameraId,
      }));
      await prisma.cameraZone.createMany({ data: cameraZoneData });
    }

    return res.status(201).json({ success: true, message: "Zone created", data: zone });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/zones/:id
const updateZone = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;
    const { id } = req.params;
    const { name, type, status, coordinatesJson } = req.body;

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    const zone = await prisma.zone.findFirst({ where: { id, companyId } });
    if (!zone) {
      return res.status(404).json({ success: false, message: "Zone not found" });
    }

    const updated = await prisma.zone.update({
      where: { id },
      data: {
        name: name || zone.name,
        type: type || zone.type,
        status: status || zone.status,
        coordinatesJson: coordinatesJson !== undefined ? JSON.stringify(coordinatesJson) : zone.coordinatesJson,
      },
    });

    return res.status(200).json({ success: true, message: "Zone updated", data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/zones/:id
const deleteZone = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;
    const { id } = req.params;

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    const zone = await prisma.zone.findFirst({ where: { id, companyId } });
    if (!zone) {
      return res.status(404).json({ success: false, message: "Zone not found" });
    }

    // Camera mappings delete cascade handles CameraZone
    await prisma.cameraZone.deleteMany({ where: { zoneId: id } });
    await prisma.zone.delete({ where: { id } });

    return res.status(200).json({ success: true, message: "Zone deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getZones,
  createZone,
  updateZone,
  deleteZone,
};