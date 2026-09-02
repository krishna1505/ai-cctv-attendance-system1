"use client";

import React, { useEffect, useState } from "react";
import { Plus, Camera, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface ZoneItem {
  id: string;
  name: string;
  type: string;
  status: string;
  cameras?: Array<{ id: string; name: string }>;
  _count?: { zoneSessions: number };
}

export default function ZonesPage() {
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadZones = async () => {
    setLoading(true);
    const res = await fetchWithAuth<ZoneItem[]>("/api/zones");
    if (res.success && res.data) {
      setZones(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadZones();
  }, []);

  return (
    <div className="p-8 space-y-7 max-w-[1600px] mx-auto bg-[#F8FAFC]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Zone Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Spatial boundaries for Desk, Meeting, Break & Entrance presence tracking
          </p>
        </div>

        <button className="px-4 py-2 bg-[#6366F1] hover:bg-[#5046E5] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-indigo-100 transition">
          <Plus size={14} /> Define Spatial Zone
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Active Spatial Zones</h2>
          <button onClick={loadZones} className="text-slate-400 hover:text-slate-600">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">ZONE NAME</th>
                <th className="p-4">ZONE TYPE</th>
                <th className="p-4">MAPPED CAMERAS</th>
                <th className="p-4">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading spatial zones from database...
                  </td>
                </tr>
              ) : zones.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No spatial zones configured. Click "Define Spatial Zone" to add one[cite: 5].
                  </td>
                </tr>
              ) : (
                zones.map((zone) => (
                  <tr key={zone.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4 font-bold text-slate-900">{zone.name}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {zone.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {zone.cameras && zone.cameras.length > 0 ? (
                          zone.cameras.map((c) => (
                            <span key={c.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded font-mono">
                              {c.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[11px]">No cameras mapped</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={11} /> {zone.status}
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