let aiServiceState = {
  isHealthy: true,
  lastPingAt: new Date(),
  consecutiveFailures: 0,
};

const recordAIServicePing = () => {
  aiServiceState.isHealthy = true;
  aiServiceState.lastPingAt = new Date();
  aiServiceState.consecutiveFailures = 0;
};

const recordAIServiceFailure = () => {
  aiServiceState.consecutiveFailures += 1;
  if (aiServiceState.consecutiveFailures >= 3) {
    aiServiceState.isHealthy = false;
  }
};

const getAIServiceStatus = () => {
  const now = new Date();
  const diffSeconds = (now.getTime() - aiServiceState.lastPingAt.getTime()) / 1000;
  return {
    isHealthy: aiServiceState.isHealthy && diffSeconds < 60,
    lastPingAt: aiServiceState.lastPingAt,
    secondsSinceLastPing: Math.floor(diffSeconds),
  };
};

module.exports = { recordAIServicePing, recordAIServiceFailure, getAIServiceStatus };