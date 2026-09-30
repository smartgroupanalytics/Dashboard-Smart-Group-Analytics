import React from "react";
import { motion } from "framer-motion";

const THEME = {
  blue: { iconBg: "bg-blue-100", iconText: "text-blue-600" },
  green: { iconBg: "bg-emerald-100", iconText: "text-emerald-600" },
  red: { iconBg: "bg-red-100", iconText: "text-red-600" },
  amber: { iconBg: "bg-amber-100", iconText: "text-amber-600" },
  purple: { iconBg: "bg-purple-100", iconText: "text-purple-600" },
};

export default function InsumosCard({ label, value, icon: Icon, color = "blue", type = "number", delay = 0 }) {
  const t = THEME[color] || THEME.blue;

  const formatValue = () => {
    if (value == null) return "—";
    if (type === "currency") {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    if (type === "percentage") {
      return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isDiff = type === "difference" || type === "percentage";
  const valueColor = isDiff
    ? (value < 0 ? "text-emerald-600" : "text-rose-600")
    : "text-slate-900";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay }}
      className="bg-gradient-to-br from-white via-slate-50 to-slate-100 border border-slate-300 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 min-h-[100px] flex flex-col justify-center"
    >
      <div className="flex items-center gap-3">
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${t.iconBg}`}>
          <Icon className={`w-5 h-5 ${t.iconText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 truncate">
            {label}
          </p>
          <p className={`text-lg font-extrabold tabular-nums mt-0.5 ${valueColor}`}>
            {formatValue()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}