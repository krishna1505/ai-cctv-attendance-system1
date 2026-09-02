const prisma = require("../config/prisma");

/**
 * Per-Company Configurable Retention Policy Purge Worker
 * Purges raw high-frequency events (FACE_DETECTED, UNKNOWN_PERSON)
 * based on each company's configured retention threshold (clamped 7-30 days)
 */
const purgeOldAIEvents = async () => {
  try {
    const companies = await prisma.company.findMany({
      select: { id: true, name: true, eventRetentionDays: true },
    });

    let totalPurged = 0;
    const now = new Date();
    const aiEventModel = prisma.aIEvent || prisma.aiEvent;

    if (!aiEventModel) return;

    for (const company of companies) {
      // Clamped between 7 and 30 days per spec
      const retentionDays = Math.min(Math.max(company.eventRetentionDays || 15, 7), 30);
      
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deleted = await aiEventModel.deleteMany({
        where: {
          companyId: company.id,
          eventType: { in: ["FACE_DETECTED", "FACE_RECOGNIZED", "UNKNOWN_PERSON"] },
          createdAt: { lt: cutoffDate },
        },
      });

      if (deleted.count > 0) {
        totalPurged += deleted.count;
        console.log(`🧹 [Retention Policy] Purged ${deleted.count} raw events for "${company.name}" (Retention: ${retentionDays}d)`);
      }
    }

    console.log(`✅ [Retention Policy] Daily cleanup complete. Total purged records: ${totalPurged}`);
  } catch (error) {
    console.error("Retention Purge Error:", error.message);
  }
};

module.exports = { purgeOldAIEvents };