import React from "react";
import { motion } from "framer-motion";

const TEAL = "#008785";
const CARD_BG = "#F8F9FA";

function fmtNum(n) {
  return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function FaltaProgramarSection({ semanaLabel, total, items, index = 0 }) {
  const maxVal = Math.max(...(items || []).map((i) => i.metros || 0), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
      className="rounded-2xl shadow-lg overflow-hidden border border-slate-300 h-full flex flex-col"
      style={{ background: CARD_BG }}
    >
      <div className="px-5 py-5 text-white text-center" style={{ background: TEAL }}>
        <h3 className="text-lg font-bold tracking-wide">
          Falta Programar ({semanaLabel}) = <span className="text-2xl font-extrabold">{fmtNum(total)}</span> metros
        </h3>
      </div>
      <div className="p-6 space-y-8 flex-1 flex flex-col justify-center bg-white">
        {(items || []).map((item, i) => {
          const pct = (item.metros / maxVal) * 100;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-800">{item.categoria}</span>
                <span className="text-xl font-extrabold text-slate-900 tabular-nums">{fmtNum(item.metros)} <span className="text-xs font-semibold text-slate-500">metros</span></span>
              </div>
              <div className="h-4 rounded-full bg-slate-200 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.05 }}
                  className="h-full rounded-full"
                  style={{ background: TEAL }}
                />
              </div>
            </div>
          );
        })}
        {(!items || items.length === 0) && (
          <p className="text-sm text-slate-400 text-center py-4">Nenhum item cadastrado.</p>
        )}
      </div>
    </motion.div>
  );
}