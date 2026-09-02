"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogIn,
  Loader2,
  Camera,
  Calendar,
  ChevronRight,
  Sparkles,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api";
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

interface DashboardMetrics {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  currentlyInside: number;
  attendanceTrend?: Array<{ day: string; present: number; late: number; absent: number }>;
  deptBreakdown?: Array<{ name: string; count: number }>;
  trends?: {
    totalEmployees: number;
    presentToday: number;
    lateToday: number;
    absentToday: number;
    currentlyInside: number;
  };
  insights?: string[];
  zoneOccupancy?: Array<{ name: string; val: number }>;
}

interface CameraItem {
  id: string;
  name: string;
  status: string;
}

interface AIEventItem {
  id: string;
  event_type: string;
  employee?: { name: string };
  camera?: { name: string };
  timestamp: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899'];

export default function DashboardPage() {
  const [adminName, setAdminName] = useState("Admin");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [events, setEvents] = useState<AIEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Picker State
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  useEffect(() => {
    const savedUser = localStorage.getItem("staffpie_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.name) setAdminName(parsed.name.split(" ")[0]);
      } catch (e) {
        console.error(e);
      }
    }

    async function loadDashboard() {
      setLoading(true);
      const [statsRes, camRes, evtRes] = await Promise.all([
        fetchWithAuth<DashboardMetrics>(`/api/analytics/company?date=${selectedDate}`).catch(() => ({ success: false, data: null })),
        fetchWithAuth<CameraItem[]>("/api/cameras").catch(() => ({ success: false, data: [] })),
        fetchWithAuth<AIEventItem[]>("/api/ai-events?limit=5").catch(() => ({ success: false, data: [] })),
      ]);

      if (statsRes.success && statsRes.data) setMetrics(statsRes.data);
      if (camRes.success && camRes.data) setCameras(camRes.data);
      if (evtRes.success && evtRes.data) setEvents(evtRes.data);

      setLoading(false);
    }

    loadDashboard();
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center text-slate-400">
          <Loader2 size={32} className="animate-spin mb-4 text-indigo-600" />
          <p className="font-medium">Loading workforce intelligence...</p>
        </div>
      </div>
    );
  }

