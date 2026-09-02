const prisma = require("../config/prisma");
const { sendDevicePunch } = require("./staffpieIntegrationService");

/**
 * 1. Pushes attendance punch to StaffPie with immediate audit & retry handling
 * Direct AttendanceEvent pipeline (Module 10 Core)
 */
const pushAttendancePunch = async (attendanceEventId) => {
  const event = await prisma.attendanceEvent.findUnique({
    where: { id: attendanceEventId },
    include: {
      employee: true,
      company: true,
      camera: true,
    },
  });

  if (!event || !event.employee) {
    throw new Error(`AttendanceEvent with ID ${attendanceEventId} or associated employee not found`);
  }

  // Determine Target Employee ID (Prioritize StaffPie Mongo ID, fallback to Employee code)
  const targetEmployeeId = event.employee.hrmsEmployeeId || event.employee.employeeCode;

  try {
    // Dispatch punch to StaffPie using dedicated integration bridge
    await sendDevicePunch({
      companyId: event.companyId,
      employeeId: targetEmployeeId,
      deviceId: event.camera?.name || event.cameraId || "CCTV_AI_ENGINE",
      punchTimestamp: event.eventTimestamp,
    });

    // Mark AttendanceEvent as SYNCED
    await prisma.attendanceEvent.update({
      where: { id: event.id },
      data: {
        hrmsSyncStatus: "SYNCED",
        lastSyncError: null,
      },
    });

    // Write Success Audit Record to SyncLog
    await prisma.syncLog.create({
      data: {
        companyId: event.companyId,
        syncType: "PUNCH_OUTBOUND",
        status: "SYNCED",
        recordsSynced: 1,
        errorMessage: null,
      },
    });

    return { success: true, eventId: event.id, status: "SYNCED" };
  } catch (error) {
    const nextRetryCount = event.retryCount + 1;
    const isExhausted = nextRetryCount >= 5;
    const errorMessage = error.response?.data?.message || error.message || "Outbound punch failed";

    // Update AttendanceEvent with failure & increment retry count
    await prisma.attendanceEvent.update({
      where: { id: event.id },
      data: {
        hrmsSyncStatus: "FAILED",
        retryCount: nextRetryCount,
        lastSyncError: errorMessage,
      },
    });

    // Write Failure Audit Record to SyncLog
    await prisma.syncLog.create({
      data: {
        companyId: event.companyId,
        syncType: "PUNCH_OUTBOUND",
        status: "FAILED",
        recordsSynced: 0,
        errorMessage,
      },
    });

    return {
      success: false,
      eventId: event.id,
      status: isExhausted ? "PERMANENTLY_FAILED" : "RETRY_SCHEDULED",
      retryCount: nextRetryCount,
      error: errorMessage,
    };
  }
};

/**
 * 2. Worker: Retries all failed attendance events using Exponential Backoff (2^retryCount * 60s)
 */
const retryFailedPunchesWorker = async (batchSize = 25) => {
  const failedEvents = await prisma.attendanceEvent.findMany({
    where: {
      hrmsSyncStatus: "FAILED",
      retryCount: { lt: 5 },
    },
    take: batchSize,
    orderBy: { eventTimestamp: "asc" },
  });

  const results = [];
  for (const event of failedEvents) {
    // Delay calculation: 2^retryCount minutes
    const backoffMs = Math.pow(2, event.retryCount) * 60 * 1000;
    const lastAttemptTime = new Date(event.createdAt).getTime();

    if (Date.now() - lastAttemptTime >= backoffMs) {
      const res = await pushAttendancePunch(event.id);
      results.push(res);
    }
  }

  return results;
};

/**
 * 3. Legacy Queue Worker Bridge (Handles HrmsSyncQueue table if populated)
 */
const processSyncQueueBatch = async (batchSize = 20) => {
  const now = new Date();

  const queueItems = await prisma.hrmsSyncQueue.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: 5 },
      nextRetryAt: { lte: now },
    },
    include: {
      company: true,
      rawLog: {
        include: { employee: true },
      },
    },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  const results = [];

  for (const item of queueItems) {
    try {
      await prisma.hrmsSyncQueue.update({
        where: { id: item.id },
        data: { status: "PROCESSING" },
      });

      const empId = item.rawLog?.employee?.hrmsEmployeeId || item.payload?.employeeId;

      await sendDevicePunch({
        companyId: item.companyId,
        employeeId: empId,
        deviceId: item.payload?.deviceId || "CCTV_AI_ENGINE",
        punchTimestamp: item.rawLog?.punchTimestamp || item.payload?.timestamp,
      });

      await prisma.hrmsSyncQueue.update({
        where: { id: item.id },
        data: {
          status: "SUCCESS",
          lastError: null,
          attempts: { increment: 1 },
        },
      });

      if (item.rawLogId) {
        await prisma.attendanceRawLog.update({
          where: { id: item.rawLogId },
          data: { syncStatus: "SYNCED" },
        });
      }

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
      const delaySeconds = Math.pow(2, nextAttempt) * 60;
      const nextRetry = new Date(Date.now() + delaySeconds * 1000);
      const errorMessage = error.response?.data?.message || error.message || "Failed to push to HRMS";

      await prisma.hrmsSyncQueue.update({
        where: { id: item.id },
        data: {
          attempts: nextAttempt,
          status: isFailedPermanently ? "FAILED" : "PENDING",
          lastError: errorMessage,
          nextRetryAt: nextRetry,
        },
      });

      if (isFailedPermanently && item.rawLogId) {
        await prisma.attendanceRawLog.update({
          where: { id: item.rawLogId },
          data: { syncStatus: "FAILED" },
        });
      }

      await prisma.syncLog.create({
        data: {
          companyId: item.companyId,
          syncType: "PUNCH_OUTBOUND",
          status: "FAILED",
          recordsSynced: 0,
          errorMessage,
        },
      });

      results.push({
        id: item.id,
        status: isFailedPermanently ? "FAILED" : "RETRY_SCHEDULED",
        nextRetryAt: nextRetry,
        error: errorMessage,
      });
    }
  }

  return results;
};

module.exports = {
  pushAttendancePunch,
  retryFailedPunchesWorker,
  processSyncQueueBatch,
};