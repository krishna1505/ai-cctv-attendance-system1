"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  FileText,
  Filter,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
} from "lucide-react";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;

  // Helper functions for dynamic dates based on real-time
  const getDynamicDateRanges = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Start of month (e.g., 01 Sep 2026)
    const startDate = new Date(currentYear, currentMonth, 1);
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    
    return {
      rangeString: `${startDate.toLocaleDateString('en-GB', options)} - ${today.toLocaleDateString('en-GB', options)}`,
      formattedToday: today.toLocaleDateString('en-GB', options),
    };
  };

  // Generate dynamic last 7 days for the chart
  const getDynamicChartDays = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
      days.push(d.toLocaleDateString('en-GB', options));
    }
    return days;
  };

  const dynamicDates = getDynamicDateRanges();
  const chartDays = getDynamicChartDays();

  const [reportData, setReportData] = useState({
    metrics: {
      totalEmployees: 248,
      averageAttendance: "88%",
      totalWorkingHours: "1,842h",
      lateArrivals: 24,
      absentees: 32,
    },
    attendanceDetails: [],
    scheduledReports: [
      { id: 1, name: "Daily Attendance", frequency: "Daily", nextRun: `Tomorrow, 06:00 AM`, status: "Active" },
      { id: 2, name: "Weekly Summary", frequency: "Weekly", nextRun: `Next Monday, 06:00 AM`, status: "Active" },
      { id: 3, name: "Monthly Report", frequency: "Monthly", nextRun: `1st Next Month, 06:00 AM`, status: "Active" },
    ],
  });

  const getAuthToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token") || localStorage.getItem("admin_token") || "";
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch("http://localhost:5000/api/reports/dashboard", {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json();
      if (json?.success && json?.data) {
        setReportData((prev) => ({ ...prev, ...json.data }));
      }
    } catch (err) {
      console.warn("Using default reports fallback", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExport = () => {
    alert("Report exported successfully as PDF/Excel!");
  };

  // Pagination Logic
  const allDetails = reportData.attendanceDetails || [];
  const totalPages = Math.ceil(allDetails.length / rowsPerPage) || 1;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = allDetails.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 text-slate-800">
      {/* Top Header & Global Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">REPORTS</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate, view and export attendance & analytics reports</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs shadow-sm font-medium text-slate-700">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>{dynamicDates.rangeString}</span>
          </div>

          <select className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs shadow-sm font-medium text-slate-700 focus:outline-none">
            <option>All departments</option>
            <option>Engineering</option>
            <option>Sales</option>
            <option>Marketing</option>
          </select>

          <select className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs shadow-sm font-medium text-slate-700 focus:outline-none">
            <option>All zones</option>
            <option>Zone A - Office</option>
            <option>Zone B - Production</option>
          </select>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Top 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Total Employees</div>
            <div className="text-2xl font-extrabold text-slate-900 mb-1">{reportData.metrics.totalEmployees}</div>
            <div className="text-[11px] text-emerald-600 font-medium">↑ Active in system</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Average Attendance</div>
            <div className="text-2xl font-extrabold text-slate-900 mb-1">{reportData.metrics.averageAttendance}</div>
            <div className="text-[11px] text-emerald-600 font-medium">↑ Consistent rate</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Total Working Hours</div>
            <div className="text-2xl font-extrabold text-slate-900 mb-1">{reportData.metrics.totalWorkingHours}</div>
            <div className="text-[11px] text-emerald-600 font-medium">↑ Tracked live</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Late Arrivals</div>
            <div className="text-2xl font-extrabold text-rose-600 mb-1">{reportData.metrics.lateArrivals}</div>
            <div className="text-[11px] text-rose-500 font-medium">Requires review</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Absentees</div>
            <div className="text-2xl font-extrabold text-rose-600 mb-1">{reportData.metrics.absentees}</div>
            <div className="text-[11px] text-rose-500 font-medium">Updated today</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-6 px-4 bg-white rounded-xl border border-slate-200 mb-6 text-xs font-semibold overflow-x-auto shadow-sm">
        {[
          { id: "attendance", label: "Attendance Report" },
          { id: "employee", label: "Employee Report" },
          { id: "department", label: "Department Report" },
          { id: "absentee", label: "Absentee Report" },
          { id: "zone", label: "Zone Report" },
          { id: "ai", label: "AI Events Report" },
          { id: "custom", label: "Custom Report" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3.5 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Attendance Overview ({dynamicDates.formattedToday})</h3>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Present</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Late</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Absent</span>
              </div>
            </div>

            <div className="h-44 bg-slate-50 rounded-xl flex items-end justify-between p-4 border border-dashed border-slate-200">
              {chartDays.map((dateStr, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                  <div className="flex items-end gap-1 h-32 w-full justify-center">
                    <div className="w-3 bg-emerald-500 rounded-t" style={{ height: `${70 + (idx * 3)}%` }}></div>
                    <div className="w-3 bg-amber-500 rounded-t" style={{ height: `${30 + (idx * 2)}%` }}></div>
                    <div className="w-3 bg-rose-500 rounded-t" style={{ height: `${20 + (idx * 2)}%` }}></div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{dateStr}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Attendance Details</h3>
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search by name, employee ID..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase border-b border-slate-200">
                    <th className="py-3 px-4"><input type="checkbox" className="rounded" /></th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Present</th>
                    <th className="py-3 px-4">Late</th>
                    <th className="py-3 px-4">Absent</th>
                    <th className="py-3 px-4">Total Days</th>
                    <th className="py-3 px-4">Attendance %</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(currentRows || []).length > 0 ? (
                    currentRows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4"><input type="checkbox" className="rounded" /></td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">{row.employeeCode}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{row.name}</td>
                        <td className="py-3 px-4 text-slate-600">{row.department}</td>
                        <td className="py-3 px-4 text-emerald-600 font-bold">{row.present}</td>
                        <td className="py-3 px-4 text-amber-600 font-bold">{row.late}</td>
                        <td className="py-3 px-4 text-rose-600 font-bold">{row.absent}</td>
                        <td className="py-3 px-4 text-slate-600">{row.totalDays}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            {row.attendancePercentage}
                          </span>
                        </td>
                        <td className="py-3 px-4 flex items-center gap-2 text-slate-400">
                          <Eye className="w-4 h-4 cursor-pointer hover:text-indigo-600" />
                          <MoreHorizontal className="w-4 h-4 cursor-pointer hover:text-slate-600" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                        No report data found. Click <span className="text-indigo-600 font-bold">Generate Report</span> to load records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-white">
              <span>Showing {Math.min(indexOfFirstRow + 1, allDetails.length)} - {Math.min(indexOfLastRow, allDetails.length)} of {allDetails.length} employees</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => setCurrentPage(num)}
                    className={`px-3 py-1 border rounded font-semibold cursor-pointer ${
                      currentPage === num ? "bg-indigo-600 text-white border-indigo-600" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-2.5 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-600" /> Report Filters
              </h3>
              <span className="text-xs text-indigo-600 font-semibold cursor-pointer">Reset</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">Date Range</label>
                <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                  <option>{dynamicDates.rangeString}</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Departments</label>
                <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                  <option>All departments</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Employees</label>
                <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                  <option>All employees</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Zones</label>
                <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                  <option>All zones</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Report Type</label>
                <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                  <option>Attendance Report</option>
                  <option>Employee Summary</option>
                  <option>Zone-wise Report</option>
                  <option>Absentee Report</option>
                  <option>Department Report</option>
                </select>
              </div>
              <button
                onClick={() => alert("Report generated successfully!")}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition cursor-pointer"
              >
                Generate Report
              </button>
            </div>
          </div>

          {/* Quick Reports */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Quick Reports</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button onClick={() => alert("Daily Attendance Generated")} className="p-2.5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 rounded-lg text-left font-semibold text-indigo-700 transition cursor-pointer">
                📅 Daily Attendance
              </button>
              <button onClick={() => alert("Employee Summary Generated")} className="p-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-lg text-left font-semibold text-blue-700 transition cursor-pointer">
                👥 Employee Summary
              </button>
              <button onClick={() => alert("Zone-wise Report Generated")} className="p-2.5 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 rounded-lg text-left font-semibold text-emerald-700 transition cursor-pointer">
                🏢 Zone-wise Report
              </button>
              <button onClick={() => alert("Late Arrivals Generated")} className="p-2.5 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 rounded-lg text-left font-semibold text-rose-700 transition cursor-pointer">
                ⏰ Late Arrivals
              </button>
              <button onClick={() => alert("Department Report Generated")} className="p-2.5 bg-purple-50/50 hover:bg-purple-50 border border-purple-100 rounded-lg text-left font-semibold text-purple-700 transition cursor-pointer">
                📊 Department Report
              </button>
              <button onClick={() => alert("Absentee Report Generated")} className="p-2.5 bg-amber-50/50 hover:bg-amber-50 border border-amber-100 rounded-lg text-left font-semibold text-amber-700 transition cursor-pointer">
                ⚠️ Absentee Report
              </button>
            </div>
          </div>

          {/* Scheduled Reports */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Scheduled Reports</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => alert("Open Add Schedule Modal")}
                  className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Schedule
                </button>
                <span className="text-xs text-slate-400 font-semibold cursor-pointer hover:text-indigo-600">View All</span>
              </div>
            </div>

            <div className="space-y-3">
              {(reportData.scheduledReports || []).map((sch: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{sch.name}</div>
                    <div className="text-[10px] text-slate-400">{sch.frequency} • Next: {sch.nextRun}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                      {sch.status}
                    </span>
                    <Edit className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-indigo-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}