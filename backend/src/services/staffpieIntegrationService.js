const axios = require("axios");
const prisma = require("../config/prisma");
const { decrypt } = require("../utils/crypto.util");

/**
 * Helper: Resolve and decrypt integration credentials for a company exclusively from HRMSIntegration table
 */
const getCompanyIntegrationConfig = async (companyId) => {
  const integration = await prisma.hRMSIntegration.findUnique({
    where: { companyId },
    include: { company: true },
  });

  if (!integration) {
    throw new Error(`HRMS Integration not configured for company ID ${companyId}`);
  }

  const baseUrl = integration.baseUrl ? integration.baseUrl.replace(/\/+$/, "") : null;
  const deviceKey = integration.deviceKeyEncrypted
    ? decrypt(integration.deviceKeyEncrypted) || integration.deviceKeyEncrypted
    : null;

  return {
    company: integration.company,
    baseUrl,
    deviceKey,
    companyCode: integration.company.code,
  };
};

/**
 * 1. Outbound Device Punch Bridge
 * Endpoint: POST /api/v1/attendance/device/punch
 * Headers: X-Device-Key, X-Company-ID
 * Payload: { employeeId, deviceId, mode: "face", timestamp }
 */
const sendDevicePunch = async ({
  companyId,
  employeeId,
  deviceId,
  punchTimestamp,
}) => {
  const { baseUrl, deviceKey, companyCode } = await getCompanyIntegrationConfig(companyId);

  if (!baseUrl || !deviceKey) {
    throw new Error("StaffPie HRMS configuration incomplete: Base URL or Device Key missing.");
  }

  const endpoint = `${baseUrl}/api/v1/attendance/device/punch`;
  
  const payload = {
    employeeId,
    deviceId: deviceId || "CCTV_AI_ENGINE",
    mode: "face",
    timestamp: punchTimestamp ? new Date(punchTimestamp).toISOString() : new Date().toISOString(),
  };

  const headers = {
    "Content-Type": "application/json",
    "X-Device-Key": deviceKey,
    "X-Company-ID": companyCode || companyId,
  };

  const response = await axios.post(endpoint, payload, {
    headers,
    timeout: 10000,
  });

  return {
    success: true,
    status: response.status,
    data: response.data,
  };
};

/**
 * 2. Pull Sync: Employees from StaffPie HRMS
 * Endpoint: GET /api/v1/employees
 */
const syncEmployeesFromStaffPie = async (companyId, jwtToken) => {
  const { baseUrl } = await getCompanyIntegrationConfig(companyId);

  try {
    const response = await axios.get(`${baseUrl}/api/v1/employees?limit=500`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
      timeout: 15000,
    });

    const employees = response.data?.data || response.data?.employees || response.data || [];
    let syncedCount = 0;

    for (const emp of employees) {
      const hrmsEmployeeId = emp.id || emp._id || emp.hrmsEmployeeId;
      const employeeCode = emp.employeeCode || emp.code;
      const name = emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Staff Member";

      if (!hrmsEmployeeId || !employeeCode) continue;

      await prisma.employee.upsert({
        where: {
          companyId_hrmsEmployeeId: {
            companyId,
            hrmsEmployeeId: String(hrmsEmployeeId),
          },
        },
        update: {
          name,
          employeeCode: String(employeeCode),
          designation: emp.designation?.title || emp.designation || null,
          status: emp.status === "ACTIVE" || emp.isActive ? "ACTIVE" : "INACTIVE",
          lastSyncedAt: new Date(),
        },
        create: {
          companyId,
          hrmsEmployeeId: String(hrmsEmployeeId),
          employeeCode: String(employeeCode),
          name,
          designation: emp.designation?.title || emp.designation || null,
          status: emp.status === "ACTIVE" || emp.isActive ? "ACTIVE" : "INACTIVE",
          lastSyncedAt: new Date(),
        },
      });

      syncedCount++;
    }

    await prisma.syncLog.create({
      data: {
        companyId,
        syncType: "EMPLOYEES",
        status: "SYNCED",
        recordsSynced: syncedCount,
      },
    });

    return { success: true, recordsSynced: syncedCount };
  } catch (error) {
    await prisma.syncLog.create({
      data: {
        companyId,
        syncType: "EMPLOYEES",
        status: "FAILED",
        errorMessage: error.response?.data?.message || error.message,
      },
    });
    throw error;
  }
};

/**
 * 3. Pull Sync: Face Enrollments
 * Endpoint: GET /api/v1/face-ai/enrollments
 */
