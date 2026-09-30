import React from "react";
import { motion } from "framer-motion";

// Pastéis suaves (background do ícone) + cor do ícone
const PASTELS = {
  blue: { bg: "#D1E7FF", fg: "#007BFF" },
  green: { bg: "#D1F7D1", fg: "#00A86B" },
  yellow: { bg: "#FFF3CD", fg: "#B7791F" },
  pink: { bg: "#F8D7DA", fg: "#E83E8C" },
};

export default function RevisaoKpiCard({ title, value, icon: Icon, accent = "blue", index = 0 }) {
  const p = PASTELS[accent] || PASTELS.blue;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_16px_40px_-12px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-300 p-5 h-full"
    >
      <div className="flex flex-col gap-3 h-full">
        {Icon && (
          <div
            className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: p.bg }}
          >
            <Icon className="w-7 h-7" style={{ color: p.fg }} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 leading-tight">
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}