// const prisma = require("../src/config/prisma");
// const bcrypt = require("bcryptjs");

// async function main() {
//   // 1. Create Default Company
//   const company = await prisma.company.upsert({
//     where: { code: "TECH001" },
//     update: {},
//     create: {
//       name: "Tech Corp AI",
//       code: "TECH001",
//       timezone: "Asia/Kolkata",
//       address: "Bangalore, India",
//       status: "ACTIVE",
//       hrmsBaseUrl: "https://hrms.company.com/api/v1",
//       hrmsDeviceKey: "device_key_sample_123",
//       hrmsCompanyId: "HRMS-COMP-01",
//     },
//   });

//   // 2. Hash Password (password: admin123)
//   const salt = await bcrypt.genSalt(10);
//   const passwordHash = await bcrypt.hash("admin123", salt);

//   // 3. Create Default Admin User
//   const admin = await prisma.adminUser.upsert({
//     where: { email: "admin@company.com" },
//     update: {},
//     create: {
//       companyId: company.id,
//       email: "admin@company.com",
//       passwordHash: passwordHash,
//       role: "COMPANY_ADMIN",
//       status: "ACTIVE",
//     },
//   });

//   console.log("Seed completed successfully!");
//   console.log("Company Created ID:", company.id);
//   console.log("Admin User Created:", admin.email);
// }

// main()
//   .catch((e) => {
//     console.error("Seed error:", e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
const prisma = require("../src/config/prisma");
const bcrypt = require("bcryptjs");

async function main() {
  console.log("Starting StaffPie DB Seeding...");

  // 1. Upsert Default Company & Nested HRMS Integration
  const company = await prisma.company.upsert({
    where: { code: "TECH001" },
    update: {
      confidenceThreshold: 0.85,
      eventRetentionDays: 14,
    },
    create: {
      name: "Tech Corp AI",
      code: "TECH001",
      timezone: "Asia/Kolkata",
      address: "Bangalore, India",
      status: "ACTIVE",
      confidenceThreshold: 0.85,
      eventRetentionDays: 14,
      hrmsIntegration: {
        create: {
          baseUrl: "https://hrms.company.com/api/v1",
          deviceKeyEncrypted: "enc_device_key_sample_123",
          status: "ACTIVE",
        },
      },
    },
  });

  // 2. Hash Password (admin123)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("admin123", salt);

  // 3. Upsert Default Admin User
  const admin = await prisma.adminUser.upsert({
    where: { email: "admin@company.com" },
    update: {
      passwordHash: passwordHash,
      status: "ACTIVE",
    },
    create: {
      companyId: company.id,
      email: "admin@company.com",
      passwordHash: passwordHash,
      role: "COMPANY_ADMIN",
      status: "ACTIVE",
    },
  });

  // 4. Upsert Department
  const dept = await prisma.department.upsert({
    where: {
      companyId_name: {
        companyId: company.id,
        name: "Information Technology",
      },
    },
    update: {
      status: "ACTIVE",
    },
    create: {
      companyId: company.id,
      name: "Information Technology",
      hrmsDepartmentId: "HRMS_DEPT_IT_01",
      status: "ACTIVE",
    },
  });

  // 5. Upsert Seed Employees
  const emp1 = await prisma.employee.upsert({
    where: {
      companyId_employeeCode: {
        companyId: company.id,
        employeeCode: "JASEMP10340",
      },
    },
    update: {
      name: "Krishna Mohan Yadav",
      hrmsEmployeeId: "HRMS_EMP_10340",
      departmentId: dept.id,
      designation: "Software Developer Intern",
      status: "ACTIVE",
    },
    create: {
      companyId: company.id,
      hrmsEmployeeId: "HRMS_EMP_10340",
      employeeCode: "JASEMP10340",
      name: "Krishna Mohan Yadav",
      departmentId: dept.id,
      designation: "Software Developer Intern",
      status: "ACTIVE",
    },
  });

  const emp2 = await prisma.employee.upsert({
    where: {
      companyId_employeeCode: {
        companyId: company.id,
        employeeCode: "JASEMP10239",
      },
    },
    update: {
      name: "Shivam Singh",
      hrmsEmployeeId: "HRMS_EMP_10239",
      departmentId: dept.id,
      designation: "Software Developer Intern",
      status: "ACTIVE",
    },
    create: {
      companyId: company.id,
      hrmsEmployeeId: "HRMS_EMP_10239",
      employeeCode: "JASEMP10239",
      name: "Shivam Singh",
      departmentId: dept.id,
      designation: "Software Developer Intern",
      status: "ACTIVE",
    },
  });

  // 6. Upsert Spatial Zone
  const zone = await prisma.zone.upsert({
    where: { id: "zone_main_entrance_01" },
    update: {
      name: "Main Entrance",
      type: "ENTRANCE",
      status: "ACTIVE",
    },
    create: {
      id: "zone_main_entrance_01",
      companyId: company.id,
      name: "Main Entrance",
      type: "ENTRANCE",
      status: "ACTIVE",
    },
  });

  // 7. Upsert Camera
  const camera = await prisma.camera.upsert({
    where: { id: "cam_main_entrance_01" },
    update: {
      name: "CAM_MAIN_ENTRANCE_01",
      location: "Ground Floor - Main Gate",
      rtspUrl: "rtsp://admin:admin123@192.168.1.101:554/stream1",
      status: "ACTIVE",
    },
    create: {
      id: "cam_main_entrance_01",
      companyId: company.id,
      name: "CAM_MAIN_ENTRANCE_01",
      location: "Ground Floor - Main Gate",
      rtspUrl: "rtsp://admin:admin123@192.168.1.101:554/stream1",
      status: "ACTIVE",
    },
  });

  // 8. Map Camera to Zone (CameraZone junction)
  await prisma.cameraZone.upsert({
    where: {
      cameraId_zoneId: {
        cameraId: camera.id,
        zoneId: zone.id,
      },
    },
    update: {},
    create: {
      cameraId: camera.id,
      zoneId: zone.id,
    },
  });

  console.log("------------------------------------------");
  console.log("Full DB Seed completed successfully!");
  console.log("Company:", company.name, `(${company.id})`);
  console.log("Admin User:", admin.email);
  console.log("Employees:", emp1.name, ",", emp2.name);
  console.log("Zone:", zone.name);
  console.log("Camera:", camera.name);
  console.log("------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });