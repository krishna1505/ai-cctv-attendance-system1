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

// Doc-Mandated Exact Route Alias for HRMS Integration
app.use("/integrations/hrms", hrmsIntegrationRoutes);

// 4. Global Error Handler Boundary (Failure Handling Matrix)
app.use((err, req, res, next) => {
  console.error("[Global Error Boundary]:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error occurred",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

module.exports = app;