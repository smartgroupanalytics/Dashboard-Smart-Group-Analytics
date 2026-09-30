import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Wrench, Zap, Gauge, RefreshCw, ShoppingCart, CalendarDays } from "lucide-react";
const KPI_CONFIG = [
    { label: "Jornada Semanal", value: 10560, icon: Clock, unit: "min" },
    { label: "Tempo de Setup", value: 4550, icon: Wrench, unit: "min" },
    { label: "Tempo Produtivo", value: 6956, icon: Zap, unit: "min" },
    { label: "Tempo Prod. + Setup", value: 11506, icon: Gauge, unit: "min" },
    { label: "Rotatividade Máq.", value: 75824, icon: RefreshCw, unit: "m" },
    { label: "Média Dias Trab.", value: 5, icon: CalendarDays, unit: "dias" },
];
function normalize(s) {
    return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}
function fmt(n) {
    return (n || 0).toLocaleString("pt-BR");
}
export default function CargaKpiStrip({ parametros = [] }) {
    const kpis = useMemo(() => {
        return KPI_CONFIG.map((kpi) => {
            const nl = normalize(kpi.label);
            const found = parametros.find((p) => {
                const np = normalize(p.parametro);
                return np === nl || np.includes(nl) || nl.includes(np);
            });
            return { ...kpi, value: found ? found.valor : kpi.value };
        });
    }, [parametros]);
    return (_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3", children: kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (_jsxs(motion.div, { initial: { opacity: 0, y: 16, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" }, className: "relative overflow-hidden rounded-xl border border-[#b2dfdb] bg-[#f0fdf9] px-3 py-3 shadow-[0_2px_12px_-4px_rgba(0,121,140,0.25)]", children: [_jsx("div", { className: "absolute -top-6 -right-6 w-20 h-20 rounded-full bg-teal-400/10 blur-2xl" }), _jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("div", { className: "p-1.5 rounded-lg bg-[#00796b]/10 text-[#004d40] ring-1 ring-[#b2dfdb]", children: _jsx(Icon, { className: "w-3.5 h-3.5" }) }), _jsx("span", { className: "text-[10px] uppercase tracking-wider text-[#004d40] font-bold leading-tight", children: kpi.label })] }), _jsxs("div", { className: "flex items-baseline gap-1", children: [_jsx("span", { className: "text-xl xl:text-2xl font-extrabold text-[#004d40] tabular-nums tracking-tight", children: fmt(kpi.unit === "dias" ? Math.round(kpi.value) : kpi.value) }), _jsx("span", { className: "text-[10px] text-[#004d40] font-semibold", children: kpi.unit })] }), _jsx("div", { className: "absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-[#00796b]/50 to-transparent" })] }, kpi.label));
        }) }));
}
