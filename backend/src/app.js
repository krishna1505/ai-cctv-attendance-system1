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

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI CCTV Attendance System API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/company", companyRoutes);
app.use("/api", employeeRoutes);
app.use("/api", cameraRoutes);
app.use("/api", zoneRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", reportRoutes);

module.exports = app;