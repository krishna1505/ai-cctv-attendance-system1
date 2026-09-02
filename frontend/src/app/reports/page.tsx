"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileCheck,
  Loader2,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

interface GeneratedReport {
  id: string;
  title: string;
  size: string;
  records: string;
  created_at: string;
  download_url: string;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState("attendance");
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    const res = await fetchWithAuth<GeneratedReport[]>("/api/reports/history");
    if (res.success && res.data) {
      setReports(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const res = await fetchWithAuth<{ download_url: string }>(
        `/api/reports/export?type=${reportType}&format=${format}`,
        { method: "POST" }
      );
      if (res.success && res.data?.download_url) {
        window.open(res.data.download_url, "_blank");
      }
      await loadReports();
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  return (
    <div className="p-8 space-y-7 max-w-[1600px] mx-auto bg-[#F8FAFC]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Workforce Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate and export official attendance registers and zone presence summaries[cite: 5]
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={generating}
          className="px-4 py-2.5 bg-[#6366F1] hover:bg-[#5046E5] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-indigo-100 disabled:opacity-50 transition"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {generating ? "Exporting File..." : "Generate & Export"}
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <h2 className="text-sm font-bold text-slate-900">Configure Export Parameters</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
            >
              <option value="attendance">Daily Attendance Register</option>
              <option value="presence">Zone & Desk Presence Summary</option>
              <option value="timeline">Employee Activity Timeline</option>
              <option value="audit">HRMS Sync Audit Ledger</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Export Format</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  format === "csv"
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <FileSpreadsheet size={14} /> CSV / Excel
              </button>
              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  format === "pdf"
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <FileCheck size={14} /> PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Generated Reports Archive</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <Loader2 size={18} className="animate-spin mx-auto mb-2 text-indigo-600" />
            Loading reports archive...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No exported reports generated yet. Click "Generate & Export" to build one[cite: 5].
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {reports.map((rep) => (
              <div key={rep.id} className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                    <FileText size={15} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{rep.title}</p>
                    <p className="text-[11px] text-slate-400">{rep.size} • {rep.records}</p>
                  </div>
                </div>
                <a
                  href={rep.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Download size={13} /> Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}