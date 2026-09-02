const prisma = require("../config/prisma");

// GET /api/employees (Scoped to company)
const getEmployees = async (req, res) => {
  try {
    const { companyId } = req.user;

    const employees = await prisma.employee.findMany({
      where: { companyId },
      include: {
        department: { select: { id: true, name: true } },
        shiftSnapshot: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error("Fetch employees error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/employees/:id
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const employee = await prisma.employee.findFirst({
      where: { id, companyId },
      include: {
        department: true,
        shiftSnapshot: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Fetch employee by ID error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/departments
const getDepartments = async (req, res) => {
  try {
    const { companyId } = req.user;

    const departments = await prisma.department.findMany({
      where: { companyId, status: "ACTIVE" },
      include: {
        _count: { select: { employees: true } },
      },
    });

    return res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error("Fetch departments error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/employees/sync (Pulls data from HRMS or Seeds initial mirror)
const syncEmployeesFromHRMS = async (req, res) => {
  try {
    const { companyId } = req.user;

    // 1. Ensure Default Department exists
    const dept = await prisma.department.upsert({
      where: {
        companyId_name: {
          companyId,
          name: "Engineering",
        },
      },
      update: {},
      create: {
        companyId,
        name: "Engineering",
        hrmsDepartmentId: "HRMS-DEPT-01",
      },
    });

    // 2. Ensure Shift exists
    const shift = await prisma.shiftSnapshot.upsert({
      where: {
        companyId_hrmsShiftId: {
          companyId,
          hrmsShiftId: "SHIFT-GEN-01",
        },
      },
      update: {},
      create: {
        companyId,
        hrmsShiftId: "SHIFT-GEN-01",
        name: "General Shift",
        startTime: "09:30",
        endTime: "18:30",
        gracePeriod: 15,
      },
    });

    // 3. Upsert Sample Employees synced from HRMS
    const sampleHRMSEmployees = [
      {
        hrmsEmployeeId: "HRMS-EMP-101",
        employeeCode: "EMP101",
        name: "Rahul Sharma",
        designation: "Senior Software Engineer",
        faceProfileRef: "face_vec_sample_101",
      },
      {
        hrmsEmployeeId: "HRMS-EMP-102",
        employeeCode: "EMP102",
        name: "Anjali Gupta",
        designation: "Frontend Developer",
        faceProfileRef: "face_vec_sample_102",
      },
    ];

    for (const emp of sampleHRMSEmployees) {
      await prisma.employee.upsert({
        where: {
          companyId_hrmsEmployeeId: {
            companyId,
            hrmsEmployeeId: emp.hrmsEmployeeId,
          },
        },
        update: {
          name: emp.name,
          designation: emp.designation,
          lastSyncedAt: new Date(),
        },
        create: {
          companyId,
          hrmsEmployeeId: emp.hrmsEmployeeId,
          employeeCode: emp.employeeCode,
          name: emp.name,
          designation: emp.designation,
          departmentId: dept.id,
          shiftSnapshotId: shift.id,
          faceProfileRef: emp.faceProfileRef,
          lastSyncedAt: new Date(),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "HRMS sync executed successfully",
      syncedAt: new Date(),
    });
  } catch (error) {
    console.error("Sync error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/employees
const createEmployee = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { employeeCode, name, email, mobile, designation, departmentName, status } = req.body;

    if (!employeeCode || !name) {
      return res.status(400).json({ success: false, message: "Employee Code and Name are required" });
    }

    const hrmsEmployeeId = `LOCAL-EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let departmentId = null;
    if (departmentName) {
      const dept = await prisma.department.upsert({
        where: { companyId_name: { companyId, name: departmentName } },
        update: {},
        create: { companyId, name: departmentName }
      });
      departmentId = dept.id;
    }

    const employee = await prisma.employee.create({
      data: {
        companyId,
        hrmsEmployeeId,
        employeeCode,
        name,
        email,
        mobile,
        designation,
        departmentId,
        status: status || "ACTIVE",
      },
      include: {
        department: { select: { id: true, name: true } }
      }
    });

    return res.status(201).json({ success: true, data: employee });
  } catch (error) {
    console.error("Create employee error:", error);
    if (error.code === 'P2002') {
        return res.status(400).json({ success: false, message: "Employee code must be unique" });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PUT /api/employees/:id
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    const { employeeCode, name, email, mobile, designation, departmentName, status } = req.body;

    // Verify ownership
    const existing = await prisma.employee.findFirst({ where: { id, companyId } });
    if (!existing) {
        return res.status(404).json({ success: false, message: "Employee not found" });
    }

    let departmentId = undefined;
    if (departmentName) {
      const dept = await prisma.department.upsert({
        where: { companyId_name: { companyId, name: departmentName } },
        update: {},
        create: { companyId, name: departmentName }
      });
      departmentId = dept.id;
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(employeeCode && { employeeCode }),
        ...(name && { name }),
        email,
        mobile,
        designation,
        ...(status && { status }),
        ...(departmentId !== undefined && { departmentId })
      },
      include: {
        department: { select: { id: true, name: true } }
      }
    });

    return res.status(200).json({ success: true, data: employee });
  } catch (error) {
    console.error("Update employee error:", error);
    if (error.code === 'P2002') {
        return res.status(400).json({ success: false, message: "Employee code must be unique" });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/employees/:id
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const existing = await prisma.employee.findFirst({ where: { id, companyId } });
    if (!existing) {
        return res.status(404).json({ success: false, message: "Employee not found" });
    }

    await prisma.employee.delete({
      where: { id }
    });

    return res.status(200).json({ success: true, message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Delete employee error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  getDepartments,
  syncEmployeesFromHRMS,
  createEmployee,
  updateEmployee,
  deleteEmployee
};