import React from "react";
import { motion } from "framer-motion";

const THEME = {
  green: { bar: "bg-emerald-500", track: "bg-slate-200", iconBg: "bg-emerald-100", iconText: "text-emerald-600", value: "text-slate-900" },
  orange: { bar: "bg-orange-500", track: "bg-slate-200", iconBg: "bg-orange-100", iconText: "text-orange-600", value: "text-slate-900" },
  amber: { bar: "bg-amber-500", track: "bg-slate-200", iconBg: "bg-amber-100", iconText: "text-amber-600", value: "text-slate-900" },
  blue: { bar: "bg-blue-500", track: "bg-slate-200", iconBg: "bg-blue-100", iconText: "text-blue-600", value: "text-slate-900" },
  purple: { bar: "bg-purple-500", track: "bg-slate-200", iconBg: "bg-purple-100", iconText: "text-purple-600", value: "text-slate-900" },
  red: { bar: "bg-red-500", track: "bg-slate-200", iconBg: "bg-red-100", iconText: "text-red-600", value: "text-slate-900" },
};

export default function DisponibilidadeCard({ label, value, icon: Icon, color, delay = 0 }) {
  const t = THEME[color] || THEME.green;
  const pct = Math.max(0, Math.min(100, value || 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className="bg-gradient-to-br from-white via-slate-50 to-slate-100 border border-slate-300 rounded-2xl p-7 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 min-h-[200px] flex flex-col justify-between"
    >
      <div className="flex items-center gap-4">
        <div className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center ${t.iconBg}`}>
          <Icon className={`w-7 h-7 ${t.iconText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500 leading-tight">{label}</p>
          <p className={`text-3xl font-extrabold tabular-nums mt-1 ${t.value}`}>
            {value != null ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}%
          </p>
        </div>
      </div>
      <div className={`mt-6 h-3 w-full rounded-full overflow-hidden ${t.track}`}>
        <div className={`h-full rounded-full ${t.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </motion.div>
  );
}