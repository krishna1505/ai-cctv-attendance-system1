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
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface DashboardMetrics {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  currentlyInside: number;
  attendanceTrend?: Array<{ day: string; present: number; late: number; absent: number }>;
  deptBreakdown?: Array<{ name: string; count: number }>;
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

export default function DashboardPage() {
  const [adminName, setAdminName] = useState("Admin");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [events, setEvents] = useState<AIEventItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        fetchWithAuth<DashboardMetrics>("/api/analytics/company"),
        fetchWithAuth<CameraItem[]>("/api/cameras"),
        fetchWithAuth<AIEventItem[]>("/api/ai-events?limit=5"),
      ]);

      if (statsRes.success && statsRes.data) setMetrics(statsRes.data);
      if (camRes.success && camRes.data) setCameras(camRes.data);
      if (evtRes.success && evtRes.data) setEvents(evtRes.data);

      setLoading(false);
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        <Loader2 size={28} className="animate-spin mx-auto mb-3 text-indigo-600" />
        Loading real-time company workforce intelligence...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-7 max-w-[1600px] mx-auto bg-[#F8FAFC]">
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">DASHBOARD</p>
        <h1 className="text-2xl font-black text-slate-900 mt-0.5">
          Good morning, {adminName} 👋
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Here's what's happening with your workforce today.</p>
      </div>

      {/* 5 Dynamic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <Users size={16} />
          </div>
          <span className="text-xs font-semibold text-slate-500">Total Employees</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics?.totalEmployees ?? 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 size={16} />
          </div>
          <span className="text-xs font-semibold text-slate-500">Present Today</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics?.presentToday ?? 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Clock size={16} />
          </div>
          <span className="text-xs font-semibold text-slate-500">Late Today</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics?.lateToday ?? 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <AlertCircle size={16} />
          </div>
          <span className="text-xs font-semibold text-slate-500">Absent Today</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics?.absentToday ?? 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <LogIn size={16} />
          </div>
          <span className="text-xs font-semibold text-slate-500">Currently Inside</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics?.currentlyInside ?? 0}</p>
        </div>
      </div>

      {/* Row 2: Live Camera Feeds & Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Provisioned Camera Streams</h2>
          {cameras.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No active IP cameras configured. Provision RTSP streams in Camera Management.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {cameras.map((cam) => (
                <div key={cam.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="aspect-video bg-slate-900 flex items-center justify-center text-slate-500 text-[10px] font-mono">
                    <Camera size={18} className="text-slate-600" />
                  </div>
                  <div className="p-2.5 bg-white flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate">{cam.name}</span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        cam.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      ● {cam.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Live Edge AI Events</h2>
          {events.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No live AI detections reported yet.
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((evt) => (
                <div key={evt.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{evt.employee?.name || "Unknown Face"}</p>
                    <p className="text-[10px] text-slate-400">{evt.camera?.name || "--"}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                    {evt.event_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}