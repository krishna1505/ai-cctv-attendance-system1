"use client";

import React, { useEffect, useState } from "react";
import { Camera, Plus, CheckCircle2, XCircle, RefreshCw, Eye, Lock, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface CameraItem {
  id: string;
  name: string;
  location: string;
  stream_url: string;
  type: string;
  status: "ACTIVE" | "OFFLINE";
  zone?: { name: string };
  last_seen?: string;
}

export default function CamerasPage() {
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCameras() {
      setLoading(true);
      const res = await fetchWithAuth<CameraItem[]>("/api/cameras");
      if (res.success && res.data) {
        setCameras(res.data);
      }
      setLoading(false);
    }
    loadCameras();
  }, []);

  const activeCount = cameras.filter((c) => c.status === "ACTIVE").length;

  return (
    <div className="p-8 space-y-7 max-w-[1600px] mx-auto bg-[#F8FAFC]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Camera Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            RTSP/IP Edge Streams, zone mapping & hardware health monitoring[cite: 1]
          </p>
        </div>
        <button className="px-4 py-2 bg-[#6366F1] hover:bg-[#5046E5] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-indigo-100 transition">
          <Plus size={14} /> Add IP Camera
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Configured Cameras</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{cameras.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Online & Streaming</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Offline Streams</span>
          <p className="text-2xl font-black text-rose-600 mt-1">{cameras.length - activeCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
          Loading registered cameras...[cite: 1]
        </div>
      ) : cameras.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          No cameras registered yet. Click "Add IP Camera" to provision an RTSP stream[cite: 1].
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {cameras.map((cam) => (
            <div key={cam.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="aspect-video bg-slate-900 relative flex items-center justify-center text-slate-400">
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-mono text-white">
                    <Lock size={10} className="text-indigo-400" />
                    <span>AES-256</span>
                  </div>
                  <span className="font-mono text-xs text-slate-500">[ Live Video Stream ]</span>
                </div>
                <div className="p-4 space-y-3">
                  <h3 className="font-bold text-slate-900 text-xs truncate">{cam.name}</h3>
                  <p className="text-[11px] text-slate-400">{cam.location}</p>
                  <p className="text-[11px] text-slate-600 font-medium">Zone: {cam.zone?.name || "Unassigned"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}