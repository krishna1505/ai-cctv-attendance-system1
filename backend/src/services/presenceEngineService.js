const prisma = require("../config/prisma");

const AUTO_CLOSE_HOURS = 12; // Fallback: Auto close session after 12 hours if exit missed
const RAPID_HOP_DEBOUNCE_SEC = 30; // Zone transition debounce

/**
 * Stateful Dynamic Session Engine (Module 6 & 7 Complete Spec)
 */
const processPresenceAndZoneSessions = async ({
  companyId,
  employeeId,
  cameraId,
  punchTimestamp,
  confidenceScore = 0.0,
  snapshotUrl = null,
}) => {
  try {
    const timestamp = new Date(punchTimestamp);
    const dateOnly = new Date(
      Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate())
    );

    // 1. Identify Camera Zone
    const cameraZone = await prisma.cameraZone.findFirst({
      where: { cameraId },
      include: { zone: true },
    });

    const zone = cameraZone?.zone;
    const zoneType = zone?.type || "OFFICE";

    // 2. Determine State Machine Event (CHECK_IN, CHECK_OUT, ZONE_TRANSITION)
    let eventType = "ZONE_TRANSITION";
    if (zoneType === "ENTRANCE") eventType = "CHECK_IN";
    else if (zoneType === "EXIT") eventType = "CHECK_OUT";

    // 3. Log AttendanceEvent (Module 6 Spec)
    await prisma.attendanceEvent.create({
      data: {
        companyId,
        employeeId,
        cameraId,
        zoneId: zone?.id || null,
        eventType,
        eventTimestamp: timestamp,
        confidenceScore,
        snapshotUrl,
        hrmsSyncStatus: "PENDING",
      },
    });

    // 4. Overall Building PresenceSession (Open / Extend / Close)
    let presenceSession = await prisma.presenceSession.findFirst({
      where: { companyId, employeeId, date: dateOnly },
    });

    if (!presenceSession) {
      presenceSession = await prisma.presenceSession.create({
        data: {
          companyId,
          employeeId,
          firstSeen: timestamp,
          lastSeen: timestamp,
          totalPresenceMin: 0,
          date: dateOnly,
        },
      });
    } else {
      const firstSeen = new Date(presenceSession.firstSeen);
      const lastSeen = timestamp > new Date(presenceSession.lastSeen) ? timestamp : new Date(presenceSession.lastSeen);
      
      // Auto-close threshold check
      const diffHours = (lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60);
      const effectiveLastSeen = diffHours > AUTO_CLOSE_HOURS ? new Date(firstSeen.getTime() + AUTO_CLOSE_HOURS * 3600 * 1000) : lastSeen;
      const totalPresenceMin = Math.max(0, Math.floor((effectiveLastSeen.getTime() - firstSeen.getTime()) / (1000 * 60)));

      await prisma.presenceSession.update({
        where: { id: presenceSession.id },
        data: { lastSeen: effectiveLastSeen, totalPresenceMin },
      });
    }

    // 5. Stateful Dynamic Zone Sessions (Close previous open session, open new one)
    if (zone) {
      // Find latest unclosed zone session for this employee
      const latestZoneSession = await prisma.zoneSession.findFirst({
        where: { employeeId, exitTime: null },
        orderBy: { entryTime: "desc" },
      });

      if (latestZoneSession) {
        // If same zone within rapid-hop window, skip duplicate
        const diffSeconds = (timestamp.getTime() - new Date(latestZoneSession.entryTime).getTime()) / 1000;
        if (latestZoneSession.zoneId === zone.id && diffSeconds < RAPID_HOP_DEBOUNCE_SEC) {
          // Skip rapid duplicate in same zone
        } else {
          // Close previous session with actual elapsed time
          const durationMin = Math.max(1, Math.floor((timestamp.getTime() - new Date(latestZoneSession.entryTime).getTime()) / (1000 * 60)));
          await prisma.zoneSession.update({
            where: { id: latestZoneSession.id },
            data: {
              exitTime: timestamp,
              durationMin: Math.min(durationMin, AUTO_CLOSE_HOURS * 60),
            },
          });

          // If transitioning to exit, do not open a new zone session
          if (zoneType !== "EXIT") {
            await prisma.zoneSession.create({
              data: {
                employeeId,
                zoneId: zone.id,
                cameraId,
                entryTime: timestamp,
                exitTime: null,
                durationMin: 0,
              },
            });
          }
        }
      } else if (zoneType !== "EXIT") {
        // Open first zone session
        await prisma.zoneSession.create({
          data: {
            employeeId,
            zoneId: zone.id,
            cameraId,
            entryTime: timestamp,
            exitTime: null,
            durationMin: 0,
          },
        });
      }

      // Handle Specific Break & Meeting Sessions (Stateful Close/Open)
      if (zoneType === "BREAK_AREA" || zoneType === "CAFETERIA") {
        const openBreak = await prisma.breakSession.findFirst({
          where: { employeeId, endTime: null },
          orderBy: { startTime: "desc" },
        });
        if (!openBreak) {
          await prisma.breakSession.create({
            data: { employeeId, zoneId: zone.id, startTime: timestamp, endTime: null, durationMin: 0 },
          });
        }
      } else {
        // Close any pending break session
        const openBreak = await prisma.breakSession.findFirst({
          where: { employeeId, endTime: null },
          orderBy: { startTime: "desc" },
        });
        if (openBreak) {
          const durationMin = Math.max(1, Math.floor((timestamp.getTime() - new Date(openBreak.startTime).getTime()) / (1000 * 60)));
          await prisma.breakSession.update({
            where: { id: openBreak.id },
            data: { endTime: timestamp, durationMin },
          });
        }
      }

      if (zoneType === "MEETING_ROOM") {
        const openMeeting = await prisma.meetingSession.findFirst({
          where: { employeeId, endTime: null },
          orderBy: { startTime: "desc" },
        });
        if (!openMeeting) {
          await prisma.meetingSession.create({
            data: { employeeId, zoneId: zone.id, startTime: timestamp, endTime: null, durationMin: 0 },
          });
        }
      } else {
        // Close any pending meeting session
        const openMeeting = await prisma.meetingSession.findFirst({
          where: { employeeId, endTime: null },
          orderBy: { startTime: "desc" },
        });
        if (openMeeting) {
          const durationMin = Math.max(1, Math.floor((timestamp.getTime() - new Date(openMeeting.startTime).getTime()) / (1000 * 60)));
          await prisma.meetingSession.update({
            where: { id: openMeeting.id },
            data: { endTime: timestamp, durationMin },
          });
        }
      }
    }

    // 6. Aggregate Exact Daily Analytics (Real awayMin Calculation)
    await recalculateEmployeeDailyAnalytics(companyId, employeeId, dateOnly);
  } catch (error) {
    console.error("Dynamic Presence Engine Error:", error);
  }
};

