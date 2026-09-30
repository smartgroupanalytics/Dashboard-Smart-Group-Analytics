import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Pause } from "lucide-react";
function fmtHoras(v) {
    if (!v && v !== 0)
        return "00:00";
    const totalMin = Math.round(v * 60);
    const h = Math.floor(totalMin / 60);
    const min = Math.abs(totalMin) % 60;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
const CARDS = [
    { key: "tp", label: "Tempo Produzindo", icon: Clock, color: "emerald" },
    { key: "tpar", label: "Tempo Parado", icon: Pause, color: "rose" },
];
const STYLES = {
    emerald: { text: "text-emerald-300", icon: "text-emerald-300" },
    rose: { text: "text-rose-300", icon: "text-rose-300" },
};
export default function DesempenhoResumo({ records }) {
    const totais = useMemo(() => {
        const produzindo = records.reduce((s, r) => s + (r.tempo_produzido || 0) + (r.retrabalho || 0), 0);
        const parado = records.reduce((s, r) => s +
            (r.tempo_parado || 0) +
            (r.setup || 0) +
            (r.amostras || 0) +
            (r.tempo_ocioso || 0), 0);
        return {
            tp: fmtHoras(produzindo),
            tpar: fmtHoras(parado),
        };
    }, [records]);
    return (_jsx("div", { className: "grid grid-cols-2 gap-3 mb-4", children: CARDS.map((c, i) => {
            const s = STYLES[c.color];
            const Icon = c.icon;
            return (_jsxs(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.04 }, className: "rounded-lg border border-white/20 bg-gradient-to-br from-[#0a2540]/80 via-[#1e4d8b]/70 to-[#2e7bc4]/60 backdrop-blur p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(Icon, { className: `w-4 h-4 ${s.icon}` }), _jsx("span", { className: "text-sm font-medium text-blue-50", children: c.label })] }), _jsx("p", { className: "text-2xl font-bold tabular-nums text-white drop-shadow", children: totais[c.key] })] }, c.key));
        }) }));
}
