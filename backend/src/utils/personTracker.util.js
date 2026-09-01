const trackingBuffer = new Map();

const shouldProcessPersonDetection = (companyId, employeeId, windowSeconds = 10) => {
  const key = `${companyId}_${employeeId}`;
  const now = Date.now();
  const lastSeen = trackingBuffer.get(key);

  if (lastSeen && now - lastSeen < windowSeconds * 1000) {
    return false;
  }

  trackingBuffer.set(key, now);
  return true;
};

module.exports = { shouldProcessPersonDetection };