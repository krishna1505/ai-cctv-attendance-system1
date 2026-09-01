const prisma = require("../config/prisma");
const axios = require("axios");
const { decrypt } = require("../utils/crypto.util");

/**
 * Pushes raw attendance punch payload to external HRMS with decrypted credentials.
 * If external HRMS endpoint is not configured, simulates a mock sync.
 */
async function sendPunchToHrms(company, payload) {
  if (company.hrmsBaseUrl && company.hrmsBaseUrl.startsWith("http")) {
    const plainDeviceKey = decrypt(company.hrmsDeviceKey) || company.hrmsDeviceKey || "";
    const plainCompanyId = decrypt(company.hrmsCompanyId) || company.hrmsCompanyId || company.id;

    // Standardize URL path to /api/v1/attendance/device/punch or fallback
    const baseUrl = company.hrmsBaseUrl.replace(/\/+$/, "");
    const targetUrl = baseUrl.includes("/attendance") 
      ? baseUrl 
      : `${baseUrl}/api/v1/attendance/device/punch`;

    const response = await axios.post(
      targetUrl,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Key": plainDeviceKey,
          "X-Company-ID": plainCompanyId,
        },
        timeout: 8000,
      }
    );
    return response.data;
  }

  // Mock HRMS success response for local dev testing
  return {
    success: true,
    message: "Punch synced successfully with HRMS (Mock Engine)",
    syncedAt: new Date().toISOString(),
  };
}

/**
 * Worker function: Processes pending sync items using Exponential Backoff & SyncLog audit
 */
async function processSyncQueueBatch(batchSize = 20) {
  const now = new Date();

  // 1. Fetch pending/retryable items that have not exceeded maxAttempts
  const queueItems = await prisma.hrmsSyncQueue.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: 5 },
      nextRetryAt: { lte: now },
    },
    include: {
      company: true,
      rawLog: true,
    },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  const results = [];

  for (const item of queueItems) {
    try {
      // Mark as PROCESSING
      await prisma.hrmsSyncQueue.update({
        where: { id: item.id },
        data: { status: "PROCESSING" },
      });

      // Attempt push to external HRMS
      await sendPunchToHrms(item.company, item.payload);

      // On Success: Update Queue, RawLog and write SyncLog audit
      await prisma.hrmsSyncQueue.update({
        where: { id: item.id },
        data: {
          status: "SUCCESS",
          lastError: null,
          attempts: { increment: 1 },
        },
      });

      await prisma.attendanceRawLog.update({
        where: { id: item.rawLogId },
        data: { syncStatus: "SYNCED" },
      });

      // Module 7 SyncLog audit
      await prisma.syncLog.create({
        data: {
          companyId: item.companyId,
          syncType: "PUNCH_OUTBOUND",
          status: "SYNCED",
          recordsSynced: 1,
          errorMessage: null,
        },
      });

      results.push({ id: item.id, status: "SUCCESS" });
    } catch (error) {
      const nextAttempt = item.attempts + 1;
      const isFailedPermanently = nextAttempt >= item.maxAttempts;

      // Exponential Backoff calculation: 2^attempt * 30 seconds
      const delaySeconds = Math.pow(2, nextAttempt) * 30;
      const nextRetry = new Date(Date.now() + delaySeconds * 1000);

      await prisma.hrmsSyncQueue.update({
        where: { id: item.id },
        data: {
          attempts: nextAttempt,
          status: isFailedPermanently ? "FAILED" : "PENDING",
          lastError: error.message || "Failed to push attendance to HRMS",
          nextRetryAt: nextRetry,
        },
      });

      if (isFailedPermanently) {
        await prisma.attendanceRawLog.update({
          where: { id: item.rawLogId },
          data: { syncStatus: "FAILED" },
        });
      }

      // Module 7 SyncLog error audit
      await prisma.syncLog.create({
        data: {
          companyId: item.companyId,
          syncType: "PUNCH_OUTBOUND",
          status: "FAILED",
          recordsSynced: 0,
          errorMessage: error.message || "Outbound sync failed",
        },
      });

      results.push({
        id: item.id,
        status: isFailedPermanently ? "FAILED" : "RETRY_SCHEDULED",
        nextRetryAt: nextRetry,
        error: error.message,
      });
    }
  }

  return results;
}

module.exports = {
  sendPunchToHrms,
  processSyncQueueBatch,
};