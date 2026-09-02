"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, ShieldCheck, Clock, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  records_synced: number;
  created_at: string;
  error_message?: string;
}

export default function HrmsSyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    const res = await fetchWithAuth<SyncLog[]>("/api/integrations/hrms/logs");
    if (res.success && res.data) {
      setLogs(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    await fetchWithAuth("/api/integrations/hrms/sync", { method: "POST" });
    await loadLogs();
    setSyncing(false);
  };

  return (
    <div className="p-8 space-y-7 max-w-[1600px] mx-auto bg-[#F8FAFC]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">StaffPie HRMS Integration Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bi-directional sync bridge between StaffPie HRMS and Local PostgreSQL[cite: 5]
          </p>
        </div>

        <button
          onClick={triggerSync}
          disabled={syncing}
          className="px-4 py-2.5 bg-[#6366F1] hover:bg-[#5046E5] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-indigo-100 disabled:opacity-50 transition"
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Synchronizing with StaffPie..." : "Trigger Full Sync"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">HRMS Synchronization Audit Logs</h2>
          <button onClick={loadLogs} className="text-slate-400 hover:text-slate-600">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">OPERATION</th>
                <th className="p-4">RECORDS</th>
                <th className="p-4">STATUS</th>
                <th className="p-4">TIMESTAMP</th>
                <th className="p-4">DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                    Reading sync ledger...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No synchronization logs recorded yet. Trigger a sync to pull employees and face profiles[cite: 3, 5].
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4 font-mono font-bold text-slate-800">{log.sync_type}</td>
                    <td className="p-4 font-semibold text-slate-700">{log.records_synced}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={11} /> {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-mono text-[11px]">{log.created_at}</td>
                    <td className="p-4 text-slate-600">{log.error_message || "Completed successfully"}</td>
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