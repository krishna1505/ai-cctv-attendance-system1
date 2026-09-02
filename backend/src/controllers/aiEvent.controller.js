const prisma = require("../config/prisma");

// GET /api/ai-events
const getAIEvents = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.admin?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Company ID missing from session",
      });
    }

    const aiEventModel = prisma.aIEvent || prisma.aiEvent;
    const { eventType, cameraId, employeeId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { companyId };
    if (eventType) where.eventType = eventType;
    if (cameraId) where.cameraId = cameraId;
    if (employeeId) where.employeeId = employeeId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [total, events] = await Promise.all([
      aiEventModel.count({ where }),
      aiEventModel.findMany({
        where,
        include: {
          employee: { select: { id: true, name: true, employeeCode: true, designation: true } },
          camera: { select: { id: true, name: true, location: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
      data: events,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAIEvents };