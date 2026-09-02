"use client";

import React, { useEffect, useState } from "react";
import { Save, CheckCircle2, Cpu, Database, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

export default function SettingsPage() {
  const [confidence, setConfidence] = useState(0.85);
  const [cooldown, setCooldown] = useState(5);
  const [retentionDays, setRetentionDays] = useState(14);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      const res = await fetchWithAuth<any>("/api/settings");
      if (res.success && res.data) {
        if (res.data.confidence) setConfidence(res.data.confidence);
        if (res.data.cooldown) setCooldown(res.data.cooldown);
        if (res.data.retentionDays) setRetentionDays(res.data.retentionDays);
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchWithAuth("/api/settings", {
      method: "POST",
      body: JSON.stringify({ confidence, cooldown, retentionDays }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
        Loading system configuration...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-7 max-w-[1600px] mx-auto bg-[#F8FAFC]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure edge AI inference thresholds, debounce windows, and tenant encryption[cite: 5]
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2.5 bg-[#6366F1] hover:bg-[#5046E5] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-indigo-100 transition"
        >
          <Save size={14} /> Save Configuration
        </button>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>Settings successfully persisted to company profile in PostgreSQL[cite: 5].</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6 max-w-3xl">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <Cpu size={16} className="text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">AI Detection & Attendance Rules[cite: 5]</h2>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-bold text-slate-700">Face Recognition Confidence Threshold</label>
            <span className="text-xs font-mono font-bold text-indigo-600">{(confidence * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.70"
            max="0.98"
            step="0.01"
            value={confidence}
            onChange={(e) => setConfidence(parseFloat(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>

        <div className="pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-bold text-slate-700">Debounce / Cooldown Window (Minutes)</label>
            <span className="text-xs font-mono font-bold text-indigo-600">{cooldown} mins</span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={cooldown}
            onChange={(e) => setCooldown(parseInt(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>

        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Raw Edge Event Retention Period</label>
          <select
            value={retentionDays}
            onChange={(e) => setRetentionDays(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
          </select>
        </div>
      </div>
    </div>
  );
}