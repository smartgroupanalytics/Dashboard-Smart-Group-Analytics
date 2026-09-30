import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

const ACCENTS = {
  blue: "text-blue-600 bg-blue-50",
  cyan: "text-cyan-600 bg-cyan-50",
  emerald: "text-emerald-600 bg-emerald-50",
  amber: "text-amber-600 bg-amber-50",
  orange: "text-orange-600 bg-orange-50",
  violet: "text-violet-600 bg-violet-50",
  rose: "text-rose-600 bg-rose-50",
  slate: "text-slate-600 bg-slate-100",
};

export default function KpiCard({ title, value, subtitle, icon: Icon, accent = "slate", isCalculated = false, index = 0, cardClassName = "", dark = false }) {
  const titleCls = dark ? "text-xs font-semibold text-white leading-tight" : "text-sm font-semibold text-slate-700 leading-tight";
  const valueCls = dark ? "mt-3 text-xl font-bold tracking-tight text-white" : "mt-3 text-2xl font-extrabold tracking-tight text-slate-900";
  const subCls = dark ? "mt-1 text-[11px] text-blue-100" : "mt-1 text-xs text-slate-500";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className={`p-5 h-full hover:shadow-md transition-shadow ${cardClassName}`}>
        <div className="flex items-start justify-between gap-2">
          <p className={titleCls}>{title}</p>
          {Icon && (
            <div className={`shrink-0 p-1.5 rounded-lg ${ACCENTS[accent]}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
        <p className={valueCls}>{value}</p>
        {subtitle && <p className={subCls}>{subtitle}</p>}
        {isCalculated && (
          <span className="inline-block mt-2 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
            Calculado
          </span>
        )}
      </Card>
    </motion.div>
  );
}