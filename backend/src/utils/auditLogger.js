const prisma = require("../config/prisma");

/**
 * Creates an immutable audit log entry for admin/tenant actions
 */
const logAuditAction = async ({
  companyId,
  adminUserId = null,
  action,
  entityType,
  entityId = null,
  ipAddress = null,
  details = null,
}) => {
  try {
    return await prisma.auditLog.create({
      data: {
        companyId,
        adminUserId,
        action,
        entityType,
        entityId,
        ipAddress,
        details,
      },
    });
  } catch (err) {
    console.error(`[AuditLog Error] Failed to write audit trail for ${action}:`, err.message);
    return null;
  }
};

module.exports = { logAuditAction };