const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const companyRoutes = require("./routes/company.routes");
const employeeRoutes = require("./routes/employee.routes");
const cameraRoutes = require("./routes/camera.routes");
const zoneRoutes = require("./routes/zone.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const reportRoutes = require("./routes/report.routes");
const aiEventRoutes = require("./routes/aiEvent.routes");
const hrmsIntegrationRoutes = require("./routes/hrmsIntegration.routes");
const settingsRoutes = require("./routes/settings.routes");
const syncRoutes = require("./routes/sync.routes"); // 👈 Added: HRMS Sync dashboard and trigger routes

const app = express();

// 1. Core Global Middlewares
app.use(cors());
app.use(express.json());

// 2. Base Health Check Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI CCTV Attendance System API is running",
  });
});

// 3. Consolidated API Resource Groups (Doc-Aligned)
app.use("/api/auth", authRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/cameras", cameraRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/ai-events", aiEventRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/hrms", hrmsIntegrationRoutes);
app.use("/api/settings", settingsRoutes);

// Frontend-aligned Route Aliases
app.use("/api/integrations/hrms", hrmsIntegrationRoutes);
app.use("/integrations/hrms", hrmsIntegrationRoutes);
app.use("/api/ai-events", require("./routes/aiEvent.routes"));
app.use("/api/reports", require("./routes/report.routes"));
app.use("/api/analytics", require("./routes/analytics.routes"));
// 👈 Added: Mount syncRoutes so /api/integrations/hrms/dashboard & /trigger work seamlessly
app.use("/api/integrations/hrms", syncRoutes);

// =========================================================================
// 4. StaffPie Mock Receiver: Hardware Device Punch (POST /api/v1/attendance/device/punch)
// Handles outbound worker queues without requiring physical external HRMS server
// =========================================================================
app.post("/api/v1/attendance/device/punch", (req, res) => {
  const { employeeCode, deviceId, eventType, timestamp } = req.body || {};
  const deviceKey = req.headers["x-device-key"];
  const companyId = req.headers["x-company-id"];

  console.log(
    `📡 [Mock StaffPie Receiver] Punch Received -> Emp: ${employeeCode || "N/A"} | Device: ${deviceId || "N/A"} | Event: ${eventType || "auto"}`
  );

  return res.status(200).json({
    success: true,
    message: "Punch acknowledged and registered into StaffPie Official Attendance",
    data: {
      attendanceId: "att_mock_" + Date.now(),
      employeeCode,
      deviceId,
      deviceKeyValid: Boolean(deviceKey),
      companyId,
      timestamp: timestamp || new Date().toISOString(),
    },
  });
});

// 5. Global Error Handler Boundary (Failure Handling Matrix)
app.use((err, req, res, next) => {
  console.error("[Global Error Boundary]:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error occurred",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

module.exports = app;