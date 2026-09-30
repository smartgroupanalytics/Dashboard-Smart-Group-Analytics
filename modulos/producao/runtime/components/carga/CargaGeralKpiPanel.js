import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { motion } from "framer-motion";
import { Clock, Gauge, Package, CalendarDays, Layers, TrendingUp, Timer } from "lucide-react";
function fmtNum(v, dec = 0) {
    if (v == null || isNaN(v))
        return "—";
    return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
// Mapa de ícones por parâmetro (seção geral)
const iconMap = {
    "Jornada Semanal": { icon: Clock, color: "text-blue-700", bg: "bg-blue-50" },
    "Tempo de Setup": { icon: Timer, color: "text-amber-600", bg: "bg-amber-50" },
    "Tempo Produtivo": { icon: Clock, color: "text-emerald-700", bg: "bg-emerald-50" },
    "Tempo Produtivo + Setup": { icon: Timer, color: "text-violet-700", bg: "bg-violet-50" },
    "Rotatividade Mác.": { icon: Gauge, color: "text-cyan-700", bg: "bg-cyan-50" },
    "Total Carteira": { icon: Package, color: "text-rose-700", bg: "bg-rose-50" },
    "Média Dias Trab.": { icon: CalendarDays, color: "text-slate-700", bg: "bg-slate-100" },
};
export default function CargaGeralKpiPanel({ data }) {
    if (!data)
        return null;
    const { geral = [], maquinas = { colunas: [], linhas: [] } } = data;
    return (_jsxs("div", { className: "space-y-2", children: [geral.length > 0 && (_jsxs("div", { children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-wide mb-2", children: "Resumo Geral" }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2", children: geral.map((item, idx) => {
                            const cfg = iconMap[item.parametro] || { icon: Layers, color: "text-slate-700", bg: "bg-slate-100" };
                            const Icon = cfg.icon;
                            const isDays = item.parametro.toLowerCase().includes("dias");
                            return (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25, delay: idx * 0.04 }, className: "rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm hover:shadow-md transition-shadow", children: [_jsx("div", { className: `w-7 h-7 rounded-md ${cfg.bg} flex items-center justify-center mb-1`, children: _jsx(Icon, { className: `w-3.5 h-3.5 ${cfg.color}` }) }), _jsx("p", { className: "text-[10px] font-semibold text-slate-500 uppercase tracking-wide leading-tight mb-0.5 min-h-[24px]", children: item.parametro }), _jsxs("p", { className: "text-base font-extrabold text-slate-900 tabular-nums leading-tight", children: [fmtNum(item.valor, isDays ? 2 : 0), isDays && _jsx("span", { className: "text-[10px] font-medium text-slate-400 ml-0.5", children: "dias" })] })] }, item.parametro));
                        }) })] })), maquinas.colunas.length > 0 && maquinas.linhas.length > 0 && (_jsxs("div", { children: [_jsx("h3", { className: "text-xs font-bold text-slate-500 uppercase tracking-wide mb-2", children: "Comparativo por M\u00E1quina" }), _jsx("div", { className: "overflow-x-auto rounded-xl border border-slate-200", children: _jsxs("table", { className: "w-full text-sm border-collapse", children: [_jsx("thead", { className: "bg-slate-800", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-1.5 text-left text-white font-semibold whitespace-nowrap", children: "Par\u00E2metro" }), maquinas.colunas.map((col) => (_jsx("th", { className: "px-4 py-1.5 text-right text-white font-semibold whitespace-nowrap", children: col }, col)))] }) }), _jsx("tbody", { children: maquinas.linhas.map((linha, idx) => {
                                        const isDays = linha.parametro.toLowerCase().includes("dias");
                                        return (_jsxs("tr", { className: idx % 2 === 1 ? "bg-slate-50" : "bg-white", children: [_jsx("td", { className: "px-4 py-1 font-medium text-slate-700 whitespace-nowrap", children: linha.parametro }), maquinas.colunas.map((_, ci) => (_jsx("td", { className: "px-4 py-1 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap", children: fmtNum(linha.valores[ci], isDays ? 2 : 0) }, ci)))] }, linha.parametro));
                                    }) })] }) })] }))] }));
}
