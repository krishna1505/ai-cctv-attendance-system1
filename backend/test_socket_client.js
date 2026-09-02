const { io } = require("socket.io-client");

// Server URL
const socket = io("http://localhost:5000");

// Test Company ID
const COMPANY_ID = "87e3f6bf-e4e1-4481-af99-68e6c06fdd4c";

socket.on("connect", () => {
  console.log(`\n Connected to Socket.IO Server with ID: ${socket.id}`);
  
  // 1. Join Company Room
  socket.emit("join-company", COMPANY_ID);
  console.log(`📡 Listening for live events in: company_${COMPANY_ID}...\n`);
});

// 2. Listen for Real-Time Attendance Punches
socket.on("NEW_ATTENDANCE_PUNCH", (data) => {
  console.log(" [REAL-TIME EVENT RECEIVED] NEW_ATTENDANCE_PUNCH:");
  console.log(JSON.stringify(data, null, 2));
});

// 3. Listen for Unknown/Low-Confidence Face Alerts
socket.on("UNKNOWN_PERSON_ALERT", (data) => {
  console.log(" [SECURITY ALERT] UNKNOWN_PERSON_ALERT:");
  console.log(JSON.stringify(data, null, 2));
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from Socket.IO Server");
});
// 4. Listen for Camera Online / Offline Heartbeat Events
socket.on("CAMERA_STATUS_UPDATE", (data) => {
  console.log("\n📷 [CAMERA STATUS EVENT RECEIVED] CAMERA_STATUS_UPDATE:");
  console.log(JSON.stringify(data, null, 2));
});