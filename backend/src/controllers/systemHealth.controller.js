const { getAIServiceStatus } = require("../services/aiServiceHealth");
const { isRedisConnected } = require("../config/redis");

const getSystemHealth = async (req, res) => {
  const aiStatus = getAIServiceStatus();
  return res.status(200).json({
    success: true,
    services: {
      backend: "HEALTHY",
      redisPubSub: isRedisConnected() ? "CONNECTED" : "IN_MEMORY_FALLBACK",
      aiServiceEngine: aiStatus.isHealthy ? "ONLINE" : "OFFLINE_OR_UNREACHABLE",
    },
    telemetry: {
      lastAIPingAt: aiStatus.lastPingAt,
      secondsSinceLastAIPing: aiStatus.secondsSinceLastPing,
    },
  });
};

module.exports = { getSystemHealth };