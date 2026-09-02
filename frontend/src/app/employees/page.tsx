"use client";

import React, { useEffect, useState } from "react";
import {
  Search,
  Download,
  Upload,
  UserPlus,
  Filter,
  RotateCcw,
  Eye,
  Pencil,
  Trash2,
  Users,
  UserCheck,
  UserX,
  Clock,
  Loader2,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface Employee {
  id: string;
  employee_code: string;
  name: string;
  email?: string;
  department?: { name: string };
  designation?: string;
  status: string;
  created_at: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadEmployees() {
      setLoading(true);
      const res = await fetchWithAuth<Employee[]>("/api/employees");
      if (res.success && res.data) {
        setEmployees(res.data);
      }
      setLoading(false);
    }
    loadEmployees();
  }, []);

  const filtered = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = employees.filter((e) => e.status === "ACTIVE").length;

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto bg-[#F8FAFC]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Employees</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage your workforce and employee profiles</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-2">
            <Download size={14} /> Export
          </button>
          <button className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-2">
            <Upload size={14} /> Import
          </button>
          <button className="px-4 py-2 bg-[#6366F1] hover:bg-[#5046E5] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-indigo-100">
            <UserPlus size={14} /> Add Employee
          </button>
        </div>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <Users size={16} />
          </div>
          <span className="text-xs font-semibold text-slate-500">Total Employees</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{employees.length}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <UserCheck size={16} />
          </div>
          <span className="text-xs font-semibold text-slate-500">Active Employees</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <UserX size={16} />
          </div>
          <span className="text-xs font-semibold text-slate-500">Inactive Employees</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{employees.length - activeCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
            <Clock size={16} />
          </div>
          <span className="text-xs font-semibold text-slate-500">New Sync Profiles</span>
          <p className="text-2xl font-black text-slate-900 mt-1">--</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={() => {
            setSearch("");
            setLoading(true);
            fetchWithAuth<Employee[]>("/api/employees").then((res) => {
              if (res.data) setEmployees(res.data);
              setLoading(false);
            });
          }}
          className="p-2 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-xl"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Table with Loading / Empty / Live Data */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">EMPLOYEE ID</th>
                <th className="p-4">NAME</th>
                <th className="p-4">DEPARTMENT</th>
                <th className="p-4">DESIGNATION</th>
                <th className="p-4">STATUS</th>
                <th className="p-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                    Fetching employees from database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No employee records found in database. Please run HRMS Sync[cite: 1].
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4 font-mono font-medium text-slate-700">{emp.employee_code}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{emp.name}</p>
                      <p className="text-[11px] text-slate-400">{emp.email || "No email"}</p>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">{emp.department?.name || "General"}</td>
                    <td className="p-4 text-slate-600">{emp.designation || "--"}</td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          emp.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <button className="hover:text-slate-700"><Eye size={14} /></button>
                        <button className="hover:text-indigo-600"><Pencil size={14} /></button>
                        <button className="hover:text-rose-600"><Trash2 size={14} /></button>
                      </div>
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