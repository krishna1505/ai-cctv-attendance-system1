"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  Play,
  CheckCircle,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Users,
  AlertTriangle,
  Clock,
  Calendar,
  List,
  LayoutGrid,
} from "lucide-react";

export default function AiEventsPage() {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedZone, setSelectedZone] = useState("all");
  const [selectedEventType, setSelectedEventType] = useState("all");
  const [selectedCamera, setSelectedCamera] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");

  // Dynamic Metadata States from DB
  const [zonesList, setZonesList] = useState<any[]>([]);
  const [camerasList, setCamerasList] = useState<any[]>([]);

  const [aiData, setAiData] = useState({
    metrics: {
      totalEvents: 142,
      unauthorizedAccess: 12,
      peopleCounting: 86,
      loitering: 8,
      safetyViolation: 6,
    },
    events: [],
  });

  // Helper for dynamic current formatted date (e.g. "Thu, 3 Sep 2026")
  const getFormattedCurrentDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return today.toLocaleDateString('en-GB', options);
  };

  const [currentDateStr, setCurrentDateStr] = useState("");

  useEffect(() => {
    setCurrentDateStr(getFormattedCurrentDate());
  }, []);

  const getAuthToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token") || localStorage.getItem("admin_token") || "";
  };

  // Fetch Metadata (Zones & Cameras) for Dropdowns
  const fetchMetadata = async () => {
    try {
      const token = getAuthToken();
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      
      const [zonesRes, camerasRes] = await Promise.all([
        fetch("http://localhost:5000/api/zones", { headers }),
        fetch("http://localhost:5000/api/cameras", { headers })
      ]);

      const zonesJson = await zonesRes.json();
      const camerasJson = await camerasRes.json();

      if (zonesJson?.success) setZonesList(zonesJson.data || zonesJson.zones || []);
      if (camerasJson?.success) setCamerasList(camerasJson.data || camerasJson.cameras || []);
    } catch (err) {
      console.warn("Could not fetch metadata filters", err);
    }
  };

  const fetchAiEvents = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch("http://localhost:5000/api/ai-events/dashboard", {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json();
      if (json?.success && json?.data) {
        setAiData(json.data);
        if (json.data.events?.length > 0) {
          setSelectedEvent(json.data.events[0]);
        }
      }
    } catch (err) {
      console.warn("Using fallback AI events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiEvents();
    fetchMetadata();
  }, []);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedZone("all");
    setSelectedEventType("all");
    setSelectedCamera("all");
    setSelectedSeverity("all");
    setCurrentPage(1);
    fetchAiEvents();
  };

  // Filtering Logic based on user inputs
  const filteredEvents = (aiData.events || []).filter((ev: any) => {
    const matchesSearch = 
      ev.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.eventType?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesZone = selectedZone === "all" || ev.location?.toLowerCase() === selectedZone.toLowerCase();
    const matchesEventType = selectedEventType === "all" || ev.eventType?.toLowerCase().includes(selectedEventType.toLowerCase());
    const matchesCamera = selectedCamera === "all" || ev.cameraName?.toLowerCase() === selectedCamera.toLowerCase();

    return matchesSearch && matchesZone && matchesEventType && matchesCamera;
  });

  const totalPages = Math.ceil(filteredEvents.length / rowsPerPage) || 1;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredEvents.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">AI EVENTS</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">AI Events</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time AI detected events from your cameras</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs shadow-sm font-medium text-slate-700">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>{currentDateStr || "Loading date..."}</span>
          </div>

          <select 
            value={selectedZone} 
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs shadow-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All zones</option>
            {zonesList.map((z: any) => (
              <option key={z.id} value={z.name}>{z.name}</option>
            ))}
          </select>

          <select 
            value={selectedEventType} 
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs shadow-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All event types</option>
            <option value="Unauthorized">Unauthorized Access</option>
            <option value="Loitering">Loitering</option>
            <option value="People">People Counting</option>
            <option value="Safety">Safety Violation</option>
            <option value="Face">Face Recognized</option>
          </select>

          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer">
            <Play className="w-4 h-4 fill-current" /> Live View
          </button>
          
          <button onClick={() => alert("Exporting AI Events...")} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-sm transition-colors cursor-pointer">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Top 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Total Events</div>
            <div className="text-2xl font-extrabold text-slate-900 mb-1">{aiData.metrics.totalEvents}</div>
            <div className="text-[11px] text-emerald-600 font-medium">↑ Real-time tracking</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Unauthorized Access</div>
            <div className="text-2xl font-extrabold text-rose-600 mb-1">{aiData.metrics.unauthorizedAccess}</div>
            <div className="text-[11px] text-rose-500 font-medium">High priority alert</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">People Counting</div>
            <div className="text-2xl font-extrabold text-slate-900 mb-1">{aiData.metrics.peopleCounting}</div>
            <div className="text-[11px] text-emerald-600 font-medium">Active presence</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Loitering</div>
            <div className="text-2xl font-extrabold text-amber-600 mb-1">{aiData.metrics.loitering}</div>
            <div className="text-[11px] text-amber-500 font-medium">Monitored zones</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Safety Violation</div>
            <div className="text-2xl font-extrabold text-rose-600 mb-1">{aiData.metrics.safetyViolation}</div>
            <div className="text-[11px] text-rose-500 font-medium">PPE audit check</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter Bar with Search, Dropdowns & List/Grid Toggle */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search location, person, event..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select 
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 cursor-pointer"
          >
            <option value="all">All event types</option>
            <option value="Unauthorized">Unauthorized Access</option>
            <option value="Loitering">Loitering</option>
            <option value="People">People Counting</option>
            <option value="Safety">Safety Violation</option>
          </select>

          <select 
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 cursor-pointer"
          >
            <option value="all">All cameras</option>
            {camerasList.map((c: any) => (
              <option key={c.id} value={c.name}>{c.name} ({c.location || "Main"})</option>
            ))}
          </select>

          <select 
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 cursor-pointer"
          >
            <option value="all">All zones</option>
            {zonesList.map((z: any) => (
              <option key={z.id} value={z.name}>{z.name}</option>
            ))}
          </select>

          <select 
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 cursor-pointer"
          >
            <option value="all">All severities</option>
            <option value="High">High Severity</option>
            <option value="Medium">Medium Severity</option>
            <option value="Low">Low Severity</option>
          </select>

          {/* List / Grid Toggle Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                viewMode === "list" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                viewMode === "grid" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grid
            </button>
          </div>

          <button onClick={handleResetFilters} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {viewMode === "list" ? (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase border-b border-slate-200">
                    <th className="py-3 px-4"><input type="checkbox" className="rounded" /></th>
                    <th className="py-3 px-4">Thumbnail</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Person / Object</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(currentRows || []).length > 0 ? (
                    currentRows.map((ev: any, idx: number) => (
                      <tr
                        key={idx}
                        onClick={() => setSelectedEvent(ev)}
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedEvent?.id === ev.id ? "bg-indigo-50/40" : ""}`}
                      >
                        <td className="py-3 px-4"><input type="checkbox" className="rounded" /></td>
                        <td className="py-3 px-4">
                          <img src={ev.thumbnail || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300"} alt="thumb" className="w-12 h-8 rounded object-cover border border-slate-200" />
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          <div>{ev.time}</div>
                          <div className="text-[10px] text-slate-400">{currentDateStr}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            {ev.eventType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{ev.location}</td>
                        <td className="py-3 px-4 text-slate-600">{ev.person}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            {ev.confidence}
                          </span>
                        </td>
                        <td className="py-3 px-4 flex items-center gap-2 text-slate-400">
                          <Eye className="w-4 h-4 hover:text-indigo-600 cursor-pointer" />
                          <Download className="w-4 h-4 hover:text-indigo-600 cursor-pointer" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        No AI events matched your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              {(currentRows || []).map((ev: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => setSelectedEvent(ev)}
                  className={`border rounded-xl p-3 bg-white shadow-sm cursor-pointer transition hover:shadow-md ${
                    selectedEvent?.id === ev.id ? "border-indigo-600 ring-2 ring-indigo-500/20" : "border-slate-200"
                  }`}
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 mb-3">
                    <img src={ev.thumbnail || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300"} alt="grid-thumb" className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                      {ev.eventType}
                    </span>
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                      {ev.confidence}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-slate-900">{ev.location}</div>
                    <div className="text-slate-500 flex justify-between">
                      <span>{ev.person}</span>
                      <span className="font-mono text-[11px]">{ev.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-white">
            <span>Showing {Math.min(indexOfFirstRow + 1, filteredEvents.length)} - {Math.min(indexOfLastRow, filteredEvents.length)} of {filteredEvents.length} events</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-2.5 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button key={num} onClick={() => setCurrentPage(num)} className={`px-3 py-1 border rounded font-semibold cursor-pointer ${currentPage === num ? "bg-indigo-600 text-white border-indigo-600" : "hover:bg-slate-50 text-slate-700"}`}>
                  {num}
                </button>
              ))}
              <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="px-2.5 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Drawer */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Event Details</h3>
              <span className="text-xs text-slate-400 cursor-pointer" onClick={() => setSelectedEvent(null)}>✕</span>
            </div>

            {selectedEvent ? (
              <div className="space-y-4 text-xs">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
                  <img src={selectedEvent.thumbnail || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300"} alt="snapshot" className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button className="w-10 h-10 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 transition cursor-pointer">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white font-mono">
                    {selectedEvent.location || "Main Entrance"}
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">Event Type</span>
                    <span className="font-bold text-rose-600">{selectedEvent.eventType}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">Time</span>
                    <span className="font-semibold text-slate-800">{currentDateStr}, {selectedEvent.time}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">Location</span>
                    <span className="font-semibold text-slate-800">{selectedEvent.location}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">Person / Object</span>
                    <span className="font-semibold text-slate-800">{selectedEvent.person}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">Confidence</span>
                    <span className="font-bold text-emerald-600">{selectedEvent.confidence}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">Select an event from the list to view details</div>
            )}
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
            <button onClick={() => alert("Downloading event snapshot...")} className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer">
              <Download className="w-3.5 h-3.5" /> Download Snapshot
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => alert("Marked as reviewed!")} className="py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1 transition cursor-pointer">
                <CheckCircle className="w-3.5 h-3.5" /> Mark Reviewed
              </button>
              <button onClick={() => alert("Added to watchlist!")} className="py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center justify-center gap-1 transition cursor-pointer">
                <BookmarkPlus className="w-3.5 h-3.5" /> Add Watchlist
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}