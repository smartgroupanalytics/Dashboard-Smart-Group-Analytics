import React from "react";

export default function LightHeader({ icon: Icon, title, subtitle, children, className = "" }) {
  return (
    <div className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 px-4 py-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}