"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email?: string;
  mobile?: string;
  department?: { name: string };
  designation?: string;
  status: string;
  createdAt: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All departments");
  const [selectedDesig, setSelectedDesig] = useState("All designations");
  const [selectedStatus, setSelectedStatus] = useState("All statuses");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    employeeCode: "",
    email: "",
    mobile: "",
    designation: "",
    departmentName: "",
    status: "ACTIVE"
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    const res = await fetchWithAuth<Employee[]>("/api/employees").catch(() => ({ success: false, data: [] }));
    if (res.success && res.data) {
      setEmployees(res.data);
    }
    setLoading(false);
  }

  // Derived unique lists for dropdowns
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department?.name).filter(Boolean));
    return ["All departments", ...Array.from(depts)];
  }, [employees]);

  const designations = useMemo(() => {
    const desigs = new Set(employees.map(e => e.designation).filter(Boolean));
    return ["All designations", ...Array.from(desigs)];
  }, [employees]);

  // Filtered Data
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()));
        
      const matchesDept = selectedDept === "All departments" || emp.department?.name === selectedDept;
      const matchesDesig = selectedDesig === "All designations" || emp.designation === selectedDesig;
      const matchesStatus = selectedStatus === "All statuses" || 
        (selectedStatus === "Active" && emp.status === "ACTIVE") || 
        (selectedStatus === "Inactive" && emp.status === "INACTIVE");

      return matchesSearch && matchesDept && matchesDesig && matchesStatus;
    });
  }, [employees, searchTerm, selectedDept, selectedDesig, selectedStatus]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Stats
  const activeCount = employees.filter(e => e.status === "ACTIVE").length;
  const inactiveCount = employees.filter(e => e.status === "INACTIVE").length;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const newJoineesCount = employees.filter(e => {
    const d = new Date(e.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const handleReset = () => {
    setSearchTerm("");
    setSelectedDept("All departments");
    setSelectedDesig("All designations");
    setSelectedStatus("All statuses");
    setCurrentPage(1);
    loadEmployees();
  };

  // --- CRUD Handlers ---

  const openAddModal = () => {
    setModalMode("add");
    setEditingId(null);
    setFormData({
      name: "", employeeCode: "", email: "", mobile: "", designation: "", departmentName: "", status: "ACTIVE"
    });
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setModalMode("edit");
    setEditingId(emp.id);
    setFormData({
      name: emp.name || "",
      employeeCode: emp.employeeCode || "",
      email: emp.email || "",
      mobile: emp.mobile || "",
      designation: emp.designation || "",
      departmentName: emp.department?.name || "",
      status: emp.status || "ACTIVE"
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = modalMode === "add" ? "/api/employees" : `/api/employees/${editingId}`;
      const method = modalMode === "add" ? "POST" : "PUT";

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (res.success) {
        setIsModalOpen(false);
        loadEmployees(); // Reload list
      } else {
        alert(res.message || "An error occurred");
      }
    } catch (err) {
      alert("Failed to save employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) {
      const res = await fetchWithAuth(`/api/employees/${id}`, { method: "DELETE" });
      if (res.success) {
        loadEmployees();
      } else {
        alert(res.message || "Failed to delete employee");
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ["Employee ID", "Name", "Email", "Mobile", "Department", "Designation", "Status", "Join Date"];
    const csvRows = [];
    csvRows.push(headers.join(","));

    filteredEmployees.forEach(emp => {
      const row = [
        emp.employeeCode,
        `"${emp.name}"`,
        emp.email || "",
        emp.mobile || "",
        `"${emp.department?.name || ""}"`,
        `"${emp.designation || ""}"`,
        emp.status,
        emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : ""
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `employees_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportSync = async () => {
    if (window.confirm("This will trigger a sync with the HRMS system. Do you want to proceed?")) {
      const res = await fetchWithAuth("/api/employees/sync", { method: "POST" });
      if (res.success) {
        alert("Sync completed successfully!");
        loadEmployees();
      } else {
        alert("Sync failed: " + (res.message || "Unknown error"));
      }
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto bg-[#F8FAFC] min-h-screen relative">
      {/* 1. Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Employees</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage your workforce and employee profiles</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition"
          >
            <Download size={16} /> Export
          </button>
          <button 
            onClick={handleImportSync}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition"
          >
            <Upload size={16} /> Import
          </button>
          <button 
            onClick={openAddModal}
            className="px-5 py-2 bg-[#6366F1] hover:bg-[#5046E5] text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition"
          >
            <UserPlus size={16} /> Add Employee
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <span className="text-sm font-bold text-slate-700">Total Employees</span>
          </div>
          <p className="text-4xl font-black text-slate-900 mb-2">{employees.length}</p>
          <div className="absolute -right-4 -bottom-4 opacity-5 text-indigo-600">
             <Users size={120} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck size={20} />
            </div>
            <span className="text-sm font-bold text-slate-700">Active Employees</span>
          </div>
          <p className="text-4xl font-black text-slate-900 mb-2">{activeCount}</p>
          <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-600">
             <UserCheck size={120} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <UserX size={20} />
            </div>
            <span className="text-sm font-bold text-slate-700">Inactive Employees</span>
          </div>
          <p className="text-4xl font-black text-slate-900 mb-2">{inactiveCount}</p>
          <div className="absolute -right-4 -bottom-4 opacity-5 text-rose-600">
             <UserX size={120} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <span className="text-sm font-bold text-slate-700">New Joinees (This Month)</span>
          </div>
          <p className="text-4xl font-black text-slate-900 mb-2">{newJoineesCount}</p>
          <div className="absolute -right-4 -bottom-4 opacity-5 text-blue-600">
             <UserPlus size={120} />
          </div>
        </div>
      </div>

      {/* 3. Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code, or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
          
          <select 
            value={selectedDept}
            onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer min-w-[160px]"
          >
            {departments.map(d => <option key={d as string} value={d as string}>{d}</option>)}
          </select>

          <select 
            value={selectedDesig}
            onChange={(e) => { setSelectedDesig(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer min-w-[160px]"
          >
            {designations.map(d => <option key={d as string} value={d as string}>{d}</option>)}
          </select>

          <select 
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer min-w-[140px]"
          >
            <option value="All statuses">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition">
            <Filter size={16} /> More Filters
          </button>
          <button 
            onClick={handleReset}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition"
          >
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

      {/* 4. Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4 w-12 text-center"><input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" /></th>
                <th className="p-4">EMPLOYEE ID</th>
                <th className="p-4">NAME</th>
                <th className="p-4">PHOTO</th>
                <th className="p-4">DEPARTMENT</th>
                <th className="p-4">DESIGNATION</th>
                <th className="p-4">MOBILE</th>
                <th className="p-4">STATUS</th>
                <th className="p-4">JOIN DATE</th>
                <th className="p-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <Loader2 size={32} className="animate-spin mx-auto mb-4 text-indigo-600" />
                    <p className="font-medium text-base">Loading employees...</p>
                  </td>
                </tr>
              ) : paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <p className="font-medium text-base text-slate-600 mb-1">No employees found</p>
                    <p className="text-sm">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-4 text-center">
                       <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    </td>
                    <td className="p-4 font-mono text-slate-600">{emp.employeeCode}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{emp.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{emp.email || "-"}</p>
                    </td>
                    <td className="p-4">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                        {emp.name ? emp.name.charAt(0).toUpperCase() : "?"}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">{emp.department?.name || "-"}</td>
                    <td className="p-4 text-slate-600">{emp.designation || "-"}</td>
                    <td className="p-4 text-slate-600">{emp.mobile || "-"}</td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-md text-[11px] font-bold ${
                          emp.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {emp.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">
                       {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-3 text-slate-400">
                        <button className="hover:text-slate-800 transition-colors" title="View"><Eye size={16} /></button>
                        <button 
                          onClick={() => openEditModal(emp)}
                          className="hover:text-indigo-600 transition-colors" title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(emp.id, emp.name)}
                          className="hover:text-rose-600 transition-colors" title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && filteredEmployees.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between text-sm">
            <span className="text-slate-500 font-medium">
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button 
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                      currentPage === pageNum 
                        ? 'bg-indigo-600 text-white border border-indigo-600' 
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              
              {totalPages > 5 && <span className="px-2 text-slate-400">...</span>}
              {totalPages > 5 && (
                 <button 
                    onClick={() => setCurrentPage(totalPages)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors border border-slate-200 text-slate-600 hover:bg-slate-50`}
                  >
                    {totalPages}
                 </button>
              )}

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- ADD / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900">
                {modalMode === "add" ? "Add New Employee" : "Edit Employee"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employee Code *</label>
                  <input 
                    required 
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({...formData, employeeCode: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                    placeholder="e.g. EMP001" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                    placeholder="John Doe" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                    placeholder="john@example.com" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile</label>
                  <input 
                    value={formData.mobile}
                    onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                    placeholder="+91 9876543210" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <input 
                    value={formData.departmentName}
                    onChange={(e) => setFormData({...formData, departmentName: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                    placeholder="e.g. Engineering" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <input 
                    value={formData.designation}
                    onChange={(e) => setFormData({...formData, designation: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                    placeholder="e.g. Developer" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
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
                  {modalMode === "add" ? "Save Employee" : "Update Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}