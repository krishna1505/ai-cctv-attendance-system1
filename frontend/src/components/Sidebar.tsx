"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Camera,
  Layers,
  UserCheck,
  Activity,
  ScanLine,
  FileText,
  RefreshCw,
  Settings,
  HelpCircle,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Employees", href: "/employees", icon: Users },
      { name: "Cameras", href: "/cameras", icon: Camera },
      { name: "Zones", href: "/zones", icon: Layers },
    ],
  },
  {
    title: "AI & ATTENDANCE",
    items: [
      { name: "AI Attendance", href: "/attendance", icon: UserCheck },
      { name: "Presence Analytics", href: "/analytics", icon: Activity },
      { name: "AI Events", href: "/ai-events", icon: ScanLine },
    ],
  },
  {
    title: "REPORTS & TOOLS",
    items: [
      { name: "Reports", href: "/reports", icon: FileText },
      { name: "HRMS Sync", href: "/hrms-sync", icon: RefreshCw },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-white text-slate-600 min-h-screen flex flex-col border-r border-slate-200/80 shrink-0 select-none">
      {/* Brand Logo */}
      <div className="h-16 px-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
          <span className="font-extrabold text-base tracking-tighter">S</span>
        </div>
        <span className="text-xl font-extrabold tracking-tight text-slate-900 font-sans">
          staffpie
        </span>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.title && (
              <h2 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {section.title}
              </h2>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#6366F1] text-white shadow-md shadow-indigo-100 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-white" : "text-slate-500"} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Help Widget & Version */}
      <div className="p-4 border-t border-slate-100">
        <div className="p-3 bg-violet-50/70 border border-violet-100 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-violet-100/60 transition">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-violet-200/80 flex items-center justify-center text-violet-700">
              <HelpCircle size={15} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">Need Help?</p>
              <p className="text-[10px] text-slate-500">Contact support</p>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-400" />
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-3 font-medium">v1.0.0 • © 2026 Staffpie</p>
      </div>
    </aside>
  );
}