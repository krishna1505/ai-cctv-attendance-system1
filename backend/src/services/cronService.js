const cron = require("node-cron");
const prisma = require("../config/prisma");
const axios = require("axios");
const { decrypt } = require("../utils/crypto.util");

const initScheduledJobs = () => {
  // Runs every 30 minutes to pull master records from HRMS
  cron.schedule("*/30 * * * *", async () => {
    console.log("[CRON] Running 30-min HRMS Master Sync...");
    try {
      const companies = await prisma.company.findMany({ where: { status: "ACTIVE" } });

      for (const comp of companies) {
        if (!comp.hrmsBaseUrl || !comp.hrmsDeviceKey) continue;

        // Decrypt credentials for outbound HRMS API request
        const plainDeviceKey = decrypt(comp.hrmsDeviceKey) || comp.hrmsDeviceKey;
        const plainCompanyId = decrypt(comp.hrmsCompanyId) || comp.hrmsCompanyId;

        try {
          const response = await axios.get(`${comp.hrmsBaseUrl}/api/v1/employees`, {
            headers: {
              "X-Device-Key": plainDeviceKey,
              "X-Company-ID": plainCompanyId,
            },
            timeout: 10000,
          });

          const hrmsEmployees = response.data?.data || [];
          const remoteHrmsIds = new Set();

          for (const emp of hrmsEmployees) {
            remoteHrmsIds.add(emp.id.toString());
            const status = emp.status === "ACTIVE" ? "ACTIVE" : "INACTIVE";

            await prisma.employee.upsert({
              where: {
                companyId_hrmsEmployeeId: { companyId: comp.id, hrmsEmployeeId: emp.id.toString() },
              },
              update: {
                name: emp.name,
                status,
                lastSyncedAt: new Date(),
              },
              create: {
                companyId: comp.id,
                hrmsEmployeeId: emp.id.toString(),
                employeeCode: emp.employeeCode || `EMP_${emp.id}`,
                name: emp.name,
                status,
                lastSyncedAt: new Date(),
              },
            });
          }

          // Deactivation Logic: Employees missing from HRMS get marked INACTIVE
          const deactivatedEmployees = await prisma.employee.findMany({
            where: {
              companyId: comp.id,
              hrmsEmployeeId: { notIn: Array.from(remoteHrmsIds) },
              status: "ACTIVE",
            },
          });

          if (deactivatedEmployees.length > 0) {
            await prisma.employee.updateMany({
              where: {
                companyId: comp.id,
                hrmsEmployeeId: { notIn: Array.from(remoteHrmsIds) },
                status: "ACTIVE",
              },
              data: { status: "INACTIVE" },
            });

            // Module 1/2 Security: Generate AuditLog for each deactivated employee
            for (const deact of deactivatedEmployees) {
              await prisma.auditLog.create({
                data: {
                  companyId: comp.id,
                  action: "EMPLOYEE_DEACTIVATED",
                  performedBy: "HRMS_CRON_SYNC",
                  details: { employeeId: deact.id, employeeCode: deact.employeeCode, name: deact.name },
                },
              });
            }
          }

          // Write Success SyncLog Audit
          await prisma.syncLog.create({
            data: {
              companyId: comp.id,
              syncType: "EMPLOYEE_AUTO_SYNC",
              status: "SYNCED",
              recordsSynced: hrmsEmployees.length,
            },
          });
        } catch (syncErr) {
          // Write Failure SyncLog Audit
          await prisma.syncLog.create({
            data: {
              companyId: comp.id,
              syncType: "EMPLOYEE_AUTO_SYNC",
              status: "FAILED",
              errorMessage: syncErr.message,
            },
          });
        }
      }
    } catch (error) {
      console.error("[CRON ERROR]:", error);
    }
  });
};

module.exports = { initScheduledJobs };