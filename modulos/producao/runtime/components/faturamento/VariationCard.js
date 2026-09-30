import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsx(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: index * 0.05 }, children: _jsxs(Card, { className: `p-5 h-full ${dark ? "bg-gradient-to-br from-[#0f3563] to-[#1c528f] border-blue-300/30" : ""}`, children: [_jsx("p", { className: `text-base font-bold leading-tight ${dark ? "text-white" : "text-foreground"}`, children: title }), _jsx("p", { className: `text-[11px] mt-0.5 ${dark ? "text-blue-100" : "text-muted-foreground"}`, children: baseLabel }), _jsx("div", { className: "mt-3 flex items-center gap-2", children: _jsxs("div", { className: `flex items-center gap-0.5 px-1.5 py-1 rounded-lg ${colorBg} ${colorText}`, children: [_jsx(Icon, { className: "w-3.5 h-3.5" }), _jsxs("span", { className: "text-sm font-bold", children: [sign, diffPct.toFixed(1).replace(".", ","), "%"] })] }) }), _jsxs("p", { className: `mt-2 text-lg font-bold ${colorText}`, children: [sign, format === "meters"
                            ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(diffValor)
                            : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(diffValor)] })] }) }));
}
