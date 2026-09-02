const prisma = require("../config/prisma");
const { logAuditAction } = require("../utils/auditLogger");

// In-Memory Fallback Buffer for DB/Redis Down scenarios
const LOCAL_EVENT_BUFFER = [];
const MAX_LOCAL_BUFFER_SIZE = 500;

class CircuitBreaker {
  constructor(name, failureThreshold = 3, cooldownMs = 10000) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
  }

  async execute(action, fallbackAction) {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.cooldownMs) {
        this.state = "HALF_OPEN";
      } else {
        return fallbackAction ? fallbackAction() : { error: `${this.name} circuit OPEN. Skipping gracefully.` };
      }
    }

    try {
      const result = await action();
      this.reset();
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      if (this.failureCount >= this.failureThreshold) {
        this.state = "OPEN";
      }
      return fallbackAction ? fallbackAction(err) : { error: err.message };
    }
  }

  reset() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }
}

const dbCircuitBreaker = new CircuitBreaker("DatabaseCircuit");
const aiServiceCircuitBreaker = new CircuitBreaker("AIServiceCircuit");

/**
 * 1. Camera Offline Handling (Mark status, alert, skip gracefully)
 */
async function handleCameraFailure(cameraId, companyId, errorReason = "Stream unreachable") {
  try {
    const updated = await prisma.camera.update({
      where: { id: cameraId },
      data: { status: "OFFLINE", lastPingAt: new Date() },
    });

    await logAuditAction({
      companyId,
      action: "CAMERA_OFFLINE_ALERT",
      entityType: "Camera",
      entityId: cameraId,
      details: { reason: errorReason, status: "OFFLINE" },
    });

    return { status: "OFFLINE_RECORDED", alertSent: true, camera: updated };
  } catch (err) {
    return { status: "ERROR", message: err.message };
  }
}

/**
 * 2. AI Service Down Handling (Queue/skip frames gracefully, resume on recovery)
 */
async function dispatchToAIService(frameData, fallbackCallback) {
  return await aiServiceCircuitBreaker.execute(
    async () => {
      // Simulate remote AI Service call
      if (process.env.SIMULATE_AI_DOWN === "true") {
        throw new Error("AI Service unresponsive (503 Service Unavailable)");
      }
      return { success: true, recognized: true };
    },
    (err) => {
      // Graceful queue/skip fallback
      if (LOCAL_EVENT_BUFFER.length < MAX_LOCAL_BUFFER_SIZE) {
        LOCAL_EVENT_BUFFER.push({ type: "RAW_FRAME", timestamp: new Date(), frameId: frameData?.id });
      }
      return {
        status: "BUFFERED_GRACEFULLY",
        circuitState: aiServiceCircuitBreaker.state,
        bufferSize: LOCAL_EVENT_BUFFER.length,
        message: "AI service down. Frame queued/skipped gracefully.",
      };
    }
  );
}

/**
 * 3. Redis/DB Down Handling (Circuit breaker + Local in-memory buffering)
 */
async function recordResilientEvent(eventData) {
  return await dbCircuitBreaker.execute(
    async () => {
      return await prisma.aIEvent.create({ data: eventData });
    },
    (err) => {
      // Buffer locally when DB is down
      if (LOCAL_EVENT_BUFFER.length < MAX_LOCAL_BUFFER_SIZE) {
        LOCAL_EVENT_BUFFER.push({ type: "AI_EVENT", payload: eventData, bufferedAt: new Date() });
      }
      return {
        status: "LOCAL_BUFFERED",
        circuitState: dbCircuitBreaker.state,
        bufferedCount: LOCAL_EVENT_BUFFER.length,
        message: "DB unreachable. Event buffered in local memory.",
      };
    }
  );
}

module.exports = {
  CircuitBreaker,
  handleCameraFailure,
  dispatchToAIService,
  recordResilientEvent,
  LOCAL_EVENT_BUFFER,
};