/**
 * Recomputes Desk, Break, Meeting, and Away minutes dynamically
 */
const recalculateEmployeeDailyAnalytics = async (companyId, employeeId, dateOnly) => {
  const startOfDay = dateOnly;
  const endOfDay = new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000 - 1);

  const [presence, zoneSessions, breaks, meetings] = await Promise.all([
    prisma.presenceSession.findFirst({
      where: { companyId, employeeId, date: dateOnly },
    }),
    prisma.zoneSession.findMany({
      where: { employeeId, entryTime: { gte: startOfDay, lte: endOfDay } },
      include: { zone: true },
    }),
    prisma.breakSession.findMany({
      where: { employeeId, startTime: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.meetingSession.findMany({
      where: { employeeId, startTime: { gte: startOfDay, lte: endOfDay } },
    }),
  ]);

  const officePresenceMin = presence ? presence.totalPresenceMin : 0;

  let deskPresenceMin = 0;
  zoneSessions.forEach((zs) => {
    if (zs.zone?.type === "DESK" || zs.zone?.type === "OFFICE") {
      deskPresenceMin += zs.durationMin || 0;
    }
  });

  let breakMin = 0;
  breaks.forEach((b) => { breakMin += b.durationMin || 0; });

  let meetingMin = 0;
  meetings.forEach((m) => { meetingMin += m.durationMin || 0; });

  // Real awayMin = Total Presence - (Desk + Break + Meeting)
  const awayMin = Math.max(0, officePresenceMin - (deskPresenceMin + breakMin + meetingMin));

  await prisma.employeeDailyAnalytics.upsert({
    where: { companyId_employeeId_date: { companyId, employeeId, date: dateOnly } },
    update: {
      officePresenceMin,
      deskPresenceMin,
      breakMin,
      meetingMin,
      awayMin,
      firstSeen: presence?.firstSeen,
      lastSeen: presence?.lastSeen,
    },
    create: {
      companyId,
      employeeId,
      date: dateOnly,
      officePresenceMin,
      deskPresenceMin,
      breakMin,
      meetingMin,
      awayMin,
      firstSeen: presence?.firstSeen,
      lastSeen: presence?.lastSeen,
    },
  });
};

module.exports = {
  processPresenceAndZoneSessions,
  recalculateEmployeeDailyAnalytics,
};