const syncFaceEnrollmentsFromStaffPie = async (companyId, jwtToken) => {
  const { baseUrl } = await getCompanyIntegrationConfig(companyId);

  try {
    const response = await axios.get(`${baseUrl}/api/v1/face-ai/enrollments`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
      timeout: 15000,
    });

    const enrollments = response.data?.data || response.data?.enrollments || response.data || [];
    let syncedCount = 0;

    for (const item of enrollments) {
      const hrmsEmployeeId = item.employeeId || item.id;
      const faceRef = item.faceImageUrl || item.faceUrl || item.embeddingRef || null;

      if (!hrmsEmployeeId || !faceRef) continue;

      const employee = await prisma.employee.findFirst({
        where: { companyId, hrmsEmployeeId: String(hrmsEmployeeId) },
      });

      if (employee) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: { faceProfileRef: faceRef, lastSyncedAt: new Date() },
        });
        syncedCount++;
      }
    }

    await prisma.syncLog.create({
      data: {
        companyId,
        syncType: "FACES",
        status: "SYNCED",
        recordsSynced: syncedCount,
      },
    });

    return { success: true, recordsSynced: syncedCount };
  } catch (error) {
    await prisma.syncLog.create({
      data: {
        companyId,
        syncType: "FACES",
        status: "FAILED",
        errorMessage: error.response?.data?.message || error.message,
      },
    });
    throw error;
  }
};

/**
 * 4. Pull Sync: Shifts Master
 * Endpoint: GET /api/v1/shifts
 */
const syncShiftsFromStaffPie = async (companyId, jwtToken) => {
  const { baseUrl } = await getCompanyIntegrationConfig(companyId);

  try {
    const response = await axios.get(`${baseUrl}/api/v1/shifts`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
      timeout: 15000,
    });

    const shifts = response.data?.data || response.data?.shifts || response.data || [];
    let syncedCount = 0;

    for (const s of shifts) {
      const hrmsShiftId = s.id || s._id;
      if (!hrmsShiftId) continue;

      await prisma.shiftSnapshot.upsert({
        where: {
          companyId_hrmsShiftId: {
            companyId,
            hrmsShiftId: String(hrmsShiftId),
          },
        },
        update: {
          name: s.name || s.title || "General Shift",
          startTime: s.startTime || "09:00",
          endTime: s.endTime || "18:00",
          gracePeriod: s.gracePeriod || 15,
        },
        create: {
          companyId,
          hrmsShiftId: String(hrmsShiftId),
          name: s.name || s.title || "General Shift",
          startTime: s.startTime || "09:00",
          endTime: s.endTime || "18:00",
          gracePeriod: s.gracePeriod || 15,
        },
      });

      syncedCount++;
    }

    await prisma.syncLog.create({
      data: {
        companyId,
        syncType: "SHIFTS",
        status: "SYNCED",
        recordsSynced: syncedCount,
      },
    });

    return { success: true, recordsSynced: syncedCount };
  } catch (error) {
    await prisma.syncLog.create({
      data: {
        companyId,
        syncType: "SHIFTS",
        status: "FAILED",
        errorMessage: error.response?.data?.message || error.message,
      },
    });
    throw error;
  }
};

/**
 * 5. Safe Health Check: Uses documented GET /api/v1/employees?limit=1 ping
 */
const checkStaffPieHealth = async (companyId) => {
  let config;
  try {
    config = await getCompanyIntegrationConfig(companyId);
  } catch (err) {
    return { status: "UNCONFIGURED", message: err.message };
  }

  const { baseUrl } = config;
  const startTime = Date.now();

  try {
    await axios.get(`${baseUrl}/api/v1/employees?limit=1`, { timeout: 5000 });
    const latency = Date.now() - startTime;

    await prisma.hRMSIntegration.update({
      where: { companyId },
      data: { lastHealthCheck: new Date(), status: "ACTIVE" },
    });

    return { status: "ONLINE", latencyMs: latency };
  } catch (error) {
    const latency = Date.now() - startTime;
    // 401 Unauthorized or 403 Forbidden means external server is reachable and active
    if (error.response && [401, 403].includes(error.response.status)) {
      await prisma.hRMSIntegration.update({
        where: { companyId },
        data: { lastHealthCheck: new Date(), status: "ACTIVE" },
      });
      return { status: "ONLINE", latencyMs: latency, reachable: true };
    }

    await prisma.hRMSIntegration.update({
      where: { companyId },
      data: { lastHealthCheck: new Date(), status: "ERROR" },
    });

    return {
      status: "OFFLINE",
      latencyMs: latency,
      error: error.message,
    };
  }
};

module.exports = {
  sendDevicePunch,
  syncEmployeesFromStaffPie,
  syncFaceEnrollmentsFromStaffPie,
  syncShiftsFromStaffPie,
  checkStaffPieHealth,
};