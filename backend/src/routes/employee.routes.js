const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  getEmployees,
  getEmployeeById,
  getDepartments,
  syncEmployeesFromHRMS,
} = require("../controllers/employee.controller");

// Base path already "/api/employees" hai app.js me
router.get("/", verifyToken, getEmployees);
router.get("/departments", verifyToken, getDepartments);
router.post("/sync", verifyToken, syncEmployeesFromHRMS);
router.get("/:id", verifyToken, getEmployeeById);

module.exports = router;