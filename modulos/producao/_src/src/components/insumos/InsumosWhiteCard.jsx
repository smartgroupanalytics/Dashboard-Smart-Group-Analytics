import React from "react";
import { motion } from "framer-motion";

const THEME = {
  blue: { iconBg: "bg-blue-50", iconText: "text-blue-600", ring: "ring-blue-100" },
  green: { iconBg: "bg-emerald-50", iconText: "text-emerald-600", ring: "ring-emerald-100" },
  amber: { iconBg: "bg-amber-50", iconText: "text-amber-600", ring: "ring-amber-100" },
  purple: { iconBg: "bg-purple-50", iconText: "text-purple-600", ring: "ring-purple-100" },
  red: { iconBg: "bg-red-50", iconText: "text-red-600", ring: "ring-red-100" },
};

export default function InsumosWhiteCard({ label, value, icon: Icon, color = "blue", type = "number", delay = 0 }) {
  const t = THEME[color] || THEME.blue;

  const formatValue = () => {
    if (value == null) return "—";
    if (type === "currency") {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    if (type === "percentage") {
      return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }
    if (type === "integer") {
      return value.toLocaleString("pt-BR");
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
      className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 min-h-[100px] flex flex-col justify-center"
    >
      <div className="flex items-center gap-3">
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ring-1 ${t.iconBg} ${t.ring}`}>
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