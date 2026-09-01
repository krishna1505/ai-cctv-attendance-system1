const prisma = require("../config/prisma");
const axios = require("axios");
const { decrypt } = require("../utils/crypto.util");

const syncFaceEnrollments = async (companyId) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.hrmsBaseUrl || !company.hrmsDeviceKey) return;

  const plainDeviceKey = decrypt(company.hrmsDeviceKey) || company.hrmsDeviceKey;
  const plainCompanyId = decrypt(company.hrmsCompanyId) || company.hrmsCompanyId;

  try {
    const response = await axios.get(`${company.hrmsBaseUrl}/api/v1/face-ai/enrollments`, {
      headers: {
        "X-Device-Key": plainDeviceKey,
        "X-Company-ID": plainCompanyId,
      },
      timeout: 10000,
    });

    const enrollments = response.data?.data || [];
    for (const item of enrollments) {
      await prisma.employee.updateMany({
        where: { companyId, hrmsEmployeeId: item.employeeId.toString() },
        data: { faceProfileRef: item.faceVectorId || item.embeddingUrl },
      });
    }

    await prisma.syncLog.create({
      data: {
        companyId,
        syncType: "FACE_EMBEDDING_SYNC",
        status: "SYNCED",
        recordsSynced: enrollments.length,
      },
    });
  } catch (error) {
    await prisma.syncLog.create({
      data: {
        companyId,
        syncType: "FACE_EMBEDDING_SYNC",
        status: "FAILED",
        errorMessage: error.message,
      },
    });
  }
};

module.exports = { syncFaceEnrollments };