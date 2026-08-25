const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  getEmployees,
  getEmployeeById,
  getDepartments,
  syncEmployeesFromHRMS,
} = require("../controllers/employee.controller");

router.get("/employees", verifyToken, getEmployees);
router.get("/employees/:id", verifyToken, getEmployeeById);
router.post("/employees/sync", verifyToken, syncEmployeesFromHRMS);
router.get("/departments", verifyToken, getDepartments);

module.exports = router;