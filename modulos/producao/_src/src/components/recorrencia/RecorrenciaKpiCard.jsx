import React from "react";
import { ArrowUpRight } from "lucide-react";

export default function RecorrenciaKpiCard({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="p-1.5 rounded-lg bg-slate-50">
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>
      <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}