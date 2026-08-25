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
 * Calculates late arrival and daily work summary based on employee shift
 */
async function processDailyAttendanceForPunch(companyId, employeeId, punchTimestamp) {
  const punchDate = new Date(punchTimestamp);
  
  // Normalize to UTC start of day (00:00:00.000)
  const attendanceDate = new Date(
    Date.UTC(punchDate.getUTCFullYear(), punchDate.getUTCMonth(), punchDate.getUTCDate())
  );

  // 1. Fetch employee along with their shift snapshot
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

  if (!dailyRecord) {
    // First IN Punch of the day
    let status = "PRESENT";
    let lateByMinutes = 0;

    if (shift && shift.startTime) {
      const shiftStartMinutes = parseTimeToMinutes(shift.startTime);
      const gracePeriod = shift.gracePeriod || 15;
      const allowedTime = shiftStartMinutes + gracePeriod;

      if (punchMinutes > allowedTime) {
        status = "LATE";
        lateByMinutes = punchMinutes - shiftStartMinutes;
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
  } else {
    // Consecutive punch (Update lastOut and calculate total work duration)
    const firstIn = new Date(dailyRecord.firstIn);
    const lastOut = punchDate;
    const totalMinutes = Math.max(
      0,
      Math.floor((lastOut.getTime() - firstIn.getTime()) / (1000 * 60))
    );

    let status = dailyRecord.status;
    // If working minutes are less than 4 hours (240 mins), mark as HALF_DAY
    if (totalMinutes > 0 && totalMinutes < 240) {
      status = "HALF_DAY";
    } else if (totalMinutes >= 240 && dailyRecord.status !== "LATE") {
      status = "PRESENT";
    }

    let earlyExitMinutes = 0;
    if (shift && shift.endTime) {
      const shiftEndMinutes = parseTimeToMinutes(shift.endTime);
      if (punchMinutes < shiftEndMinutes) {
        earlyExitMinutes = shiftEndMinutes - punchMinutes;
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
  }

  return dailyRecord;
}

module.exports = {
  processDailyAttendanceForPunch,
};