  // Format date for header based on selectedDate
  const dateObj = new Date(selectedDate);
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  const formattedDate = dateObj.toLocaleDateString('en-US', dateOptions);

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto bg-[#F8FAFC]">
      {/* 1. Top Header Area */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">DASHBOARD</p>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Good morning, {adminName} <span className="inline-block origin-bottom-right hover:animate-wave">👋</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Here's what's happening with your workforce today.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition">
            <Calendar size={16} className="text-slate-400 absolute left-4 pointer-events-none" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-7 pr-2 bg-transparent border-none outline-none text-slate-700 cursor-pointer font-bold w-[140px] [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-700 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Live
          </div>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Employees */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-violet-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Total Employees</span>
              <p className="text-3xl font-black text-slate-900 mt-1">{metrics?.totalEmployees ?? 0}</p>
            </div>
          </div>
          <div className="relative z-10 mt-4 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            ↑ {metrics?.trends?.totalEmployees ?? 0}% from last week
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Present Today</span>
              <p className="text-3xl font-black text-slate-900 mt-1">{metrics?.presentToday ?? 0}</p>
            </div>
          </div>
          <div className="relative z-10 mt-4 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            ↑ {metrics?.trends?.presentToday ?? 0}% from yesterday
          </div>
        </div>

        {/* Late Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Late Today</span>
              <p className="text-3xl font-black text-slate-900 mt-1">{metrics?.lateToday ?? 0}</p>
            </div>
          </div>
          <div className="relative z-10 mt-4 text-[11px] font-semibold text-rose-500 flex items-center gap-1">
            ↓ {metrics?.trends?.lateToday ?? 0}% from yesterday
          </div>
        </div>

        {/* Absent Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-rose-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Absent Today</span>
              <p className="text-3xl font-black text-slate-900 mt-1">{metrics?.absentToday ?? 0}</p>
            </div>
          </div>
          <div className="relative z-10 mt-4 text-[11px] font-semibold text-rose-500 flex items-center gap-1">
            ↑ {metrics?.trends?.absentToday ?? 0}% from yesterday
          </div>
        </div>

        {/* Currently Inside */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <LogIn size={20} />
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Currently Inside</span>
              <p className="text-3xl font-black text-slate-900 mt-1">{metrics?.currentlyInside ?? 0}</p>
            </div>
          </div>
          <div className="relative z-10 mt-4 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            ↑ {metrics?.trends?.currentlyInside ?? 0}% right now
          </div>
        </div>
      </div>

      {/* 3. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-900">Attendance Trend</h2>
            <select className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 cursor-pointer">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
          </div>
          <div className="h-64">
            {metrics?.attendanceTrend && metrics.attendanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="present" name="Present" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="late" name="Late" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="absent" name="Absent" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <p className="text-sm font-medium">No trend data available</p>
                <p className="text-xs mt-1">Attendance records will appear here.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
          <h2 className="text-base font-bold text-slate-900 mb-2">Department-wise Attendance</h2>
          <div className="h-64 relative">
            {metrics?.deptBreakdown && metrics.deptBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.deptBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {metrics.deptBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900">{metrics.totalEmployees}</span>
                  <span className="text-xs text-slate-500 font-medium">Employees</span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                 <p className="text-sm font-medium">No department data</p>
              </div>
            )}
          </div>
          {/* Custom Legend */}
          {metrics?.deptBreakdown && (
            <div className="grid grid-cols-2 gap-2 mt-2">
               {metrics.deptBreakdown.map((dept, idx) => (
                 <div key={dept.name} className="flex items-center justify-between text-xs">
                   <div className="flex items-center gap-1.5">
                     <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                     <span className="text-slate-600 font-medium truncate w-20">{dept.name}</span>
                   </div>
                   <span className="font-bold text-slate-900">{dept.count}</span>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Live Feeds & Events Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-900">Live Camera Feeds</h2>
            <Link href="/cameras" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View All</Link>
          </div>
          
          {cameras.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No active IP cameras configured. Provision RTSP streams in Camera Management.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cameras.map((cam, idx) => (
                <div key={cam.id} className="group cursor-pointer">
                  <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative mb-2 shadow-sm border border-slate-200">
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <span className="text-xs text-slate-500 font-medium">No Feed URL</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                      <Camera size={14} className="text-white/70" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-800 truncate">{cam.name}</span>
                    <span className={`flex items-center gap-1 text-[10px] font-bold ${cam.status === 'ACTIVE' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cam.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      {cam.status === 'ACTIVE' ? 'Live' : 'Offline'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-900">Recent AI Events</h2>
            <Link href="/ai-events" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View All</Link>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {events.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No live AI detections reported yet.
              </div>
            ) : (
              events.map((evt, idx) => (
                <div key={evt.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs uppercase">
                      {evt.employee?.name ? evt.employee.name.charAt(0) : "?"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{evt.employee?.name || "Unknown Face"}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '00:00'}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      evt.event_type?.includes('IN') ? 'bg-emerald-50 text-emerald-700' : 
                      evt.event_type?.includes('CHANGE') ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'
                    }`}>
                      {evt.event_type?.replace('_', ' ') || 'UNKNOWN'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium truncate max-w-[80px]">
                      {evt.camera?.name || "--"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. Insights & Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><Sparkles size={14}/></span>
              Today's Insights
            </h3>
            {metrics?.insights && metrics.insights.length > 0 ? (
              <ul className="space-y-3 text-xs">
                {metrics.insights.map((insight, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-indigo-500 mt-0.5">●</span>
                    <span className="text-slate-600">{insight}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-full flex items-center text-xs text-slate-400 mt-2">
                No new insights generated.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Zone Occupancy</h3>
          <div className="space-y-3">
            {metrics?.zoneOccupancy && metrics.zoneOccupancy.length > 0 ? (
              metrics.zoneOccupancy.map((z, idx) => (
                <div key={z.name || idx}>
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>{z.name}</span>
                    <span>{z.val}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${z.val}%` }}></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center text-xs text-slate-400 h-12">
                No zone occupancy data available.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><Activity size={14}/></span>
            System Status
          </h3>
          <ul className="space-y-3 text-xs font-medium">
            <li className="flex justify-between items-center">
              <span className="text-slate-600">AI Engine</span>
              <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-600">Cameras</span>
              <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 24/28 Online</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-600">Database</span>
              <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Healthy</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-slate-600">HRMS Sync</span>
              <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Connected</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-5 rounded-2xl shadow-md text-white relative overflow-hidden group cursor-pointer flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
             <div className="w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
               <Sparkles size={20} className="text-indigo-50" />
            </div>
            <h3 className="text-lg font-black leading-tight mb-1">Smarter Workforce<br/>with AI</h3>
            <p className="text-[11px] text-indigo-100 font-medium">Real-time visibility. Higher productivity. A safer workplace.</p>
          </div>
          <Link href="/ai-events" className="relative z-10 w-full mt-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 backdrop-blur-sm">
             View AI Analytics <ChevronRight size={14} />
          </Link>
        </div>

      </div>

    </div>
  );
}