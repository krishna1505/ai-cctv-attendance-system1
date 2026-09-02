"use client";

import React, { useEffect, useState } from "react";
import { Activity, ShieldAlert, Loader2, RefreshCw } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface AIEventItem {
  id: string;
  event_type: string;
  employee?: { name: string; employee_code: string };
  confidence: number;
  camera: { name: string };
  timestamp: string;
}

export default function AIEventsPage() {
  const [events, setEvents] = useState<AIEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    setLoading(true);
    const res = await fetchWithAuth<AIEventItem[]>("/api/ai-events");
    if (res.success && res.data) {
      setEvents(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div className="p-8 space-y-7 max-w-[1600px] mx-auto bg-[#F8FAFC]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Detection Events</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Raw edge camera recognitions, tracking triggers & debounce ledger[cite: 5]
          </p>
        </div>
        <button
          onClick={loadEvents}
          className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-2"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Live AI Event Stream</h2>
          <span className="text-xs text-slate-400 font-medium">Confidence threshold: &ge; 0.85[cite: 5]</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">EVENT ID</th>
                <th className="p-4">TYPE</th>
                <th className="p-4">EMPLOYEE / SUBJECT</th>
                <th className="p-4">CONFIDENCE</th>
                <th className="p-4">CAMERA</th>
                <th className="p-4">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                    Streaming AI detection events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No detection events logged yet. Active camera frames will push recognitions here[cite: 5].
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4 font-mono font-bold text-slate-700">{evt.id}</td>
                    <td className="p-4 font-bold text-indigo-600">{evt.event_type}</td>
                    <td className="p-4">
                      {evt.employee ? (
                        <div>
                          <p className="font-bold text-slate-900">{evt.employee.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{evt.employee.employee_code}</p>
                        </div>
                      ) : (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <ShieldAlert size={12} /> Unknown Person[cite: 5]
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-700">
                      {(evt.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="p-4 font-mono text-slate-600">{evt.camera?.name || "--"}</td>
                    <td className="p-4 font-mono text-slate-500">{evt.timestamp}</td>
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