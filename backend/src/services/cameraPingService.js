const prisma = require("../config/prisma");
const { publishAIEvent } = require("./eventPublisherService");

/**
 * Camera Inactivity Monitor Worker (Runs in Background Interval)
 * - Scans lastPingAt against offline threshold (2 minutes)
 * - Marks inactive cameras as INACTIVE
 * - Emits CAMERA_OFFLINE event via unified AIEvent pipeline
 */
const monitorCameraHeartbeats = async () => {
  try {
    const cameras = await prisma.camera.findMany({
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    const now = new Date();
    const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes without ping = INACTIVE

    for (const camera of cameras) {
      const lastPing = camera.lastPingAt
        ? new Date(camera.lastPingAt)
        : new Date(camera.createdAt);

      const isStale = now.getTime() - lastPing.getTime() > OFFLINE_THRESHOLD_MS;
      const expectedStatus = isStale ? "INACTIVE" : "ACTIVE";

      if (camera.status !== expectedStatus) {
        // 1. Update Database Status
        const updatedCamera = await prisma.camera.update({
          where: { id: camera.id },
          data: { status: expectedStatus },
        });

        const eventType =
          expectedStatus === "ACTIVE" ? "CAMERA_ONLINE" : "CAMERA_OFFLINE";

        // 2. Persist to AIEvent table & Broadcast via Socket.IO
        await publishAIEvent({
          companyId: camera.companyId,
          cameraId: updatedCamera.id,
          eventType,
          metadata: {
            cameraName: camera.name,
            location: camera.location,
            previousStatus: camera.status,
            currentStatus: expectedStatus,
            lastPingAt: camera.lastPingAt,
            alertMessage:
              eventType === "CAMERA_OFFLINE"
                ? `⚠️ Camera "${camera.name}" is unreachable!`
                : `✅ Camera "${camera.name}" is back online.`,
          },
        });

        console.log(
          `📡 [Camera Monitor] Logged & Broadcasted ${eventType} for Camera: "${camera.name}"`
        );
      }
    }
  } catch (error) {
    console.error("Camera Heartbeat Monitor Error:", error.message);
  }
};

/**
 * Camera Ping / Ingestion Recovery Handler
 * - Updates camera lastPingAt and marks status ACTIVE
 * - Emits CAMERA_ONLINE event immediately if camera recovers from INACTIVE/OFFLINE
 */
const recordCameraHeartbeat = async (cameraId, companyId) => {
  try {
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
    });

    if (!camera) return null;

    const wasOffline = camera.status === "OFFLINE" || camera.status === "INACTIVE";

    // 1. Update status & ping timestamp in database
    const updatedCamera = await prisma.camera.update({
      where: { id: cameraId },
      data: {
        status: "ACTIVE",
        lastPingAt: new Date(),
      },
    });

    // 2. Auto-emit CAMERA_ONLINE if camera recovered from offline/inactive state
    if (wasOffline) {
      await publishAIEvent({
        companyId,
        cameraId,
        eventType: "CAMERA_ONLINE",
        metadata: {
          cameraName: camera.name,
          location: camera.location,
          previousStatus: camera.status,
          currentStatus: "ACTIVE",
          alertMessage: `✅ Camera "${camera.name}" recovered and is back ONLINE.`,
        },
      });

      console.log(
        `📡 [Camera Recovery] Emitted CAMERA_ONLINE for recovered Camera: "${camera.name}"`
      );
    }

    return updatedCamera;
  } catch (error) {
    console.error("Camera Ping Handler Error:", error.message);
    return null;
  }
};

module.exports = {
  monitorCameraHeartbeats,
  recordCameraHeartbeat,
};