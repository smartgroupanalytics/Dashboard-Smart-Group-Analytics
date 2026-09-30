import React from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Timer, Hourglass, RotateCw, Briefcase, BarChart3, Cog } from "lucide-react";

function fmtNum(v) {
  if (v == null || isNaN(v)) return "—";
  const dec = Math.abs(v) < 100 ? 2 : 0;
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

const ICON_MAP = {
  "Jornada Semanal": Calendar,
  "Tempo de Setup": Clock,
  "Tempo Produtivo": Timer,
  "Tempo Produtivo + Setup": Hourglass,
  "Rotatividade M\u00e1q.": RotateCw,
  "Total Carteira": Briefcase,
  "M\u00e9dia Dias Trab.": BarChart3,
};

const GROUPS = [
  { title: "Jornada", keys: ["Jornada Semanal", "Tempo de Setup", "Tempo Produtivo"] },
  { title: "Produ\u00e7\u00e3o & Carteira", keys: ["Tempo Produtivo + Setup", "Rotatividade M\u00e1q.", "Total Carteira"] },
  { title: "M\u00e9dia", keys: ["M\u00e9dia Dias Trab."] },
];

export default function CargaParametrosPanel({ parametros }) {
  if (!parametros?.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {GROUPS.map((group, gi) => {
        const items = group.keys
          .map((k) => parametros.find((p) => p.parametro === k))
          .filter(Boolean);
        if (!items.length) return null;
        return (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: gi * 0.08 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            <h3 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide px-5 py-3 bg-[#008B8B]">
              <Cog className="w-4 h-4" />
              {group.title}
            </h3>
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const Icon = ICON_MAP[item.parametro] || BarChart3;
                return (
                  <div key={item.id || item.parametro} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-[#008B8B]" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{item.parametro}</span>
                    </div>
                    <span className="text-lg font-extrabold text-slate-900 tabular-nums">{fmtNum(item.valor)}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}