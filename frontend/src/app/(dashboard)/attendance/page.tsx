"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock, ArrowUpRight, ArrowDownLeft, Loader2, RefreshCw } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface AttendanceRecord {
  id: string;
  employee_code: string;
  employee: { name: string; employee_code: string };
  timestamp: string;
  confidence: number;
  event_type: string;
  camera: { name: string };
  hrms_sync_status: string;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAttendance = async () => {
    setLoading(true);
    const res = await fetchWithAuth<AttendanceRecord[]>("/api/attendance");
    if (res.success && res.data) {
      setRecords(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto bg-[#F8FAFC]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Attendance Log & StaffPie Sync</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic CCTV Check-In/Out events pushed to StaffPie Device Punch API[cite: 3, 5]
          </p>
        </div>
        <button
          onClick={loadAttendance}
          className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-2"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-5">EMPLOYEE</th>
                <th className="py-3.5 px-5">EVENT TYPE</th>
                <th className="py-3.5 px-5">TIMESTAMP</th>
                <th className="py-3.5 px-5">CONFIDENCE</th>
                <th className="py-3.5 px-5">SOURCE CAMERA</th>
                <th className="py-3.5 px-5">HRMS STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                    Fetching attendance logs from PostgreSQL...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No attendance events logged yet. Camera punches will appear here in real-time[cite: 3, 5].
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-5">
                      <span className="font-bold text-slate-900 block">{rec.employee?.name || "Employee"}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{rec.employee?.employee_code}</span>
                    </td>
                    <td className="py-3.5 px-5 font-bold">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          rec.event_type === "CHECK_IN" ? "text-emerald-700" : "text-indigo-700"
                        }`}
                      >
                        {rec.event_type === "CHECK_IN" ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                        {rec.event_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-600">{rec.timestamp}</td>
                    <td className="py-3.5 px-5 font-mono font-medium text-slate-700">
                      {(rec.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-[11px]">{rec.camera?.name || "--"}</td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.hrms_sync_status === "SYNCED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {rec.hrms_sync_status === "SYNCED" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        {rec.hrms_sync_status}
                      </span>
                    </td>
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