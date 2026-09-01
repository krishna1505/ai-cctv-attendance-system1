const prisma = require("../config/prisma");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const getCompanyId = (req) => req.companyId || req.user?.companyId || req.admin?.companyId;

// GET /api/reports/export?type=attendance|presence|desk|break|meeting|department|timeline&format=csv|json|excel|pdf
const exportReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { type = "attendance", date, startDate, endDate, departmentId, format = "csv" } = req.query;

    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized company scope" });
    }

    const start = startDate ? new Date(startDate) : (date ? new Date(date) : new Date());
    start.setUTCHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

    let headers = [];
    let rows = [];
    let rawData = [];
    let reportTitle = "";

    // ==========================================
    // 1. ATTENDANCE REPORT
    // ==========================================
    if (type === "attendance") {
      reportTitle = "Employee Attendance Report";
      headers = ["Emp Code", "Name", "Department", "Designation", "Date", "Status", "First In", "Last Out", "Work Min", "Late Min"];
      
      const records = await prisma.dailyAttendance.findMany({
        where: {
          companyId,
          attendanceDate: { gte: start, lte: end },
          ...(departmentId && { employee: { departmentId } }),
        },
        include: {
          employee: { include: { department: true } },
        },
        orderBy: { attendanceDate: "desc" },
      });

      rawData = records;
      rows = records.map((r) => [
        r.employee?.employeeCode || "--",
        r.employee?.name || "--",
        r.employee?.department?.name || "General",
        r.employee?.designation || "--",
        r.attendanceDate.toISOString().split("T")[0],
        r.status,
        r.firstIn ? new Date(r.firstIn).toTimeString().split(" ")[0] : "--",
        r.lastOut ? new Date(r.lastOut).toTimeString().split(" ")[0] : "--",
        String(r.totalWorkMinutes || 0),
        String(r.lateByMinutes || 0),
      ]);
    }

    // ==========================================
    // 2. PRESENCE & DESK REPORT
    // ==========================================
    else if (type === "presence" || type === "desk") {
      reportTitle = "Workforce Presence & Desk Report";
      headers = ["Emp Code", "Name", "Department", "Date", "Office (Hrs)", "Desk (Hrs)", "Break (Min)", "Meeting (Min)", "Away (Min)"];

      const analytics = await prisma.employeeDailyAnalytics.findMany({
        where: {
          companyId,
          date: { gte: start, lte: end },
        },
        include: { employee: { include: { department: true } } },
        orderBy: { date: "desc" },
      });

      rawData = analytics;
      rows = analytics.map((a) => [
        a.employee?.employeeCode || "--",
        a.employee?.name || "--",
        a.employee?.department?.name || "General",
        a.date.toISOString().split("T")[0],
        (a.officePresenceMin / 60).toFixed(1),
        (a.deskPresenceMin / 60).toFixed(1),
        String(a.breakMin || 0),
        String(a.meetingMin || 0),
        String(a.awayMin || 0),
      ]);
    }

    // ==========================================
    // 3. BREAK REPORT
    // ==========================================
    else if (type === "break") {
      reportTitle = "Break Sessions Report";
      headers = ["Emp Code", "Name", "Zone Name", "Start Time", "End Time", "Duration (Min)"];

      const breaks = await prisma.breakSession.findMany({
        where: {
          startTime: { gte: start, lte: end },
          employee: { companyId },
        },
        include: { employee: true, zone: true },
        orderBy: { startTime: "desc" },
      });

      rawData = breaks;
      rows = breaks.map((b) => [
        b.employee?.employeeCode || "--",
        b.employee?.name || "--",
        b.zone?.name || "Break Area",
        new Date(b.startTime).toTimeString().split(" ")[0],
        b.endTime ? new Date(b.endTime).toTimeString().split(" ")[0] : "--",
        String(b.durationMin || 0),
      ]);
    }

    // ==========================================
    // 4. MEETING REPORT
    // ==========================================
    else if (type === "meeting") {
      reportTitle = "Meeting Room Sessions Report";
      headers = ["Emp Code", "Name", "Meeting Room", "Start Time", "End Time", "Duration (Min)"];

      const meetings = await prisma.meetingSession.findMany({
        where: {
          startTime: { gte: start, lte: end },
          employee: { companyId },
        },
        include: { employee: true, zone: true },
        orderBy: { startTime: "desc" },
      });

      rawData = meetings;
      rows = meetings.map((m) => [
        m.employee?.employeeCode || "--",
        m.employee?.name || "--",
        m.zone?.name || "Meeting Room",
        new Date(m.startTime).toTimeString().split(" ")[0],
        m.endTime ? new Date(m.endTime).toTimeString().split(" ")[0] : "--",
        String(m.durationMin || 0),
      ]);
    }

    // ==========================================
    // 5. DEPARTMENT REPORT
    // ==========================================
    else if (type === "department") {
      reportTitle = "Department Staffing Report";
      headers = ["Department Name", "Total Active Staff", "Status"];

      const departments = await prisma.department.findMany({
        where: { companyId },
        include: { employees: { where: { status: "ACTIVE" } } },
      });

      rawData = departments;
      rows = departments.map((d) => [
        d.name,
        String(d.employees.length),
        d.status,
      ]);
    }

    // ==========================================
    // 6. TIMELINE AUDIT REPORT
    // ==========================================
    else if (type === "timeline") {
      reportTitle = "Attendance Events Timeline Audit";
      headers = ["Emp Code", "Name", "Event Type", "Zone", "Camera", "Timestamp", "Confidence Score"];

      const events = await prisma.attendanceEvent.findMany({
        where: {
          companyId,
          eventTimestamp: { gte: start, lte: end },
        },
        include: { employee: true, camera: true, zone: true },
        orderBy: { eventTimestamp: "desc" },
      });

      rawData = events;
      rows = events.map((ev) => [
        ev.employee?.employeeCode || "--",
        ev.employee?.name || "--",
        ev.eventType,
        ev.zone?.name || "N/A",
        ev.camera?.name || "--",
        ev.eventTimestamp.toISOString(),
        String(ev.confidenceScore || 0),
      ]);
    } else {
      return res.status(400).json({ success: false, message: "Invalid report type specified" });
    }

    const formatLower = format.toLowerCase();

    // 1. JSON
    if (formatLower === "json") {
      return res.status(200).json({
        success: true,
        count: rawData.length,
        reportTitle,
        headers,
        data: rawData,
      });
    }

    // 2. EXCEL (.xlsx via ExcelJS)
    if (formatLower === "excel" || formatLower === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(reportTitle.substring(0, 30));

      worksheet.columns = headers.map((h) => ({ header: h, key: h, width: 20 }));
      rows.forEach((r) => worksheet.addRow(r));

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FF000000" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${type}_report_${Date.now()}.xlsx`);

      await workbook.xlsx.write(res);
      return res.end();
    }

    // 3. NATIVE PDF (.pdf via PDFKit)
    if (formatLower === "pdf") {
      const doc = new PDFDocument({
        margin: 30,
        size: "A4",
        layout: headers.length > 6 ? "landscape" : "portrait",
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename=${type}_report_${Date.now()}.pdf`);

      doc.pipe(res);

      // Header Info
      doc.fontSize(16).font("Helvetica-Bold").text(reportTitle, { align: "left" });
      doc.fontSize(8).font("Helvetica").text(
        `Generated: ${new Date().toLocaleString()} | Scope: ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`,
        { align: "left" }
      );
      doc.moveDown(1.2);

      // Table Setup
      const pageWidth = doc.page.width - 60;
      const colWidth = pageWidth / headers.length;
      let startY = doc.y;

      // Table Header Row
      doc.rect(30, startY, pageWidth, 20).fill("#ececec");
      doc.fillColor("#000000").fontSize(8).font("Helvetica-Bold");

      headers.forEach((h, i) => {
        doc.text(h, 35 + i * colWidth, startY + 5, { width: colWidth - 5, align: "left" });
      });

      startY += 24;
      doc.font("Helvetica").fontSize(7.5);

      // Table Data Rows
      rows.forEach((row, rowIndex) => {
        if (startY > doc.page.height - 40) {
          doc.addPage();
          startY = 30;
        }

        if (rowIndex % 2 === 1) {
          doc.rect(30, startY - 2, pageWidth, 16).fill("#f9f9f9");
          doc.fillColor("#000000");
        }

        row.forEach((cell, i) => {
          doc.text(String(cell), 35 + i * colWidth, startY, { width: colWidth - 5, align: "left" });
        });

        startY += 16;
      });

      doc.end();
      return;
    }

    // 4. CSV Format
    let csv = headers.map((h) => `"${h}"`).join(",") + "\n";
    rows.forEach((row) => {
      csv += row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",") + "\n";
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${type}_report_${Date.now()}.csv`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error("Report Export Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  exportReport,
  generateAttendanceReport: exportReport,
};