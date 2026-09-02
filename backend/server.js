const http = require("http");
const app = require("./src/app");
const { initSocket } = require("./src/config/socket");
const { initRedisPubSub } = require("./src/config/redis");
const { monitorCameraHeartbeats } = require("./src/services/cameraPingService");
const { purgeOldAIEvents } = require("./src/services/retentionService");

// Outbound HRMS Sync Queue Worker safe import
let startHrmsSyncWorker = () => {};
try {
  const workerModule = require("./src/workers/hrmsSyncWorker");
  startHrmsSyncWorker = workerModule.startHrmsSyncWorker || (() => {});
} catch (err) {
  console.warn("⚠️ HRMS Sync Worker not found or failed to load:", err.message);
}

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = initSocket(server);

// 1. Initialize Redis Pub/Sub with Fallback
initRedisPubSub(io);

// 2. Camera Heartbeat Monitor (30s interval)
setInterval(() => {
  monitorCameraHeartbeats();
}, 30000);

// 3. Per-Company Retention Purge Worker (Runs every 24 hours)
setInterval(() => {
  purgeOldAIEvents();
}, 24 * 60 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⚡ Socket.IO listening for real-time events`);
  console.log(`📷 Camera heartbeat monitoring worker started (30s interval)`);
  console.log(`🧹 Configurable retention purge worker registered (24h interval)`);

  // 4. Start Outbound HRMS Queue Worker
  startHrmsSyncWorker();
});