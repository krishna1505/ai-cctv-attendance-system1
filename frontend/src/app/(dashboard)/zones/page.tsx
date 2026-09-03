"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Search, Plus, Layers, MapPin, Video, LayoutTemplate, 
  Trash2, Loader2, X, Download, PenSquare, ArrowRight, Expand
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface Zone {
  id: string;
  name: string;
  type: string;
  status: "ACTIVE" | "INACTIVE";
  cameraZones?: Array<{ camera: { id: string; name: string } }>;
}

const ZONE_TYPES = [
  "OFFICE", "DESK", "MEETING_ROOM", "BREAK_AREA", 
  "ENTRANCE", "EXIT", "CAFETERIA", "OTHER"
];

// Helper to get consistent pastel colors for zones based on type
const getZoneColor = (type: string) => {
  const colors: Record<string, string> = {
    ENTRANCE: "bg-emerald-100 border-emerald-300 text-emerald-800",
    OFFICE: "bg-blue-100 border-blue-300 text-blue-800",
    DESK: "bg-indigo-100 border-indigo-300 text-indigo-800",
    MEETING_ROOM: "bg-pink-100 border-pink-300 text-pink-800",
    BREAK_AREA: "bg-orange-100 border-orange-300 text-orange-800",
    CAFETERIA: "bg-amber-100 border-amber-300 text-amber-800",
    EXIT: "bg-rose-100 border-rose-300 text-rose-800",
    OTHER: "bg-slate-100 border-slate-300 text-slate-800",
  };
  return colors[type] || colors.OTHER;
};

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All types");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "OFFICE",
    status: "ACTIVE"
  });

  useEffect(() => {
    loadZones();
  }, []);

  async function loadZones() {
    setLoading(true);
    const res = await fetchWithAuth<{ success: boolean; data: Zone[] }>("/api/zones");
    if (res.success && res.data && Array.isArray(res.data)) {
      setZones(res.data);
    }
    setLoading(false);
  }

  // Derived Filtered Data
  const filteredZones = useMemo(() => {
    return zones.filter(zone => {
      const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === "All types" || zone.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [zones, searchTerm, selectedType]);

  // KPIs
  const activeZones = zones.filter(z => z.status === "ACTIVE").length;
  const inactiveZones = zones.filter(z => z.status === "INACTIVE").length;
  const totalCameras = zones.reduce((acc, z) => acc + (z.cameraZones?.length || 0), 0);

  // Modal Handlers
  const openAddModal = () => {
    setModalMode("add");
    setEditingId(null);
    setFormData({ name: "", type: "OFFICE", status: "ACTIVE" });
    setIsModalOpen(true);
  };

  const openEditModal = (zone: Zone) => {
    setModalMode("edit");
    setEditingId(zone.id);
    setFormData({
      name: zone.name,
      type: zone.type,
      status: zone.status
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = modalMode === "add" ? "/api/zones" : `/api/zones/${editingId}`;
      const method = modalMode === "add" ? "POST" : "PUT";
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(formData) });
      
      if (res.success) {
        setIsModalOpen(false);
        loadZones();
      } else {
        alert(res.message || "An error occurred");
      }
    } catch (err) {
      alert("Failed to save zone");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete zone '${name}'? All camera mappings will be removed.`)) {
      const res = await fetchWithAuth(`/api/zones/${id}`, { method: "DELETE" });
      if (res.success) loadZones();
      else alert(res.message || "Failed to delete zone");
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto bg-[#F8FAFC] min-h-screen">
      {/* 1. Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">ZONES</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Zones</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Define and manage logical areas in your office</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => alert("Bulk Import feature (CSV/Excel) is under development! We will add a backend API for this soon.")}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition"
          >
            <Download size={16} /> Import Zones
          </button>
          <button 
            onClick={openAddModal}
            className="px-5 py-2.5 bg-[#6366F1] hover:bg-[#5046E5] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition"
          >
            <Plus size={18} /> Add Zone
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
            <span className="text-sm font-bold text-slate-700">Total Zones</span>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{zones.length}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin size={16} />
            </div>
            <span className="text-sm font-bold text-slate-700">Active Zones</span>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{activeZones}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <LayoutTemplate size={16} />
            </div>
            <span className="text-sm font-bold text-slate-700">Inactive Zones</span>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{inactiveZones}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Video size={16} />
            </div>
            <span className="text-sm font-bold text-slate-700">Total Cameras Assigned</span>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalCameras}</p>
        </div>
      </div>

      {/* 3. Main Content: Floor Plan & List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Abstract Floor Plan */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-black text-slate-900">Office Floor Plan</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Visualize your zones and camera coverage</p>
              </div>
              <button className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition">
                <Expand size={16} />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex-1 relative overflow-hidden flex flex-col">
              {/* Decorative Blueprint Background Grid */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 size={24} className="animate-spin mb-2" />
                  <p className="text-sm font-medium">Drawing floor plan...</p>
                </div>
              ) : zones.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <LayoutTemplate size={48} className="opacity-20 mb-3" />
                  <p className="text-sm font-medium text-slate-500">No zones defined yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 auto-rows-[100px] flex-1 z-10">
                  {zones.map((zone, idx) => {
                    const styleClass = getZoneColor(zone.type);
                    // Make the first element span 2 cols to look like a bigger room
                    const isLarge = idx === 0 || idx === 3;
                    return (
                      <div 
                        key={zone.id} 
                        className={`relative rounded-xl border-2 p-3 flex flex-col shadow-sm transition hover:shadow-md hover:scale-[1.02] cursor-pointer ${styleClass} ${isLarge ? 'col-span-2' : 'col-span-1'}`}
                      >
                        <div className="flex justify-between items-start mb-auto">
                          <span className="text-[10px] font-black uppercase tracking-wider opacity-80 mix-blend-color-burn">{zone.type}</span>
                          {zone.cameraZones && zone.cameraZones.length > 0 && (
                            <div className="flex items-center gap-1 bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold">
                              <Video size={10} /> {zone.cameraZones.length}
                            </div>
                          )}
                        </div>
                        <h3 className="font-bold text-sm leading-tight mix-blend-color-burn">{zone.name}</h3>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Zones List */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Zones List</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Manage zone details and camera assignments</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search zones..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="All types">All types</option>
                  {ZONE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">NAME</th>
                    <th className="p-4">TYPE</th>
                    <th className="p-4 text-center">CAMERAS</th>
                    <th className="p-4">STATUS</th>
                    <th className="p-4 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                        <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                        <p className="font-medium text-sm">Loading zones...</p>
                      </td>
                    </tr>
                  ) : filteredZones.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                        <p className="font-medium text-sm text-slate-600 mb-1">No zones found</p>
                        <p className="text-xs">Try adjusting your search or add a new zone.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredZones.map((zone) => {
                       const styleClass = getZoneColor(zone.type);
                       return (
                        <tr key={zone.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${styleClass.split(' ')[0]} ${styleClass.split(' ')[2]}`}>
                                <LayoutTemplate size={14} />
                              </div>
                              <p className="font-bold text-slate-900">{zone.name}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${styleClass}`}>
                              {zone.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                              {zone.cameraZones?.length || 0}
                            </span>
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                zone.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {zone.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => openEditModal(zone)} 
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" 
                                title="Edit"
                              >
                                <PenSquare size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(zone.id, zone.name)} 
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" 
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                       )
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {!loading && filteredZones.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-medium">
                Showing {filteredZones.length} of {zones.length} zones
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- ADD / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">
                {modalMode === "add" ? "Add New Zone" : "Edit Zone"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-50 p-1.5 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Zone Name *</label>
                <input 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                  placeholder="e.g. Server Room" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Zone Type</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {ZONE_TYPES.map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#6366F1] hover:bg-[#5046E5] rounded-lg transition flex items-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {modalMode === "add" ? "Save" : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}