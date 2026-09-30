import React from "react";

export default function FuturisticHeader({ icon: Icon, title, subtitle, children, className = "", titleClassName = "" }) {
  return (
    <div className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-[#0a2540] via-[#0d2d52] to-[#163b66] px-4 py-4 shadow-[0_12px_40px_-8px_rgba(34,211,238,0.45),0_6px_16px_-4px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.35),inset_0_-2px_10px_-2px_rgba(0,0,0,0.3)] ${className}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-slate-900/80 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-cyan-300/40">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h1 className={`text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_0_12px_rgba(34,211,238,0.6)] ${titleClassName}`}>{title}</h1>
          {subtitle && <p className="text-sm text-cyan-100/90">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}