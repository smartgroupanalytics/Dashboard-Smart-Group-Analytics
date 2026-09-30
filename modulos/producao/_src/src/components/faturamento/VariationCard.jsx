import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export default function VariationCard({ title, baseLabel, diffValor, diffPct, index = 0, format = "currency", dark = false }) {
  const positive = diffValor > 0;
  const negative = diffValor < 0;
  const zero = diffValor === 0;

  const colorText = positive ? (dark ? "text-emerald-300" : "text-emerald-600") : negative ? (dark ? "text-rose-300" : "text-rose-600") : "text-muted-foreground";
  const colorBg = positive ? (dark ? "bg-emerald-500/20" : "bg-emerald-50") : negative ? (dark ? "bg-rose-500/20" : "bg-rose-50") : "bg-slate-100";
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;
  const sign = positive ? "+" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className={`p-5 h-full ${dark ? "bg-gradient-to-br from-[#0f3563] to-[#1c528f] border-blue-300/30" : ""}`}>
        <p className={`text-base font-bold leading-tight ${dark ? "text-white" : "text-foreground"}`}>{title}</p>
        <p className={`text-[11px] mt-0.5 ${dark ? "text-blue-100" : "text-muted-foreground"}`}>{baseLabel}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className={`flex items-center gap-0.5 px-1.5 py-1 rounded-lg ${colorBg} ${colorText}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="text-sm font-bold">
              {sign}
              {diffPct.toFixed(1).replace(".", ",")}%
            </span>
          </div>
        </div>
        <p className={`mt-2 text-lg font-bold ${colorText}`}>
          {sign}
          {format === "meters"
            ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(diffValor)
            : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(diffValor)}
        </p>
      </Card>
    </motion.div>
  );
}