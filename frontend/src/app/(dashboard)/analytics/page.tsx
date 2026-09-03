"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  Activity,
  MapPin,
  Video,
  ChevronRight,
} from "lucide-react";

export default function PresenceAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedZone, setSelectedZone] = useState("all");

  // Dynamic Metadata States from DB
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [zonesList, setZonesList] = useState<any[]>([]);

  const [analyticsData, setAnalyticsData] = useState({
    metrics: {
      totalPeopleDetected: 186,
      averageDwellTime: "5h 18m",
      peakOccupancy: 92,
      workspaceUtilization: "68%",
    },
    zoneOccupancy: [],
    recentZoneActivity: [],
    topActiveAreas: [],
  });

  // Helper for dynamic current formatted date (e.g. "Thu, 3 Sep 2026")
  const getFormattedCurrentDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return today.toLocaleDateString('en-GB', options);
  };

  const [currentDateStr, setCurrentDateStr] = useState("");

  useEffect(() => {
    setCurrentDateStr(getFormattedCurrentDate());
  }, []);

  const getAuthToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token") || localStorage.getItem("admin_token") || "";
  };

  // Fetch Departments & Zones Metadata for Dropdowns
  const fetchMetadata = async () => {
    try {
      const token = getAuthToken();
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      const [deptRes, zonesRes] = await Promise.all([
        fetch("http://localhost:5000/api/employees", { headers }), // or department endpoint if available
        fetch("http://localhost:5000/api/zones", { headers })
      ]);

      const zonesJson = await zonesRes.json();
      if (zonesJson?.success) setZonesList(zonesJson.data || zonesJson.zones || []);

      // Fallback departments if specialized endpoint isn't standalone
      setDepartmentsList([
        { id: "eng", name: "Engineering" },
        { id: "sales", name: "Sales" },
        { id: "mkt", name: "Marketing" },
        { id: "hr", name: "HR" },
        { id: "fin", name: "Finance" },
      ]);
    } catch (err) {
      console.warn("Could not fetch analytics filter metadata", err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch("http://localhost:5000/api/analytics/dashboard", {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json();
      if (json?.success && json?.data) {
        setAnalyticsData(json.data);
      }
    } catch (err) {
      console.warn("Using fallback analytics data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchMetadata();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 text-slate-800">
      {/* Top Header & Global Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">PRESENCE ANALYTICS</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Presence Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Understand workspace utilization and real-time presence insights</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs shadow-sm font-medium text-slate-700">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>{currentDateStr || "Loading..."}</span>
          </div>

          <select 
            value={selectedDepartment} 
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs shadow-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All departments</option>
            {departmentsList.map((d: any) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          <select 
            value={selectedZone} 
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs shadow-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All zones</option>
            {zonesList.map((z: any) => (
              <option key={z.id} value={z.name}>{z.name}</option>
            ))}
          </select>

          <button onClick={() => alert("Exporting Presence Analytics...")} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Total People Detected</div>
            <div className="text-3xl font-extrabold text-slate-900 mb-1">{analyticsData.metrics.totalPeopleDetected}</div>
            <div className="text-xs text-emerald-600 font-medium">↑ Real-time count</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Average Dwell Time</div>
            <div className="text-3xl font-extrabold text-slate-900 mb-1">{analyticsData.metrics.averageDwellTime}</div>
            <div className="text-xs text-emerald-600 font-medium">↑ Optimal engagement</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Peak Occupancy</div>
            <div className="text-3xl font-extrabold text-slate-900 mb-1">{analyticsData.metrics.peakOccupancy}</div>
            <div className="text-xs text-emerald-600 font-medium">↑ Recorded today</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Workspace Utilization</div>
            <div className="text-3xl font-extrabold text-indigo-600 mb-1">{analyticsData.metrics.workspaceUtilization}</div>
            <div className="text-xs text-emerald-600 font-medium">↑ High efficiency</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Row 1: Presence Trend & Zone Occupancy & Live Presence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Presence Trend Chart Box */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Presence Trend</h3>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-600"></span> Total</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Inside</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Visitors</span>
            </div>
          </div>
          <div className="h-48 bg-slate-50 rounded-xl flex items-end justify-between p-4 border border-dashed border-slate-200">
            {["6 AM", "8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM"].map((time, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                <div className="w-2.5 bg-indigo-600 rounded-t" style={{ height: `${40 + (idx * 7)}%` }}></div>
                <span className="text-[10px] text-slate-400">{time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zone Occupancy Bars */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Zone Occupancy</h3>
            <span className="text-xs text-indigo-600 font-semibold cursor-pointer">Live</span>
          </div>
          <div className="space-y-2.5 text-xs">
            {(analyticsData.zoneOccupancy || []).slice(0, 5).map((z: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between font-medium text-slate-700 text-[11px]">
                  <span>{z.name}</span>
                  <span className="font-bold">{z.occupancyPercent}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: z.occupancyPercent }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Presence Camera Stream Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Live Presence</h3>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live
            </span>
          </div>
          <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video my-3 flex items-center justify-center">
            <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=400" alt="live" className="w-full h-full object-cover opacity-80" />
            <div className="absolute bottom-2 left-2 bg-black/60 px-2.5 py-1 rounded text-[10px] text-white font-mono">
              Main Entrance • 12 people inside
            </div>
          </div>
          <div className="text-xs text-slate-500 flex justify-between items-center pt-1">
            <span>Camera CAM-01 Active</span>
            <button className="text-indigo-600 font-semibold hover:underline cursor-pointer">Expand View →</button>
          </div>
        </div>
      </div>

      {/* Row 2: Heatmap & Department-wise Presence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Heatmap Office Floor Plan */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900">Heatmap (Office Floor Plan)</h3>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500"></span> High</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400"></span> Medium</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-sky-400"></span> Low</span>
            </div>
          </div>
          <div className="h-64 rounded-xl bg-slate-100 relative overflow-hidden border border-slate-200 flex items-center justify-center">
            <img src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800" alt="floorplan" className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-indigo-950/20 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-md text-xs font-bold text-slate-800">
                🏢 Live Thermal Heatmap Active across 8 Zones
              </div>
            </div>
          </div>
        </div>

        {/* Department-wise Presence */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Department-wise Presence</h3>
            <span className="text-xs text-indigo-600 font-semibold cursor-pointer">Details</span>
          </div>
          <div className="space-y-3 text-xs">
            {departmentsList.map((dept: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <span className="font-medium text-slate-700">{dept.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">{90 - (idx * 4)}% Present</span>
                  <span className="text-slate-400">({12 - idx} abs)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Recent Zone Activity, Top Active Areas & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Zone Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900">Recent Zone Activity</h3>
            <span className="text-xs text-indigo-600 font-semibold cursor-pointer">View All</span>
          </div>
          <div className="space-y-3">
            {(analyticsData.recentZoneActivity || []).map((act: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between pb-2.5 border-b border-slate-50 last:border-0 text-xs">
                <div>
                  <div className="font-bold text-slate-800">{act.zone} • <span className="text-slate-500 font-normal">{act.event}</span></div>
                  <div className="text-[10px] text-slate-400">{act.camera} • {act.time}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-600 font-mono">
                  {act.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Active Areas */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900">Top Active Areas</h3>
            <span className="text-xs text-indigo-600 font-semibold cursor-pointer">Rankings</span>
          </div>
          <div className="space-y-3">
            {(analyticsData.topActiveAreas || []).map((area: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between pb-2.5 border-b border-slate-50 last:border-0 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px]">
                    {idx + 1}
                  </div>
                  <span className="font-semibold text-slate-800">{area.name}</span>
                </div>
                <span className="font-bold text-slate-600">{area.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Presence Insights */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900">Presence Insights</h3>
            <span className="text-xs text-indigo-600 font-semibold cursor-pointer">AI Analysis</span>
          </div>
          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-lg">
              💡 Office is 12% more occupied than yesterday with higher attendance in Engineering.
            </div>
            <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg">
              ⚡ Average dwell time increased by 28 minutes. People are spending more time in office.
            </div>
            <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-lg">
              🔥 Cafeteria sees peak crowd at 1:00 PM. Consider increasing seating capacity.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}