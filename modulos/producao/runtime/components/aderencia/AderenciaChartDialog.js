import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, X, CalendarDays, Activity } from "lucide-react";
const MACHINES = ["Gravadora", "JR", "Estampa 1", "Estampa 2", "GR", "Revisão"];
const MACHINE_COLORS = {
    Gravadora: "#6366f1",
    JR: "#06b6d4",
    "Estampa 1": "#f59e0b",
    "Estampa 2": "#ec4899",
    GR: "#10b981",
    Revisão: "#a855f7",
    Geral: "#0f172a",
};
function isDoneStatus(status) {
    return status.startsWith("PRONTA") || status === "FEITO NA OUTRA ESTAMPA" || status === "FEITO NA OUTRA MÁQUINA" || status === "FEITO NA REVISÃO" || status === "FEITA NO DIA ANTERIOR";
}
function entregaToIso(entrega) {
    if (!entrega)
        return null;
    const parts = entrega.split("/");
    if (parts.length === 3)
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    return null;
}
function isoToLabel(iso) {
    if (!iso)
        return "—";
    const parts = iso.split("-");
    if (parts.length === 3)
        return `${parts[2]}/${parts[1]}`;
    return iso;
}
export default function AderenciaChartDialog({ open, onOpenChange, byMachine, selectedDays }) {
    // Constrói série por dia: para cada dia (entrega), aderência por máquina + geral
    const data = useMemo(() => {
        const dayMap = {}; // iso -> { dia, [machine]: { total, prontas }, geral: {total, prontas} }
        const hasDays = selectedDays && selectedDays.length > 0;
        MACHINES.forEach((m) => {
            (byMachine[m] || []).forEach((r) => {
                const iso = entregaToIso(r.entrega) || r.dataProducao || null;
                if (!iso)
                    return;
                if (hasDays && !selectedDays.includes(iso))
                    return;
                if (!dayMap[iso]) {
                    dayMap[iso] = { iso, label: isoToLabel(iso) };
                    MACHINES.forEach((mm) => (dayMap[iso][mm] = null));
                    dayMap[iso].Geral = null;
                }
                if (!dayMap[iso][m])
                    dayMap[iso][m] = { total: 0, prontas: 0 };
                dayMap[iso][m].total += 1;
                if (isDoneStatus(r.status))
                    dayMap[iso][m].prontas += 1;
            });
        });
        // Converte para array ordenado por data e calcula percentuais
        const arr = Object.values(dayMap).sort((a, b) => a.iso.localeCompare(b.iso));
        arr.forEach((d) => {
            let gTotal = 0;
            let gProntas = 0;
            MACHINES.forEach((m) => {
                if (d[m]) {
                    gTotal += d[m].total || 0;
                    gProntas += d[m].prontas || 0;
                    const pct = d[m].total > 0 ? (d[m].prontas / d[m].total) * 100 : 0;
                    d[m] = Math.round(pct * 10) / 10;
                }
            });
            d.Geral = gTotal > 0 ? Math.round((gProntas / gTotal) * 1000) / 10 : 0;
        });
        return arr;
    }, [byMachine, selectedDays]);
    // Estatísticas gerais
    const stats = useMemo(() => {
        if (data.length === 0)
            return { mediaGeral: 0, melhorDia: null, piorDia: null, melhorMaquina: null };
        const mediaGeral = data.reduce((s, d) => s + (d.Geral || 0), 0) / data.length;
        let melhorDia = data[0];
        let piorDia = data[0];
        data.forEach((d) => {
            if ((d.Geral || 0) > (melhorDia.Geral || 0))
                melhorDia = d;
            if ((d.Geral || 0) < (piorDia.Geral || 0))
                piorDia = d;
        });
        // Melhor e pior máquina (média)
        let melhorMaquina = null;
        let melhorMedia = -1;
        let piorMaquina = null;
        let piorMedia = 101;
        MACHINES.forEach((m) => {
            const vals = data.map((d) => d[m]).filter((v) => v != null);
            if (vals.length === 0)
                return;
            const media = vals.reduce((s, v) => s + v, 0) / vals.length;
            if (media > melhorMedia) {
                melhorMedia = media;
                melhorMaquina = m;
            }
            if (media < piorMedia) {
                piorMedia = media;
                piorMaquina = m;
            }
        });
        return {
            mediaGeral,
            melhorDia,
            piorDia,
            melhorMaquina,
            melhorMaquinaMedia: melhorMedia >= 0 ? melhorMedia : null,
            piorMaquina,
            piorMaquinaMedia: piorMedia <= 100 ? piorMedia : null,
        };
    }, [data]);
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm", onClick: () => onOpenChange(false), children: _jsxs(motion.div, { initial: { opacity: 0, scale: 0.96, y: 10 }, animate: { opacity: 1, scale: 1, y: 0 }, transition: { duration: 0.25 }, className: "relative w-full max-w-5xl max-h-[92vh] overflow-auto rounded-3xl bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-2xl border border-slate-200", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-t-3xl", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center shadow-lg", children: _jsx(TrendingUp, { className: "w-5 h-5 text-white" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-extrabold text-white tracking-tight", children: "Evolu\u00E7\u00E3o da Ader\u00EAncia por Dia" }), _jsx("p", { className: "text-xs text-slate-300", children: "Ader\u00EAncia di\u00E1ria por m\u00E1quina (%) e linha geral consolidada" })] })] }), _jsx("button", { onClick: () => onOpenChange(false), className: "w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsx("div", { className: "p-6", children: data.length === 0 ? (_jsxs("div", { className: "text-center py-16", children: [_jsx(CalendarDays, { className: "w-12 h-12 text-slate-300 mx-auto mb-3" }), _jsx("p", { className: "text-slate-500 font-medium", children: "Nenhum dado de ader\u00EAncia para exibir." }), _jsx("p", { className: "text-slate-400 text-sm mt-1", children: "Selecione dias ou importe a programa\u00E7\u00E3o." })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5", children: [_jsx(KpiTile, { label: "M\u00E9dia Geral", value: `${stats.mediaGeral.toFixed(1)}%`, icon: Activity, gradient: "from-emerald-500 to-emerald-700" }), _jsx(KpiTile, { label: "Melhor Dia", value: stats.melhorDia ? `${stats.melhorDia.Geral.toFixed(1)}%` : "—", sub: stats.melhorDia?.label, icon: TrendingUp, gradient: "from-blue-500 to-blue-700" }), _jsx(KpiTile, { label: "Pior Dia", value: stats.piorDia ? `${stats.piorDia.Geral.toFixed(1)}%` : "—", sub: stats.piorDia?.label, icon: TrendingUp, gradient: "from-rose-500 to-rose-700" }), _jsx(KpiTile, { label: "Melhor M\u00E1quina", value: stats.melhorMaquina || "—", sub: stats.melhorMaquinaMedia != null ? `${stats.melhorMaquinaMedia.toFixed(1)}% méd.` : null, icon: Activity, gradient: "from-violet-500 to-violet-700" }), _jsx(KpiTile, { label: "Pior M\u00E1quina", value: stats.piorMaquina || "—", sub: stats.piorMaquinaMedia != null ? `${stats.piorMaquinaMedia.toFixed(1)}% méd.` : null, icon: Activity, gradient: "from-amber-500 to-orange-700" })] }), _jsxs("div", { className: "mt-5 rounded-2xl border border-slate-200 bg-white overflow-hidden", children: [_jsx("div", { className: "px-4 py-2.5 bg-slate-50 border-b border-slate-200", children: _jsx("h3", { className: "text-sm font-bold text-slate-700 uppercase tracking-wide", children: "Resumo por Dia" }) }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-slate-100 text-slate-600", children: [_jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Dia" }), MACHINES.map((m) => (_jsx("th", { className: "px-3 py-2 text-right font-semibold whitespace-nowrap", children: m }, m))), _jsx("th", { className: "px-3 py-2 text-right font-bold text-slate-800 bg-slate-200/60", children: "Geral" })] }) }), _jsx("tbody", { children: data.map((d) => (_jsxs("tr", { className: "border-t border-slate-100 hover:bg-slate-50", children: [_jsx("td", { className: "px-3 py-2 font-semibold text-slate-700 whitespace-nowrap", children: d.label }), MACHINES.map((m) => (_jsx("td", { className: "px-3 py-2 text-right tabular-nums whitespace-nowrap", children: d[m] == null ? (_jsx("span", { className: "text-slate-300", children: "\u2014" })) : (_jsxs("span", { className: d[m] >= 80 ? "text-emerald-600 font-semibold" : d[m] >= 50 ? "text-amber-600 font-semibold" : "text-rose-600 font-semibold", children: [d[m].toFixed(1), "%"] })) }, m))), _jsxs("td", { className: "px-3 py-2 text-right tabular-nums font-extrabold text-slate-900 bg-slate-100/50 whitespace-nowrap", children: [d.Geral.toFixed(1), "%"] })] }, d.iso))) }), _jsx("tfoot", { children: _jsxs("tr", { className: "bg-slate-800 text-white border-t-2 border-slate-700", children: [_jsx("td", { className: "px-3 py-2 font-bold whitespace-nowrap", children: "Geral M\u00E1q." }), MACHINES.map((m) => {
                                                                const vals = data.map((d) => d[m]).filter((v) => v != null);
                                                                const media = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
                                                                return (_jsx("td", { className: "px-3 py-2 text-right tabular-nums font-extrabold whitespace-nowrap", children: media == null ? _jsx("span", { className: "text-slate-400", children: "\u2014" }) : `${media.toFixed(1)}%` }, m));
                                                            }), _jsxs("td", { className: "px-3 py-2 text-right tabular-nums font-extrabold bg-slate-900 whitespace-nowrap", children: [stats.mediaGeral.toFixed(1), "%"] })] }) })] }) })] })] })) })] }) }));
}
function KpiTile({ label, value, sub, icon: Icon, gradient }) {
    return (_jsxs("div", { className: `relative rounded-2xl p-4 bg-gradient-to-br ${gradient} text-white shadow-md overflow-hidden`, children: [_jsx("div", { className: "absolute -right-3 -top-3 opacity-20", children: _jsx(Icon, { className: "w-16 h-16" }) }), _jsxs("div", { className: "relative", children: [_jsx("p", { className: "text-[10px] uppercase tracking-wider font-semibold opacity-90", children: label }), _jsx("p", { className: "text-2xl font-extrabold tabular-nums mt-1 leading-none", children: value }), sub && _jsx("p", { className: "text-[11px] opacity-80 mt-1", children: sub })] })] }));
}
