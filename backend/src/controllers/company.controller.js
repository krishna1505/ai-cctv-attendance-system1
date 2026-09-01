const prisma = require("../config/prisma");
const { encrypt, decrypt } = require("../utils/crypto.util");

// GET /api/company/profile
const getCompanyProfile = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Company scope missing",
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...company,
        hrmsDeviceKey: company.hrmsDeviceKey ? "********" : null,
        hrmsCompanyId: company.hrmsCompanyId ? decrypt(company.hrmsCompanyId) : null,
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// PUT /api/company/settings
const updateCompanySettings = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    const {
      name,
      timezone,
      address,
      confidenceThreshold,
      confidence_threshold,
      hrms_base_url,
      hrmsBaseUrl,
      hrms_device_key,
      hrmsDeviceKey,
      hrms_company_id,
      hrmsCompanyId,
    } = req.body;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Company scope missing",
      });
    }

    const targetHrmsBaseUrl = hrms_base_url || hrmsBaseUrl;
    const targetHrmsDeviceKey = hrms_device_key || hrmsDeviceKey;
    const targetHrmsCompanyId = hrms_company_id || hrmsCompanyId;
    const targetConfidence = confidenceThreshold !== undefined ? confidenceThreshold : confidence_threshold;

    const updateData = {};
    if (name) updateData.name = name;
    if (timezone) updateData.timezone = timezone;
    if (address !== undefined) updateData.address = address;
    if (targetConfidence !== undefined) updateData.confidenceThreshold = parseFloat(targetConfidence);
    if (targetHrmsBaseUrl !== undefined) updateData.hrmsBaseUrl = targetHrmsBaseUrl;
    if (targetHrmsDeviceKey) updateData.hrmsDeviceKey = encrypt(targetHrmsDeviceKey);
    if (targetHrmsCompanyId) updateData.hrmsCompanyId = encrypt(targetHrmsCompanyId);

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: updateData,
    });

    // Module 1 Security: Record AuditLog on Settings Update
    await prisma.auditLog.create({
      data: {
        companyId,
        action: "COMPANY_SETTINGS_UPDATED",
        performedBy: req.user?.email || "ADMIN",
        details: { updatedFields: Object.keys(updateData) },
        ipAddress: req.ip || req.connection?.remoteAddress,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Company settings updated successfully",
      data: {
        ...updatedCompany,
        hrmsDeviceKey: updatedCompany.hrmsDeviceKey ? "********" : null,
        hrmsCompanyId: updatedCompany.hrmsCompanyId ? decrypt(updatedCompany.hrmsCompanyId) : null,
      },
    });
  } catch (error) {
    console.error("Settings update error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// POST /api/company/register (Initial Onboarding)
const registerCompany = async (req, res) => {
  try {
    const {
      name,
      code,
      timezone,
      address,
      confidenceThreshold,
      hrmsBaseUrl,
      hrmsDeviceKey,
      hrmsCompanyId,
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Company name and unique code are required",
      });
    }

    const company = await prisma.company.create({
      data: {
        name,
        code,
        timezone: timezone || "Asia/Kolkata",
        address,
        confidenceThreshold: confidenceThreshold ? parseFloat(confidenceThreshold) : 0.85,
        hrmsBaseUrl,
        hrmsDeviceKey: hrmsDeviceKey ? encrypt(hrmsDeviceKey) : null,
        hrmsCompanyId: hrmsCompanyId ? encrypt(hrmsCompanyId) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: company.id,
        action: "COMPANY_REGISTERED",
        performedBy: "SYSTEM_ONBOARDING",
        details: { companyName: name, code },
        ipAddress: req.ip || req.connection?.remoteAddress,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Company registered successfully",
      data: {
        ...company,
        hrmsDeviceKey: company.hrmsDeviceKey ? "********" : null,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getCompanyProfile,
  updateCompanySettings,
  registerCompany,
};