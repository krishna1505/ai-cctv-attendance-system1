/**
 * Processes daily attendance status, late arrival, and working duration.
 */
function evaluateShiftStatus(firstIn, lastOut, shiftSnapshot) {
  if (!firstIn) {
    return {
      status: "ABSENT",
      lateByMinutes: 0,
      totalWorkMinutes: 0,
    };
  }

  let lateByMinutes = 0;
  let status = "PRESENT";

  if (shiftSnapshot && shiftSnapshot.startTime) {
    const [shiftHour, shiftMin] = shiftSnapshot.startTime.split(":").map(Number);
    const gracePeriod = shiftSnapshot.gracePeriod || 15;

    // Shift boundary calculation on firstIn date
    const shiftStartTime = new Date(firstIn);
    shiftStartTime.setHours(shiftHour, shiftMin, 0, 0);

    const diffMs = firstIn.getTime() - shiftStartTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes > gracePeriod) {
      status = "LATE";
      lateByMinutes = diffMinutes;
    }
  }

  let totalWorkMinutes = 0;
  if (lastOut && lastOut.getTime() > firstIn.getTime()) {
    const durationMs = lastOut.getTime() - firstIn.getTime();
    totalWorkMinutes = Math.floor(durationMs / (1000 * 60));
  }

  return {
    status,
    lateByMinutes: Math.max(0, lateByMinutes),
    totalWorkMinutes,
  };
}

module.exports = { evaluateShiftStatus };