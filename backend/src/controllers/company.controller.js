const prisma = require("../config/prisma");

// GET /api/company/profile
const getCompanyProfile = async (req, res) => {
  try {
    const { companyId } = req.user;

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
      data: company,
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
    const { companyId } = req.user;
    const {
      name,
      timezone,
      address,
      hrms_base_url,
      hrms_device_key,
      hrms_company_id,
    } = req.body;

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        ...(name && { name }),
        ...(timezone && { timezone }),
        ...(address && { address }),
        ...(hrms_base_url && { hrmsBaseUrl: hrms_base_url }),
        ...(hrms_device_key && { hrmsDeviceKey: hrms_device_key }),
        ...(hrms_company_id && { hrmsCompanyId: hrms_company_id }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Company settings updated successfully",
      data: updatedCompany,
    });
  } catch (error) {
    console.error("Settings update error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getCompanyProfile,
  updateCompanySettings,
};