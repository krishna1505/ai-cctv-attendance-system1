"use client";

import React, { useEffect, useState } from "react";
import { Clock, Coffee, Users2, AlertCircle, Building2, Loader2, RefreshCw } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface AnalyticsSummary {
  avgOfficePresence: string;
  avgDeskPresence: string;
  avgBreakTime: string;
  avgMeetingTime: string;
  employeeStats: Array<{
    id: string;
    name: string;
    employee_code: string;
    department: string;
    officePresence: string;
    deskPresence: string;
    breakTime: string;
    meetingTime: string;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    const res = await fetchWithAuth<AnalyticsSummary>("/api/analytics/company");
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <div className="p-8 space-y-7 max-w-[1600px] mx-auto bg-[#F8FAFC]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Presence Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Zone-based physical workforce presence session aggregation[cite: 5]
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-2"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900 flex items-center gap-2.5">
        <AlertCircle size={17} className="text-amber-600 shrink-0" />
        <span>
          <strong>Presence Policy:</strong> Camera-based presence measures visible presence within designated zones[cite: 5]. These metrics do not reflect actual work quality or intellectual productivity[cite: 5].
        </span>
      </div>

      {/* 4 Cards Hooked Dynamically */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Avg. Office Presence</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{data?.avgOfficePresence || "--"}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Avg. Desk Presence</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{data?.avgDeskPresence || "--"}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Avg. Break Time</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{data?.avgBreakTime || "--"}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Avg. Meeting Time</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{data?.avgMeetingTime || "--"}</p>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Workforce Presence Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">EMPLOYEE</th>
                <th className="p-4">DEPARTMENT</th>
                <th className="p-4">OFFICE PRESENCE</th>
                <th className="p-4">DESK PRESENCE</th>
                <th className="p-4">BREAK TIME</th>
                <th className="p-4">MEETING TIME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                    Computing presence sessions...
                  </td>
                </tr>
              ) : !data || data.employeeStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No presence session records found for selected period[cite: 5].
                  </td>
                </tr>
              ) : (
                data.employeeStats.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{emp.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{emp.employee_code}</p>
                    </td>
                    <td className="p-4 text-slate-600">{emp.department}</td>
                    <td className="p-4 font-semibold text-slate-800">{emp.officePresence}</td>
                    <td className="p-4 font-semibold text-emerald-700">{emp.deskPresence}</td>
                    <td className="p-4 text-amber-700 font-medium">{emp.breakTime}</td>
                    <td className="p-4 text-sky-700 font-medium">{emp.meetingTime}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}