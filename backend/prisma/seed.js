const prisma = require("../src/config/prisma");
const bcrypt = require("bcryptjs");

async function main() {
  // 1. Create Default Company
  const company = await prisma.company.upsert({
    where: { code: "TECH001" },
    update: {},
    create: {
      name: "Tech Corp AI",
      code: "TECH001",
      timezone: "Asia/Kolkata",
      address: "Bangalore, India",
      status: "ACTIVE",
      hrmsBaseUrl: "https://hrms.company.com/api/v1",
      hrmsDeviceKey: "device_key_sample_123",
      hrmsCompanyId: "HRMS-COMP-01",
    },
  });

  // 2. Hash Password (password: admin123)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("admin123", salt);

  // 3. Create Default Admin User
  const admin = await prisma.adminUser.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      companyId: company.id,
      email: "admin@company.com",
      passwordHash: passwordHash,
      role: "COMPANY_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Seed completed successfully!");
  console.log("Company Created ID:", company.id);
  console.log("Admin User Created:", admin.email);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });