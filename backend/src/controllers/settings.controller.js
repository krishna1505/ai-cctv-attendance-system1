const prisma = require("../config/prisma");

const getCompanyId = (req) => req.companyId || req.user?.companyId || req.admin?.companyId;

// GET /api/settings
const getSettings = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    const [company, employeesCount, camerasCount, zonesCount] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.employee.count({ where: { companyId } }),
      prisma.camera.count({ where: { companyId } }),
      prisma.zone.count({ where: { companyId } }),
    ]);

    // Build comprehensive settings payload matching the exact UI design
    const responseData = {
      general: {
        applicationName: "Staffpie",
        defaultLanguage: "English",
        timezone: company?.timezone || "Asia/Kolkata (IST)",
        dateFormat: "DD/MM/YYYY",
      },
      organization: {
        companyName: company?.name || "Krishna Technologies Pvt. Ltd.",
        companyCode: company?.code || "RED01",
        companyLogo: "https://via.placeholder.com/150",
        address: company?.address || "SCO 123, Industrial Area, Phase 1",
      },
      plan: {
        planName: "Enterprise Plan",
        status: "Active",
        validTill: "31 Dec 2026",
        totalEmployees: employeesCount,
        totalCameras: camerasCount,
        totalLocations: zonesCount || 1,
      },
      attendance: {
        workStart: "09:00 AM",
        workEnd: "06:00 PM",
        gracePeriodMinutes: 10,
        autoMarkAbsentMinutes: 480,
        enableOvertime: true,
        enableBreakTracking: true,
        allowRemoteCheckIn: false,
      },
      aiAnalytics: {
        confidenceThreshold: Math.round((company?.confidenceThreshold ?? 0.85) * 100),
        debounceMinutes: 5,
        retentionDays: 14,
        enableAIEventDetection: true,
        enablePeopleCounting: true,
        enableLoiteringDetection: false,
        storeAISnapshots: true,
      },
      integrations: [
        { name: "Staffpie HRMS", status: "Connected", code: "staffpie" },
        { name: "Zoho People", status: "Connected", code: "zoho" },
        { name: "Keka", status: "Not Connected", code: "keka" },
        { name: "BambooHR", status: "Not Connected", code: "bamboohr" },
      ],
      notifications: {
        emailNotifications: true,
        pushNotifications: true,
        attendanceAlerts: true,
        aiEventsAlerts: true,
        notificationEmail: "admin@staffpie.com",
        dailySummaryTime: "08:00 PM",
      },
      security: {
        passwordExpiryDays: 90,
        enableTwoFactor: true,
        restrictIpAccess: false,
        sessionTimeoutMinutes: 60,
      },
      system: {
        version: "v1.0.0",
        environment: "Production",
        lastUpdated: "24 Aug 2026, 10:32 AM",
        databaseStatus: "Healthy",
        storageUsagePercent: 42,
      },
    };

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error("Get Settings Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/settings
const updateSettings = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    const { aiAnalytics, organization, general } = req.body;

    const updateData = {};
    if (aiAnalytics?.confidenceThreshold !== undefined) {
      updateData.confidenceThreshold = parseFloat(aiAnalytics.confidenceThreshold) / 100;
    }
    if (organization?.companyName) {
      updateData.name = organization.companyName;
    }
    if (general?.timezone) {
      updateData.timezone = general.timezone;
    }

    await prisma.company.update({
      where: { id: companyId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "System configuration saved successfully",
    });
  } catch (error) {
    console.error("Update Settings Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSettings, updateSettings };