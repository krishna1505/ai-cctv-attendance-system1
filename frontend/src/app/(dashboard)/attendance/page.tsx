"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Coffee,
  Calendar,
  Filter,
  Download,
  Eye,
  MoreHorizontal,
  Loader2,
  Sparkles,
  Camera,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { fetchWithAuth } from "@/lib/api";
import Link from "next/link";

interface AnalyticsMetrics {
  totalEmployees: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  attendanceTrend?: Array<{ day: string; present: number; late: number; absent: number }>;
}

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  department?: { name: string };
  shiftSnapshot?: string;
}

interface DailyAttendance {
  id: string;
  employeeId: string;
  status: string;
  firstIn: string | null;
  lastOut: string | null;
  totalWorkMinutes: number;
  employee: Employee;
}

interface AIEvent {
  id: string;
  employee?: { name: string };
  camera?: { name: string; location?: string };
  timestamp: string;
  confidenceScore: number;
}

const COLORS = ['#6366F1', '#0EA5E9', '#F43F5E', '#10B981', '#F59E0B'];

export default function AIAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [dailyRecords, setDailyRecords] = useState<DailyAttendance[]>([]);
  const [recentLogs, setRecentLogs] = useState<AIEvent[]>([]);
  
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [deptFilter, setDeptFilter] = useState("All departments");
  const [shiftFilter, setShiftFilter] = useState("All shifts");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      const [analyticsRes, summaryRes, logsRes] = await Promise.all([
        fetchWithAuth<any>(`/api/analytics/company?date=${selectedDate}`).catch(() => ({ success: false, data: null })),
        fetchWithAuth<any>(`/api/attendance/daily-summary?date=${selectedDate}`).catch(() => ({ success: false, data: [] })),
        fetchWithAuth<any>(`/api/attendance/logs?date=${selectedDate}`).catch(() => ({ success: false, data: [] }))
      ]);

      if (analyticsRes.success && analyticsRes.data) {
        setMetrics(analyticsRes.data);
      }
      
      if (summaryRes.success && summaryRes.data) {
        setDailyRecords(summaryRes.data);
      } else {
        setDailyRecords([]);
      }

      if (logsRes.success && logsRes.data) {
        setRecentLogs(logsRes.data);
      } else {
        setRecentLogs([]);
      }

      setLoading(false);
    }

    loadData();
  }, [selectedDate]);

  // Aggregate Shift-wise data
  const shiftCounts: Record<string, number> = {};
  dailyRecords.forEach(record => {
    const shift = record.employee?.shiftSnapshot || 'General';
    shiftCounts[shift] = (shiftCounts[shift] || 0) + 1;
  });
  
  const shiftChartData = Object.keys(shiftCounts).map(key => ({
    name: key,
    value: shiftCounts[key]
  }));

  // Filter Table Data
  const filteredRecords = dailyRecords.filter(record => {
    const matchesSearch = record.employee?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          record.employee?.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === "All departments" || record.employee?.department?.name === deptFilter;
    const matchesShift = shiftFilter === "All shifts" || (record.employee?.shiftSnapshot || "General") === shiftFilter;
    const matchesStatus = statusFilter === "All statuses" || record.status === statusFilter.toUpperCase();
    return matchesSearch && matchesDept && matchesShift && matchesStatus;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, deptFilter, shiftFilter, statusFilter]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    if (filteredRecords.length === 0) {
      alert("No data to export");
      return;
    }
    
    // Create CSV content
    const headers = ["Employee ID", "Name", "Department", "Shift", "Check-In", "Check-Out", "Status", "Total Minutes"];
    const rows = filteredRecords.map(r => [
      r.employee.employeeCode,
      r.employee.name,
      r.employee.department?.name || "General",
      r.employee.shiftSnapshot || "General",
      r.firstIn ? new Date(r.firstIn).toLocaleTimeString() : "--",
      r.lastOut ? new Date(r.lastOut).toLocaleTimeString() : "--",
      r.status,
      r.totalWorkMinutes.toString()
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const latestLog = recentLogs.length > 0 ? recentLogs[0] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center text-slate-400">
          <Loader2 size={32} className="animate-spin mb-4 text-indigo-600" />
          <p className="font-medium">Loading AI Attendance data...</p>
        </div>
      </div>
    );
  }

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "--";
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const dateObj = new Date(selectedDate);
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  const formattedDate = dateObj.toLocaleDateString('en-US', dateOptions);

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto bg-[#F8FAFC]">
      {/* 1. Top Header Area */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">AI ATTENDANCE</p>
          <h1 className="text-3xl font-extrabold text-slate-900">
            AI Attendance
          </h1>
          <p className="text-sm text-slate-500 mt-1">Real-time attendance tracking powered by AI</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition">
            <Calendar size={16} className="text-slate-400 absolute left-4 pointer-events-none" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-7 pr-2 bg-transparent border-none outline-none text-slate-700 cursor-pointer font-bold w-[140px] [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>
          
          <select 
            className="text-sm font-medium bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 shadow-sm cursor-pointer"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option>All departments</option>
            <option>Engineering</option>
            <option>Sales</option>
            <option>Marketing</option>
            <option>HR</option>
          </select>

          <select 
            className="text-sm font-medium bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 shadow-sm cursor-pointer"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
          >
            <option>All shifts</option>
            <option>Morning</option>
            <option>General</option>
            <option>Night</option>
            <option>Flexible</option>
          </select>

          <button onClick={handleExport} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition">
            <FileText size={16} /> Generate Report
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Present */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <div className="w-12 h-8 flex items-end justify-between">
               <div className="w-2 h-4 bg-emerald-100 rounded-t-sm"></div>
               <div className="w-2 h-6 bg-emerald-200 rounded-t-sm"></div>
               <div className="w-2 h-8 bg-emerald-400 rounded-t-sm"></div>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500">Present</span>
            <p className="text-3xl font-black text-slate-900 mt-1">{metrics?.presentCount ?? 0}</p>
          </div>
          <div className="mt-4 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            Live Tracking
          </div>
        </div>

        {/* Late */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div className="w-12 h-8 flex items-end justify-between">
               <div className="w-2 h-3 bg-orange-100 rounded-t-sm"></div>
               <div className="w-2 h-5 bg-orange-200 rounded-t-sm"></div>
               <div className="w-2 h-6 bg-orange-400 rounded-t-sm"></div>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500">Late</span>
            <p className="text-3xl font-black text-slate-900 mt-1">{metrics?.lateCount ?? 0}</p>
          </div>
          <div className="mt-4 text-[11px] font-semibold text-orange-500 flex items-center gap-1">
            Live Tracking
          </div>
        </div>

        {/* Absent */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500">Absent</span>
            <p className="text-3xl font-black text-slate-900 mt-1">{metrics?.absentCount ?? 0}</p>
          </div>
          <div className="mt-4 text-[11px] font-semibold text-rose-500 flex items-center gap-1">
            Live Tracking
          </div>
        </div>

        {/* On Break */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Coffee size={20} />
            </div>
            <div className="w-12 h-8 flex items-end justify-between">
               <div className="w-2 h-5 bg-blue-100 rounded-t-sm"></div>
               <div className="w-2 h-3 bg-blue-200 rounded-t-sm"></div>
               <div className="w-2 h-7 bg-blue-400 rounded-t-sm"></div>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500">On Break</span>
            <p className="text-3xl font-black text-slate-900 mt-1">0</p>
          </div>
          <div className="mt-4 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            Data from zone occupancy
          </div>
        </div>
      </div>

      {/* 3. Charts & Live Feed Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-900">Attendance Trend</h2>
            <select className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 cursor-pointer">
              <option>Last 7 days</option>
            </select>
          </div>
          <div className="h-[250px]">
            {metrics?.attendanceTrend && metrics.attendanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="present" name="Present" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="late" name="Late" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="absent" name="Absent" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <p className="text-sm font-medium">No trend data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Shift-wise Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative flex flex-col">
          <h2 className="text-base font-bold text-slate-900 mb-2">Shift-wise Attendance</h2>
          <div className="flex-1 relative mt-4 min-h-[200px]">
            {shiftChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={shiftChartData}
                      cx="40%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {shiftChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingRight: '20%' }}>
                  <span className="text-2xl font-black text-slate-900">{dailyRecords.length}</span>
                  <span className="text-[10px] text-slate-500 font-medium">Total Present</span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                 <p className="text-sm font-medium">No shift data</p>
              </div>
            )}
          </div>
          {/* Custom Legend */}
          {shiftChartData.length > 0 && (
            <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-3">
               {shiftChartData.map((shift, idx) => (
                 <div key={shift.name} className="flex flex-col">
                   <div className="flex items-center gap-1.5 mb-0.5">
                     <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                     <span className="text-slate-600 font-medium text-xs">{shift.name}</span>
                   </div>
                   <span className="text-[10px] text-slate-400 font-bold ml-3.5">
                      {shift.value} ({(shift.value / dailyRecords.length * 100).toFixed(0)}%)
                   </span>
                 </div>
               ))}
            </div>
          )}
        </div>

        {/* Live Recognition Feed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-slate-900">Live Recognition</h2>
            <Link href="/ai-events" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View All</Link>
          </div>
          <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-inner mb-4 flex-1">
             <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Live
             </div>
             {latestLog ? (
               <div className="w-full h-full relative">
                 {/* Simulated face box */}
                 <div className="absolute top-[20%] left-[40%] w-[20%] h-[40%] border-2 border-emerald-400 rounded-md">
                   <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] font-bold px-1 py-0.5 rounded shadow-sm whitespace-nowrap">
                     {latestLog.employee?.name || "Unknown"}
                   </div>
                 </div>
               </div>
             ) : (
               <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                 <Camera size={16} className="mr-2" /> No active stream
               </div>
             )}
          </div>
          {latestLog ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                  {latestLog.employee?.name ? latestLog.employee.name.charAt(0) : "?"}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{latestLog.employee?.name || "Unknown"}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{latestLog.employee ? "EMP" + latestLog.id.substring(0,4).toUpperCase() : "UNVERIFIED"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900">{formatTime(latestLog.timestamp)}</p>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Check-in</span>
              </div>
            </div>
          ) : (
            <div className="text-center text-xs text-slate-400">Waiting for detections...</div>
          )}
        </div>
      </div>

      {/* 4. Bottom Row: Table & Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Detailed Attendance Table */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between bg-slate-50/50">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
               <input 
                 type="text"
                 placeholder="Search by name, employee ID..."
                 className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
               <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
            </div>
            
            <div className="flex gap-2">
              {showFilters && (
                <select 
                  className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option>All statuses</option>
                  <option>Present</option>
                  <option>Late</option>
                  <option>Absent</option>
                  <option>Half_day</option>
                </select>
              )}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-semibold transition ${
                  showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter size={14} /> Filter
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4 w-10 text-center"><input type="checkbox" className="rounded border-slate-300" /></th>
                  <th className="p-4">Employee ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Shift</th>
                  <th className="p-4">Check-In</th>
                  <th className="p-4">Check-Out</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Last Seen</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 text-center"><input type="checkbox" className="rounded border-slate-300" /></td>
                      <td className="p-4 text-xs font-semibold text-slate-700">{record.employee.employeeCode}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                            {record.employee.name.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-slate-900 whitespace-nowrap">{record.employee.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-slate-600 font-medium">{record.employee.department?.name || "General"}</td>
                      <td className="p-4 text-xs text-slate-600 font-medium">{record.employee.shiftSnapshot || "General"}</td>
                      <td className="p-4 text-xs font-bold text-slate-700">{formatTime(record.firstIn)}</td>
                      <td className="p-4 text-xs font-bold text-slate-700">{formatTime(record.lastOut)}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                          ${record.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700' : 
                            record.status === 'LATE' ? 'bg-orange-50 text-orange-700' : 
                            record.status === 'HALF_DAY' ? 'bg-blue-50 text-blue-700' :
                            'bg-rose-50 text-rose-700'}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500 font-medium">{formatTime(record.lastOut || record.firstIn)}</td>
                      <td className="p-4 flex justify-center gap-2">
                        <button onClick={() => alert(`View details for ${record.employee.name}`)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition"><Eye size={14} /></button>
                        <button className="p-1.5 text-slate-400 hover:text-slate-900 transition"><MoreHorizontal size={14} /></button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-sm text-slate-400">
                      No attendance records found for this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 text-xs text-slate-500 font-medium flex justify-between items-center bg-slate-50/50">
            <span>Showing {(currentPage - 1) * itemsPerPage + (filteredRecords.length > 0 ? 1 : 0)} - {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} employees</span>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded shadow-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button className="px-2.5 py-1 bg-indigo-600 border border-indigo-600 rounded shadow-sm text-white">
                {currentPage}
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded shadow-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Recent Events & Promo Box */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-bold text-slate-900">Recent Attendance Events</h2>
              <Link href="/ai-events" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View All</Link>
            </div>
            <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 flex-1">
              {recentLogs.length > 0 ? recentLogs.map((log) => (
                <div key={log.id} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase shrink-0">
                      {log.employee?.name ? log.employee.name.charAt(0) : "?"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex gap-2 items-center">
                        {log.employee?.name || "Unknown"}
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Check-in</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
                        {log.id.substring(0,8)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">{formatTime(log.timestamp)}</p>
                    <p className="text-[9px] text-slate-500 font-medium truncate max-w-[70px]">{log.camera?.name || "Main Cam"}</p>
                  </div>
                </div>
              )) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No recent events.
                </div>
              )}
            </div>
          </div>

          {/* Promo Banner */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-start gap-4 relative overflow-hidden">
             <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 z-10">
               <Sparkles size={20} />
             </div>
             <div className="z-10">
               <h3 className="text-sm font-bold text-slate-900 mb-1">AI-Powered Attendance</h3>
               <p className="text-[10px] text-slate-600 leading-relaxed mb-3">
                 Accurate. Secure. Automated. Face recognition powered attendance with real-time sync to HRMS.
               </p>
               <button className="text-[11px] font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">
                 Learn More →
               </button>
             </div>
             <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                <Users size={120} />
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}