const prisma = require("../config/prisma");
const axios = require("axios");

/**
 * Pushes raw attendance punch payload to external HRMS.
 * If external HRMS endpoint is not configured, simulates a mock sync.
 */
async function sendPunchToHrms(company, payload) {
  if (company.hrmsBaseUrl && company.hrmsBaseUrl.startsWith("http")) {
    const response = await axios.post(
      `${company.hrmsBaseUrl}/attendance/punch`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-device-key": company.hrmsDeviceKey || "",
          "x-company-id": company.hrmsCompanyId || company.id,
        },
        timeout: 5000,
      }
    );
    return response.data;
  }

  // Mock HRMS success response for testing
  return {
    success: true,
    message: "Punch synced successfully with HRMS (Mock Engine)",
    syncedAt: new Date().toISOString(),
  };
}

/**
 * Worker function: Processes pending sync items using Exponential Backoff
 */
async function processSyncQueueBatch(batchSize = 10) {
  const now = new Date();

  // 1. Fetch pending/retryable items
  const queueItems = await prisma.hrmsSyncQueue.findMany({
    where: {
      status: { in: ["PENDING", "PROCESSING"] },
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

      // Attempt push
      await sendPunchToHrms(item.company, item.payload);

      // On Success: Update Queue & RawLog
      const updatedQueue = await prisma.hrmsSyncQueue.update({
        where: { id: item.id },
        data: {
          status: "SUCCESS",
          lastError: null,
        },
      });

      await prisma.attendanceRawLog.update({
        where: { id: item.rawLogId },
        data: { syncStatus: "SYNCED" },
      });

      results.push({ id: item.id, status: "SUCCESS" });
    } catch (error) {
      const nextAttempt = item.attempts + 1;
      const isFailedPermanently = nextAttempt >= item.maxAttempts;

      // Exponential Backoff calculation: 2^attempt * 10 seconds
      const delaySeconds = Math.pow(2, nextAttempt) * 10;
      const nextRetry = new Date(Date.now() + delaySeconds * 1000);

      const updatedQueue = await prisma.hrmsSyncQueue.update({
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