const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  getEmployees,
  getEmployeeById,
  getDepartments,
  syncEmployeesFromHRMS,
  createEmployee,
  updateEmployee,
  deleteEmployee
} = require("../controllers/employee.controller");

// Base path already "/api/employees" hai app.js me
router.get("/", verifyToken, getEmployees);
router.post("/", verifyToken, createEmployee);
router.get("/departments", verifyToken, getDepartments);
router.post("/sync", verifyToken, syncEmployeesFromHRMS);
router.get("/:id", verifyToken, getEmployeeById);
router.put("/:id", verifyToken, updateEmployee);
router.delete("/:id", verifyToken, deleteEmployee);

module.exports = router;