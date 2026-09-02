"use client";

import React, { useEffect, useState } from "react";
import { Search, Bell, Calendar, ChevronDown } from "lucide-react";

interface CurrentUser {
  name: string;
  role: string;
}

export default function Header() {
  const [user, setUser] = useState<CurrentUser>({
    name: "Admin User",
    role: "Company Admin",
  });

  useEffect(() => {
    // Read logged-in user profile saved during StaffPie login
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

  // Generate dynamic 2-letter initials (e.g. "Krishna Yadav" -> "KY")
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name.slice(0, 2) || "AD").toUpperCase();
  };

  // Current formatted dynamic date
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="relative w-96">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search employees, cameras, zones..."
          className="w-full pl-9 pr-16 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-medium text-slate-400">
          Ctrl + K
        </span>
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
            3
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