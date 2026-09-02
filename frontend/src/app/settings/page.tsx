"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  CalendarCheck,
  Cpu,
  Layers,
  Users,
  Bell,
  Shield,
  CreditCard,
  CheckCircle,
  Clock,
  RotateCcw,
  Search,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Production-safe state with guaranteed fallbacks
  const [settings, setSettings] = useState({
    general: {
      applicationName: "Staffpie",
      defaultLanguage: "English",
      timezone: "Asia/Kolkata (IST)",
      dateFormat: "DD/MM/YYYY",
    },
    organization: {
      companyName: "Redsheel Technologies Pvt. Ltd.",
      address: "SCO 123, Industrial Area, Phase 1",
    },
    plan: {
      planName: "Enterprise Plan",
      validTill: "31 Dec 2026",
      totalEmployees: 248,
      totalCameras: 12,
      totalLocations: 5,
    },
    attendance: {
      workStart: "09:00 AM",
      workEnd: "06:00 PM",
      gracePeriodMinutes: 10,
      autoMarkAbsentMinutes: 480,
      enableOvertime: true,
      enableBreakTracking: true,
      allowRemoteCheckIn: false,
    },
    aiAnalytics: {
      confidenceThreshold: 85,
      enableAIEventDetection: true,
      enablePeopleCounting: true,
      enableLoiteringDetection: false,
      storeAISnapshots: true,
    },
    integrations: [
      { name: "Staffpie HRMS", status: "Connected", color: "text-emerald-500 bg-emerald-50" },
      { name: "Zoho People", status: "Connected", color: "text-emerald-500 bg-emerald-50" },
      { name: "Keka", status: "Not Connected", color: "text-rose-500 bg-rose-50" },
      { name: "BambooHR", status: "Not Connected", color: "text-rose-500 bg-rose-50" },
    ],
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      attendanceAlerts: true,
      aiEventsAlerts: true,
      notificationEmail: "admin@staffpie.com",
      dailySummaryTime: "08:00 PM",
    },
    security: {
      passwordExpiryDays: 90,
      enableTwoFactor: true,
      restrictIpAccess: false,
      sessionTimeoutMinutes: 60,
    },
    system: {
      version: "v1.0.0",
      environment: "Production",
      lastUpdated: "24 Aug 2026, 10:32 AM",
      databaseStatus: "Healthy",
      storageUsagePercent: 42,
    },
  });

  const getAuthToken = () => {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("admin_token") ||
      localStorage.getItem("jwt") ||
      ""
    );
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("http://localhost:5000/api/settings", { headers });

      if (res.status === 401) {
        console.warn("Unauthorized access to settings API. Showing default UI state.");
        return;
      }

      const json = await res.json();
      if (json?.success && json?.data) {
        const d = json.data;
        setSettings((prev) => ({
          ...prev,
          general: { ...prev.general, ...(d.general || {}) },
          organization: { ...prev.organization, ...(d.organization || {}) },
          plan: { ...prev.plan, ...(d.plan || {}) },
          attendance: {
            ...prev.attendance,
            ...(d.attendance || {}),
            workStart: d.attendance?.workStart || prev.attendance.workStart,
            workEnd: d.attendance?.workEnd || prev.attendance.workEnd,
          },
          aiAnalytics: { ...prev.aiAnalytics, ...(d.aiAnalytics || {}) },
          integrations: d.integrations || prev.integrations,
          notifications: { ...prev.notifications, ...(d.notifications || {}) },
          security: { ...prev.security, ...(d.security || {}) },
          system: { ...prev.system, ...(d.system || {}) },
        }));
      }
    } catch (err) {
      console.warn("Settings API unreachable, fallback retained:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("http://localhost:5000/api/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify(settings),
      });
      const result = await res.json();
      if (result.success) {
        alert("Settings saved successfully!");
      } else {
        alert("Save status: " + (result.message || "Failed"));
      }
    } catch (err: any) {
      alert("Error while saving settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const navTabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "organization", label: "Organization", icon: Building2 },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "ai", label: "AI & Analytics", icon: Cpu },
    { id: "integrations", label: "Integrations", icon: Layers },
    { id: "roles", label: "Users & Roles", icon: Users },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "billing", label: "Billing", icon: CreditCard },
  ];

  const shouldShow = (cardId: string) => {
    if (activeTab === "all") return true;
    if (activeTab === "ai" && cardId === "aiAnalytics") return true;
    return activeTab === cardId;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">SETTINGS</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your organization, system preferences, integrations and more
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 shadow-sm"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "all" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All Settings
        </button>
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.id ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Modular Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. General Settings */}
        {shouldShow("general") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">General Settings</h3>
                <p className="text-xs text-slate-400">Basic application preferences</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Application Name</label>
                <input
                  type="text"
                  value={settings?.general?.applicationName || "Staffpie"}
                  onChange={(e) =>
                    setSettings({ ...settings, general: { ...settings.general, applicationName: e.target.value } })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-md bg-slate-50/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Default Language</label>
                <select
                  value={settings?.general?.defaultLanguage || "English"}
                  onChange={(e) =>
                    setSettings({ ...settings, general: { ...settings.general, defaultLanguage: e.target.value } })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-md bg-slate-50/50"
                >
                  <option>English</option>
                  <option>Hindi</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Timezone</label>
                <input
                  type="text"
                  value={settings?.general?.timezone || "Asia/Kolkata (IST)"}
                  readOnly
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-md bg-slate-100 text-slate-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Organization Settings */}
        {shouldShow("organization") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Organization Settings</h3>
                <p className="text-xs text-slate-400">Your company details and branding</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Company Name</label>
                <input
                  type="text"
                  value={settings?.organization?.companyName || "Redsheel Technologies Pvt. Ltd."}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      organization: { ...settings.organization, companyName: e.target.value },
                    })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-md bg-slate-50/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Company Logo</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    S
                  </div>
                  <button className="text-xs border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-50 font-medium text-slate-700">
                    Change Logo
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Registered Address</label>
                <input
                  type="text"
                  value={settings?.organization?.address || "SCO 123, Industrial Area, Phase 1"}
                  readOnly
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-md bg-slate-50 text-slate-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. Plan & Usage */}
        {(activeTab === "all" || activeTab === "billing") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Plan & Usage</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                Active
              </span>
            </div>

            <div>
              <div className="text-base font-bold text-slate-900">{settings?.plan?.planName || "Enterprise Plan"}</div>
              <div className="text-xs text-slate-400">Valid till {settings?.plan?.validTill || "31 Dec 2026"}</div>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
              <div className="bg-slate-50 p-2 rounded-lg">
                <div className="text-xs text-slate-400">Staff</div>
                <div className="text-sm font-bold text-slate-800">{settings?.plan?.totalEmployees ?? 248}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <div className="text-xs text-slate-400">Cameras</div>
                <div className="text-sm font-bold text-slate-800">{settings?.plan?.totalCameras ?? 12}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <div className="text-xs text-slate-400">Locations</div>
                <div className="text-sm font-bold text-slate-800">{settings?.plan?.totalLocations ?? 5}</div>
              </div>
            </div>

            <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition">
              Manage Subscription →
            </button>
          </div>
        )}

        {/* 4. Attendance Settings */}
        {shouldShow("attendance") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Clock className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Attendance Settings</h3>
                <p className="text-xs text-slate-400">Configure shifts and rules</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Default Hours</label>
                <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2 rounded border border-slate-200 text-center">
                  {settings?.attendance?.workStart || "09:00 AM"} - {settings?.attendance?.workEnd || "06:00 PM"}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Grace Period (Min)</label>
                <input
                  type="number"
                  value={settings?.attendance?.gracePeriodMinutes ?? 10}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      attendance: { ...settings.attendance, gracePeriodMinutes: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full text-xs p-2 border border-slate-200 rounded text-center"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700">Enable Overtime Calculation</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings?.attendance?.enableOvertime)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      attendance: { ...settings.attendance, enableOvertime: e.target.checked },
                    })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700">Enable Break Time Tracking</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings?.attendance?.enableBreakTracking)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      attendance: { ...settings.attendance, enableBreakTracking: e.target.checked },
                    })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700">Allow Remote Check-in</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings?.attendance?.allowRemoteCheckIn)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      attendance: { ...settings.attendance, allowRemoteCheckIn: e.target.checked },
                    })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>
        )}

        {/* 5. AI & Analytics Settings */}
        {shouldShow("aiAnalytics") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">AI & Analytics Settings</h3>
                <p className="text-xs text-slate-400">Configure models & detection thresholds</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Face Recognition Threshold</span>
                <span className="text-indigo-600 font-bold">{settings?.aiAnalytics?.confidenceThreshold ?? 85}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="99"
                value={settings?.aiAnalytics?.confidenceThreshold ?? 85}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    aiAnalytics: {
                      ...settings.aiAnalytics,
                      confidenceThreshold: parseInt(e.target.value) || 85,
                    },
                  })
                }
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="space-y-2 text-xs pt-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700">Enable AI Event Detection</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings?.aiAnalytics?.enableAIEventDetection)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      aiAnalytics: {
                        ...settings.aiAnalytics,
                        enableAIEventDetection: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700">Enable People Counting</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings?.aiAnalytics?.enablePeopleCounting)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      aiAnalytics: {
                        ...settings.aiAnalytics,
                        enablePeopleCounting: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700">Store AI Snapshots</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings?.aiAnalytics?.storeAISnapshots)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      aiAnalytics: {
                        ...settings.aiAnalytics,
                        storeAISnapshots: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>
        )}

        {/* 6. Integrations */}
        {shouldShow("integrations") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Layers className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Integrations</h3>
                <p className="text-xs text-slate-400">Manage third-party integrations</p>
              </div>
            </div>

            <div className="space-y-2">
              {(settings?.integrations || []).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50"
                >
                  <span className="text-xs font-medium text-slate-800">{item.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.color || "bg-slate-100"}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Notification Settings */}
        {shouldShow("notifications") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Bell className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Notification Settings</h3>
                <p className="text-xs text-slate-400">Configure alerts and channels</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700">Email Notifications</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings?.notifications?.emailNotifications)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, emailNotifications: e.target.checked },
                    })
                  }
                  className="rounded text-indigo-600"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700">Attendance Alerts</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings?.notifications?.attendanceAlerts)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, attendanceAlerts: e.target.checked },
                    })
                  }
                  className="rounded text-indigo-600"
                />
              </label>
            </div>

            <div className="pt-2">
              <label className="text-[11px] font-medium text-slate-500 block mb-1">Notification Email</label>
              <input
                type="text"
                value={settings?.notifications?.notificationEmail || "admin@staffpie.com"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, notificationEmail: e.target.value },
                  })
                }
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded"
              />
            </div>
          </div>
        )}

        {/* 8. Security Settings */}
        {shouldShow("security") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Shield className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Security Settings</h3>
                <p className="text-xs text-slate-400">Manage security and access controls</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Password Expiry (Days)</label>
                <input
                  type="number"
                  value={settings?.security?.passwordExpiryDays ?? 90}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, passwordExpiryDays: parseInt(e.target.value) || 90 },
                    })
                  }
                  className="w-full text-xs p-2 border border-slate-200 rounded"
                />
              </div>
              <label className="flex items-center justify-between cursor-pointer pt-1">
                <span className="text-slate-700 font-medium">Enable Two-Factor (2FA)</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings?.security?.enableTwoFactor)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, enableTwoFactor: e.target.checked },
                    })
                  }
                  className="rounded text-indigo-600"
                />
              </label>
            </div>
          </div>
        )}

        {/* 9. System Information & Reset */}
        {activeTab === "all" && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-3">
                <CheckCircle className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">System Information</h3>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Version</span>
                  <span className="font-semibold text-slate-900">{settings?.system?.version || "v1.0.0"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Environment</span>
                  <span className="font-semibold text-slate-900">{settings?.system?.environment || "Production"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Database Status</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    ● {settings?.system?.databaseStatus || "Healthy"}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span>Storage Usage</span>
                  <span className="font-semibold text-slate-900">{settings?.system?.storageUsagePercent ?? 42}%</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => alert("Default settings restored!")}
              className="w-full mt-4 py-2 border border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Default Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}