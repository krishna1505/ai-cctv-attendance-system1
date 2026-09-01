const prisma = require("../config/prisma");

/**
 * Parses time string like "09:00" or "09:30:00" into minutes from midnight
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Strict Literal Spec Zone-Aware Attendance State Machine (Module 6)
 * - Check-In: Allowed ONLY on ENTRANCE (or default OFFICE for unmapped perimeter)
 * - Check-Out: Allowed STRICTLY on EXIT or departure at ENTRANCE
 */
async function processDailyAttendanceForPunch(
  companyId,
  employeeId,
  punchTimestamp,
  zoneType = "OFFICE"
) {
  const punchDate = new Date(punchTimestamp);

  // Normalize to UTC start of day (00:00:00.000)
  const attendanceDate = new Date(
    Date.UTC(punchDate.getUTCFullYear(), punchDate.getUTCMonth(), punchDate.getUTCDate())
  );

  // 1. Fetch employee along with shift snapshot
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId },
    include: { shiftSnapshot: true },
  });

  if (!employee) return null;

  // 2. Fetch or create DailyAttendance record for today
  let dailyRecord = await prisma.dailyAttendance.findUnique({
    where: {
      companyId_employeeId_attendanceDate: {
        companyId,
        employeeId,
        attendanceDate,
      },
    },
  });

  const shift = employee.shiftSnapshot;
  const punchMinutes = punchDate.getUTCHours() * 60 + punchDate.getUTCMinutes();

  // =========================================================================
  // RULE 1: First Check-In Punch of Day
  // Allowed ONLY on ENTRANCE zone (or default fallback OFFICE)
  // =========================================================================
  if (!dailyRecord) {
    const isAllowedEntryZone = zoneType === "ENTRANCE" || zoneType === "OFFICE";
    if (!isAllowedEntryZone) {
      console.warn(
        `[ATTENDANCE BLOCKED] First punch for ${employeeId} rejected: Not at ENTRANCE (Zone: ${zoneType})`
      );
      return null;
    }

    let status = "PRESENT";
    let lateByMinutes = 0;

    if (shift && shift.startTime) {
      const shiftStartMinutes = parseTimeToMinutes(shift.startTime);
      const gracePeriod = shift.gracePeriod || 15;
      const allowedTime = shiftStartMinutes + gracePeriod;

      if (punchMinutes > allowedTime) {
        status = "LATE";
        lateByMinutes = Math.max(0, punchMinutes - shiftStartMinutes);
      }
    }

    dailyRecord = await prisma.dailyAttendance.create({
      data: {
        companyId,
        employeeId,
        attendanceDate,
        firstIn: punchDate,
        lastOut: punchDate,
        totalWorkMinutes: 0,
        status,
        lateByMinutes,
        earlyExitMinutes: 0,
      },
    });

    return dailyRecord;
  }

  // =========================================================================
  // RULE 2: Check-Out / Exit Updates (Literal Spec Match)
  // Update lastOut STRICTLY on perimeter EXIT or ENTRANCE zones
  // =========================================================================
  const isExitZone = zoneType === "EXIT" || zoneType === "ENTRANCE";
  const firstIn = new Date(dailyRecord.firstIn);
  let lastOut = new Date(dailyRecord.lastOut);

  if (isExitZone && punchDate > lastOut) {
    lastOut = punchDate;
  }

  const totalMinutes = Math.max(
    0,
    Math.floor((lastOut.getTime() - firstIn.getTime()) / (1000 * 60))
  );

  let status = dailyRecord.status;
  if (totalMinutes > 0 && totalMinutes < 240) {
    status = "HALF_DAY";
  } else if (totalMinutes >= 240) {
    status = dailyRecord.lateByMinutes > 0 ? "LATE" : "PRESENT";
  }

  let earlyExitMinutes = 0;
  if (shift && shift.endTime && isExitZone) {
    const shiftEndMinutes = parseTimeToMinutes(shift.endTime);
    const lastOutMinutes = lastOut.getUTCHours() * 60 + lastOut.getUTCMinutes();
    if (lastOutMinutes < shiftEndMinutes) {
      earlyExitMinutes = shiftEndMinutes - lastOutMinutes;
    }
  }

  dailyRecord = await prisma.dailyAttendance.update({
    where: { id: dailyRecord.id },
    data: {
      lastOut,
      totalWorkMinutes: totalMinutes,
      status,
      earlyExitMinutes,
    },
  });

  return dailyRecord;
}

module.exports = {
  processDailyAttendanceForPunch,
  parseTimeToMinutes,
};