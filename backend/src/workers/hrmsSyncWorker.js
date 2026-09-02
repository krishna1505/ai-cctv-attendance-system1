const prisma = require("../config/prisma");
const axios = require("axios");

// Clean URL formatting to prevent double-slash or route-mismatch 404s
const getTargetEndpoint = () => {
  const rawBase = (process.env.STAFFPIE_HRMS_BASE_URL || "http://localhost:5000/api/v1").replace(/\/+$/, "");
  return rawBase.endsWith("/attendance/device/punch")
    ? rawBase
    : `${rawBase}/attendance/device/punch`;
};

const DEVICE_KEY = process.env.STAFFPIE_DEVICE_KEY || "DEV_SECRET_MOCK_KEY";

/**
 * Process pending punches from hrms_sync_queue
 */
async function processSyncQueue() {
  try {
    const pendingJobs = await prisma.hrmsSyncQueue.findMany({
      where: {
        status: "PENDING",
        nextRetryAt: { lte: new Date() },
      },
      include: {
        rawLog: {
          include: {
            employee: true,
            camera: true,
          },
        },
      },
      take: 10,
    });

    if (!pendingJobs || pendingJobs.length === 0) return;

    const targetUrl = getTargetEndpoint();

    for (const job of pendingJobs) {
      const employee = job.rawLog?.employee;
      const camera = job.rawLog?.camera;

      // StaffPie Official Device Punch Payload Format
      const hrmsPayload = {
        mode: "face",
        employeeCode: employee?.employeeCode || job.payload?.employeeCode || "UNKNOWN",
        deviceId: camera?.name || job.rawLog?.cameraId || "CAM_MAIN_ENTRANCE",
        eventType: job.payload?.eventType || "auto",
        timestamp: (job.rawLog?.punchTimestamp || new Date()).toISOString(),
      };

      try {
        // Attempt POST to StaffPie Device Punch API
        await axios.post(targetUrl, hrmsPayload, {
          headers: {
            "Content-Type": "application/json",
            "X-Device-Key": DEVICE_KEY,
            "X-Company-ID": job.companyId,
          },
          timeout: 5000,
        });

        // 1. Mark Queue Job as SUCCESS (QueueStatus enum)
        await prisma.hrmsSyncQueue.update({
          where: { id: job.id },
          data: { status: "SUCCESS" },
        });

        // 2. Mark Raw Log as SYNCED (SyncStatus enum)
        if (job.rawLogId) {
          await prisma.attendanceRawLog.update({
            where: { id: job.rawLogId },
            data: { syncStatus: "SYNCED" },
          });
        }

        console.log(`[HRMS Worker] Synced punch for employee: ${hrmsPayload.employeeCode}`);
      } catch (err) {
        const nextAttempts = (job.attempts || 0) + 1;
        const isExhausted = nextAttempts >= (job.maxAttempts || 5);

        await prisma.hrmsSyncQueue.update({
          where: { id: job.id },
          data: {
            attempts: nextAttempts,
            status: isExhausted ? "FAILED" : "PENDING",
            lastError: err.response?.data?.message || err.message,
            nextRetryAt: new Date(Date.now() + nextAttempts * 10 * 1000), // Exponential backoff
          },
        });

        console.warn(`[HRMS Worker] Punch retry (${nextAttempts}/${job.maxAttempts || 5}) to ${targetUrl}: ${err.message}`);
      }
    }
  } catch (error) {
    console.error("[HRMS Worker Error]:", error.message);
  }
}

// Start worker loop (Har 10 second me run karega)
function startHrmsSyncWorker() {
  console.log("⚙️ HRMS Outbound Punch Worker started (10s interval)");
  setInterval(processSyncQueue, 10 * 1000);
}

module.exports = { startHrmsSyncWorker, processSyncQueue };