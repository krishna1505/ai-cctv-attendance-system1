const prisma = require("../config/prisma");
const { getIO } = require("../config/socket");
const { publishToBroker } = require("../config/redis");

// In-Memory Ring Buffer for DB Outage Resilience (Circuit Breaker)
const failureEventBuffer = [];
const MAX_BUFFER_SIZE = 500;

const flushFailureBuffer = async () => {
  if (failureEventBuffer.length === 0) return;
  const aiEventModel = prisma.aIEvent || prisma.aiEvent;
  if (!aiEventModel) return;

  const itemsToFlush = failureEventBuffer.splice(0, 50);
  for (const item of itemsToFlush) {
    try {
      await aiEventModel.create({ data: item });
    } catch (err) {
      // Re-queue on failure and pause batch
      failureEventBuffer.unshift(item);
      break;
    }
  }
};

// Retry buffered events every 10 seconds
setInterval(flushFailureBuffer, 10000);

/**
 * Unified Event Pipeline:
 * 1. Persists event to AIEvent table (with Circuit Breaker memory buffer fallback)
 * 2. Publishes to Redis Pub/Sub channel for multi-instance horizontal scaling
 * 3. Broadcasts real-time events via Socket.IO multi-tenant rooms (company_<id>)
 */
const publishAIEvent = async ({
  companyId,
  cameraId = null,
  employeeId = null,
  eventType,
  confidenceScore = null,
  zoneType = null,
  metadata = {},
  snapshotUrl = null,
}) => {
  const eventPayload = {
    companyId,
    cameraId,
    employeeId,
    eventType,
    confidenceScore,
    zoneType,
    metadata,
    snapshotUrl,
  };

  let savedEvent = null;
  const aiEventModel = prisma.aIEvent || prisma.aiEvent;

  // 1. Database Persistence with Circuit Breaker Buffering
  try {
    if (aiEventModel) {
      savedEvent = await aiEventModel.create({
        data: eventPayload,
        include: {
          employee: { select: { id: true, name: true, employeeCode: true, designation: true } },
          camera: { select: { id: true, name: true, location: true } },
        },
      });
    }
  } catch (dbError) {
    console.warn("⚠️ DB Write failed for AIEvent. Storing in local memory buffer:", dbError.message);
    if (failureEventBuffer.length < MAX_BUFFER_SIZE) {
      failureEventBuffer.push(eventPayload);
    }
  }

  // 2. Real-time Stream Broadcast Payload
  const broadcastPayload = {
    id: savedEvent?.id || "temp_" + Date.now(),
    eventType,
    companyId,
    cameraId,
    employeeId,
    camera: savedEvent?.camera || null,
    employee: savedEvent?.employee || null,
    zoneType,
    confidenceScore,
    snapshotUrl,
    metadata,
    timestamp: savedEvent?.createdAt?.toISOString() || new Date().toISOString(),
  };

  // 3. Publish via Redis Broker (Pub/Sub Adapter)
  try {
    await publishToBroker("AI_EVENT_CHANNEL", broadcastPayload);
  } catch (brokerErr) {
    // Redis error handled gracefully inside broker
  }

  // 4. Direct Socket.IO Broadcast to Multi-Tenant Room
  try {
    const io = getIO();
    io.to(`company_${companyId}`).emit("AI_EVENT_STREAM", broadcastPayload);

    // Legacy Topic Emits for Backward Compatibility
    if (eventType === "CHECK_IN" || eventType === "CHECK_OUT") {
      io.to(`company_${companyId}`).emit("NEW_ATTENDANCE_PUNCH", broadcastPayload);
    } else if (eventType === "UNKNOWN_PERSON") {
      io.to(`company_${companyId}`).emit("UNKNOWN_PERSON_ALERT", broadcastPayload);
    } else if (eventType === "CAMERA_ONLINE" || eventType === "CAMERA_OFFLINE") {
      io.to(`company_${companyId}`).emit("CAMERA_STATUS_UPDATE", broadcastPayload);
    }
  } catch (socketErr) {
    console.warn("⚠️ Socket broadcast skipped:", socketErr.message);
  }

  return savedEvent || broadcastPayload;
};

module.exports = { publishAIEvent };