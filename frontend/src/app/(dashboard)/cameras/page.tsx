"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  Plus,
  Video,
  Wifi,
  WifiOff,
  VideoOff,
  Wrench,
  LayoutGrid,
  List as ListIcon,
  Play,
  Settings,
  MoreHorizontal,
  MapPin,
  Loader2,
  X,
  Trash2,
  Camera as CameraIcon
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface Camera {
  id: string;
  name: string;
  location?: string;
  rtspUrl: string;
  status: "ACTIVE" | "INACTIVE" | "OFFLINE";
  lastPingAt?: string;
  cameraZones?: Array<{ zone: { name: string; type: string } }>;
}

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedZone, setSelectedZone] = useState("All zones");
  const [selectedStatus, setSelectedStatus] = useState("All statuses");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    rtspUrl: "",
    location: "",
    status: "ACTIVE"
  });

  useEffect(() => {
    loadCameras();
  }, []);

  async function loadCameras() {
    setLoading(true);
    const res = await fetchWithAuth<Camera[]>("/api/cameras");
    if (res.success && res.data && Array.isArray(res.data)) {
      setCameras(res.data);
    }
    setLoading(false);
  }

  // Derived unique lists for dropdowns
  const zones = useMemo(() => {
    const zList = new Set<string>();
    cameras.forEach(c => {
      c.cameraZones?.forEach(cz => {
        if (cz.zone?.name) zList.add(cz.zone.name);
      });
    });
    return ["All zones", ...Array.from(zList)];
  }, [cameras]);

  // Filtered Data
  const filteredCameras = useMemo(() => {
    return cameras.filter(cam => {
      const matchesSearch = 
        cam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cam.rtspUrl.toLowerCase().includes(searchTerm.toLowerCase());
        
      let matchesZone = selectedZone === "All zones";
      if (!matchesZone && cam.cameraZones) {
        matchesZone = cam.cameraZones.some(cz => cz.zone?.name === selectedZone);
      }
      
      const matchesStatus = selectedStatus === "All statuses" || 
        (selectedStatus === "Online" && cam.status === "ACTIVE") || 
        (selectedStatus === "Offline" && cam.status === "OFFLINE") ||
        (selectedStatus === "Maintenance" && cam.status === "INACTIVE");

      return matchesSearch && matchesZone && matchesStatus;
    });
  }, [cameras, searchTerm, selectedZone, selectedStatus]);

  // Stats
  const onlineCount = cameras.filter(c => c.status === "ACTIVE").length;
  const offlineCount = cameras.filter(c => c.status === "OFFLINE").length;
  const maintenanceCount = cameras.filter(c => c.status === "INACTIVE").length;

  // --- Handlers ---
  const openAddModal = () => {
    setModalMode("add");
    setEditingId(null);
    setFormData({ name: "", rtspUrl: "", location: "", status: "ACTIVE" });
    setIsModalOpen(true);
  };

  const openEditModal = (cam: Camera) => {
    setModalMode("edit");
    setEditingId(cam.id);
    setFormData({
      name: cam.name,
      rtspUrl: cam.rtspUrl,
      location: cam.location || "",
      status: cam.status
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = modalMode === "add" ? "/api/cameras" : `/api/cameras/${editingId}`;
      const method = modalMode === "add" ? "POST" : "PUT";
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(formData) });
      
      if (res.success) {
        setIsModalOpen(false);
        loadCameras();
      } else {
        alert(res.message || "An error occurred");
      }
    } catch (err) {
      alert("Failed to save camera");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete camera '${name}'?`)) {
      const res = await fetchWithAuth(`/api/cameras/${id}`, { method: "DELETE" });
      if (res.success) loadCameras();
      else alert(res.message || "Failed to delete camera");
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetchWithAuth(`/api/cameras/${id}/test`, { method: "POST" });
      alert(res.message || "Test completed");
      loadCameras(); // refresh status
    } catch (e) {
      alert("Test failed");
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto bg-[#F8FAFC] min-h-screen">
      {/* 1. Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">CAMERAS</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cameras</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage and monitor all your CCTV cameras</p>
        </div>

        <button 
          onClick={openAddModal}
          className="px-5 py-2.5 bg-[#6366F1] hover:bg-[#5046E5] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition"
        >
          <Plus size={18} /> Add Camera
        </button>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CameraIcon size={16} />
            </div>
            <span className="text-sm font-bold text-slate-700">Total Cameras</span>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{cameras.length}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wifi size={16} />
            </div>
            <span className="text-sm font-bold text-slate-700">Online</span>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{onlineCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <WifiOff size={16} />
            </div>
            <span className="text-sm font-bold text-slate-700">Offline</span>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{offlineCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Video size={16} />
            </div>
            <span className="text-sm font-bold text-slate-700">Recording</span>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{onlineCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wrench size={16} />
            </div>
            <span className="text-sm font-bold text-slate-700">Maintenance</span>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{maintenanceCount}</p>
        </div>
      </div>

      {/* 3. Filters & View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search cameras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
          
          <select 
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer min-w-[140px]"
          >
            {zones.map(z => <option key={z as string} value={z as string}>{z}</option>)}
          </select>

          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer min-w-[140px]"
          >
            <option value="All statuses">All statuses</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          <button 
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-[#6366F1] text-white' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button 
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-[#6366F1] text-white' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <ListIcon size={16} />
          </button>
        </div>
      </div>

      {/* 4. Cameras Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 size={32} className="animate-spin mb-4 text-indigo-600" />
          <p className="font-medium">Loading cameras...</p>
        </div>
      ) : filteredCameras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
          <VideoOff size={48} className="mb-4 text-slate-300" />
          <p className="font-medium text-lg text-slate-600">No cameras found</p>
          <p className="text-sm mt-1">Adjust your filters or add a new camera.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredCameras.map((cam) => {
            const zoneName = cam.cameraZones && cam.cameraZones.length > 0 ? cam.cameraZones[0].zone.name : "Unassigned";
            
            return (
              <div key={cam.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                {/* Dark Placeholder for Video */}
                <div className="aspect-video bg-slate-900 relative flex items-center justify-center overflow-hidden">
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 z-10">
                    <span className={`w-2 h-2 rounded-full ${cam.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : cam.status === 'OFFLINE' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                    <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                      {cam.status === 'ACTIVE' ? 'Live' : cam.status === 'OFFLINE' ? 'Offline' : 'Maint'}
                    </span>
                  </div>
                  
                  {/* Placeholder Icon */}
                  <div className="text-slate-700 flex flex-col items-center group-hover:scale-110 transition-transform duration-500">
                    <Video size={32} className="opacity-50 mb-2" />
                    <span className="text-xs font-medium opacity-50 tracking-widest uppercase">Feed Preview</span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-black text-slate-900 text-base mb-1 truncate" title={cam.name}>{cam.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 font-medium truncate">
                    <span className="text-slate-400">Zone:</span> {zoneName}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4 text-xs font-mono text-slate-500 bg-slate-50 p-2 rounded-lg truncate">
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">{cam.rtspUrl}</span>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-2">
                    <button 
                      onClick={() => handleTestConnection(cam.id)}
                      disabled={testingId === cam.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition disabled:opacity-50"
                    >
                      {testingId === cam.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} className="fill-current" />}
                      Test
                    </button>
                    <button 
                      onClick={() => openEditModal(cam)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                    >
                      <Settings size={14} /> Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(cam.id, cam.name)}
                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">CAMERA NAME</th>
                  <th className="p-4">ZONE</th>
                  <th className="p-4">RTSP URL</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCameras.map((cam) => {
                   const zoneName = cam.cameraZones && cam.cameraZones.length > 0 ? cam.cameraZones[0].zone.name : "Unassigned";
                   return (
                    <tr key={cam.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4">
                        <p className="font-bold text-slate-900">{cam.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{cam.location || "No location"}</p>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">{zoneName}</td>
                      <td className="p-4 font-mono text-xs text-slate-500">{cam.rtspUrl}</td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-md text-[11px] font-bold ${
                            cam.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : cam.status === "OFFLINE" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {cam.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-3 text-slate-400">
                          <button onClick={() => handleTestConnection(cam.id)} className="hover:text-indigo-600 transition-colors" title="Test Connection">
                            {testingId === cam.id ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                          </button>
                          <button onClick={() => openEditModal(cam)} className="hover:text-slate-800 transition-colors" title="Edit"><Settings size={16} /></button>
                          <button onClick={() => handleDelete(cam.id, cam.name)} className="hover:text-rose-600 transition-colors" title="Delete"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                   )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900">
                {modalMode === "add" ? "Add New Camera" : "Edit Camera"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Camera Name *</label>
                <input 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                  placeholder="e.g. Main Entrance Cam 01" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">RTSP Stream URL *</label>
                <input 
                  required 
                  value={formData.rtspUrl}
                  onChange={(e) => setFormData({...formData, rtspUrl: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                  placeholder="rtsp://admin:pass@192.168.1.100:554/stream1" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Physical Location</label>
                  <input 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                    placeholder="e.g. Gate 1 Pole" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="ACTIVE">Active (Live)</option>
                    <option value="INACTIVE">Maintenance</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-[#6366F1] hover:bg-[#5046E5] rounded-lg transition flex items-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {modalMode === "add" ? "Save Camera" : "Update Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}