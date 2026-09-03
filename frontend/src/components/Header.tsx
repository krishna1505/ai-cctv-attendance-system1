"use client";

import React, { useEffect, useState } from "react";
import { Search, Bell, Calendar, ChevronDown, Users, Camera, Layers, FileText, Settings, Activity, UserCheck, ScanLine, RefreshCw, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";

interface CurrentUser {
  name: string;
  role: string;
}

const searchablePages = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, category: "Overview" },
  { name: "Employees", href: "/employees", icon: Users, category: "Management" },
  { name: "Cameras", href: "/cameras", icon: Camera, category: "Management" },
  { name: "Zones", href: "/zones", icon: Layers, category: "Management" },
  { name: "AI Attendance", href: "/attendance", icon: UserCheck, category: "AI & Attendance" },
  { name: "Presence Analytics", href: "/analytics", icon: Activity, category: "AI & Attendance" },
  { name: "AI Events", href: "/ai-events", icon: ScanLine, category: "AI & Attendance" },
  { name: "Reports", href: "/reports", icon: FileText, category: "Reports & Tools" },
  { name: "HRMS Sync", href: "/hrms-sync", icon: RefreshCw, category: "Reports & Tools" },
  { name: "Settings", href: "/settings", icon: Settings, category: "System" },
];

export default function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser>({
    name: "Admin User",
    role: "Company Admin",
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("staffpie_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser({
          name: parsed.name || parsed.firstName || "Company Admin",
          role: parsed.role || "Administrator",
        });
      } catch (e) {
        console.error("Failed to parse user session", e);
      }
    }
  }, []);

  // Keyboard shortcut Ctrl + K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name.slice(0, 2) || "AD").toUpperCase();
  };

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const filteredResults = searchablePages.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-50">
      {/* Interactive Global Search Bar */}
      <div className="relative w-96">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="global-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="Search employees, cameras, zones..."
          className="w-full pl-9 pr-16 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-medium text-slate-400">
          Ctrl + K
        </span>

        {/* Search Results Dropdown */}
        {isOpen && searchQuery.trim() !== "" && (
          <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
            <div className="p-2 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 bg-slate-50">
              Matching Pages ({filteredResults.length})
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredResults.length > 0 ? (
                filteredResults.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.href}
                      onMouseDown={() => {
                        router.push(item.href);
                        setSearchQuery("");
                        setIsOpen(false);
                      }}
                      className="flex items-center justify-between px-3.5 py-2.5 hover:bg-indigo-50/60 cursor-pointer transition text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                          <Icon size={14} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400">{item.category}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">Go →</span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching results found for "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700">
          <Calendar size={13} className="text-slate-500" />
          <span>{todayFormatted}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs font-bold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live</span>
          <ChevronDown size={12} className="text-emerald-600 ml-0.5" />
        </div>

        <div className="relative p-2 text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
            0
          </span>
        </div>

        {/* Dynamic User Profile Avatar & Role */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
            {getInitials(user.name)}
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-400">{user.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}