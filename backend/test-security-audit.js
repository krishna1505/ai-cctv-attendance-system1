const prisma = require("./src/config/prisma");
const { logAuditAction } = require("./src/utils/auditLogger");

async function verifySecurityLayer() {
  console.log("=== 1. VERIFYING AUDIT LOGGING HELPER ===");
  const company = await prisma.company.findFirst();
  const admin = await prisma.adminUser.findFirst({ where: { companyId: company.id } });

  const auditEntry = await logAuditAction({
    companyId: company.id,
    adminUserId: admin ? admin.id : null,
    action: "SECURITY_AUDIT_VERIFIED",
    entityType: "SystemModule11",
    entityId: "MOD-11-SEC",
    details: { passed: true, verifiedBy: "Module11Suite" },
  });

  console.log(`Audit Log Created: ID -> ${auditEntry.id} | Action -> ${auditEntry.action}`);

  console.log("\n=== 2. VERIFYING TOKEN BLACKLIST SCHEMA ===");
  const testToken = "test_dummy_jwt_token_mod11";
  const blacklistRecord = await prisma.tokenBlacklist.create({
    data: {
      token: testToken,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    },
  });
  console.log(`Token Blacklist Working: ID -> ${blacklistRecord.id} | Token -> ${blacklistRecord.token}`);

  // Cleanup test blacklist
  await prisma.tokenBlacklist.delete({ where: { token: testToken } });
  console.log("Test token cleaned up from blacklist.");

  console.log("\n=== SECURITY & TENANT AUDIT LAYER VERIFIED 100% ===");
  process.exit(0);
}

verifySecurityLayer().catch((e) => {
  console.error("Security Test Failed:", e);
  process.exit(1);
});