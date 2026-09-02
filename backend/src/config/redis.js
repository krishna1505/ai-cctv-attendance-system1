const EventEmitter = require("events");

class EventBroker extends EventEmitter {}
const localEventBus = new EventBroker();

let redisPublisher = null;
let redisSubscriber = null;
let isRedisConnected = false;

// Optional: Redis URL from ENV
const REDIS_URL = process.env.REDIS_URL || null;

const initRedisPubSub = (io) => {
  if (!REDIS_URL) {
    console.log("ℹ️ [Event Broker] REDIS_URL not set. Running in Single-Instance In-Memory Event Mode.");
    return;
  }

  try {
    const Redis = require("ioredis");
    redisPublisher = new Redis(REDIS_URL, { maxRetriesPerRequest: 3, enableOfflineQueue: false });
    redisSubscriber = new Redis(REDIS_URL, { maxRetriesPerRequest: 3, enableOfflineQueue: false });

    redisPublisher.on("connect", () => {
      isRedisConnected = true;
      console.log("⚡ [Redis Pub/Sub] Publisher connected to Redis cluster");
    });

    redisPublisher.on("error", (err) => {
      isRedisConnected = false;
      console.warn("⚠️ [Redis Pub/Sub] Redis connection failed, falling back to local memory bus:", err.message);
    });

    redisSubscriber.subscribe("AI_EVENT_CHANNEL", (err) => {
      if (!err) console.log("📡 [Redis Pub/Sub] Subscribed to AI_EVENT_CHANNEL");
    });

    redisSubscriber.on("message", (channel, message) => {
      if (channel === "AI_EVENT_CHANNEL" && io) {
        try {
          const event = JSON.parse(message);
          io.to(`company_${event.companyId}`).emit("AI_EVENT_STREAM", event);
        } catch (e) {
          console.error("Redis message parse error:", e.message);
        }
      }
    });
  } catch (error) {
    console.warn("⚠️ ioredis not installed or failed to initialize. Running in Local Memory Mode.");
  }
};

const publishToBroker = async (channel, eventData) => {
  if (isRedisConnected && redisPublisher) {
    try {
      await redisPublisher.publish(channel, JSON.stringify(eventData));
      return true;
    } catch (err) {
      console.warn("⚠️ Redis publish failed, falling back to local bus:", err.message);
    }
  }
  // Local Event Bus Fallback
  localEventBus.emit(channel, eventData);
  return false;
};

module.exports = { initRedisPubSub, publishToBroker, localEventBus, isRedisConnected: () => isRedisConnected };