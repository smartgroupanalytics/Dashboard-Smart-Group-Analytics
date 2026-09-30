import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Award, TrendingDown, AlertTriangle, Target } from "lucide-react";
import { extractFamilia, familiaKey } from "@/components/aproveitamento/AproveitamentoFamiliaFilter";
const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;
const fmtNum = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const COLORS = {
    excelente: "#10b981",
    intermediario: "#f59e0b",
    critico: "#f43f5e",
    semMetricas: "#cbd5e1",
};
export default function AproveitamentoFamiliaAnalise({ open, onOpenChange, familia, rows }) {
    const familyRows = useMemo(() => {
        if (!familia)
            return [];
        const key = familiaKey(familia);
        return rows.filter((r) => familiaKey(extractFamilia(r.descricao_produto)) === key);
    }, [rows, familia]);
    const rowsWithMetrics = useMemo(() => familyRows.filter((r) => r.hasMetrics), [familyRows]);
    const avgAproveitamento = useMemo(() => {
        if (rowsWithMetrics.length === 0)
            return 0;
        return rowsWithMetrics.reduce((s, r) => s + r.final, 0) / rowsWithMetrics.length;
    }, [rowsWithMetrics]);
    const countExcelente = rowsWithMetrics.filter((r) => r.final >= 95).length;
    const countIntermediario = rowsWithMetrics.filter((r) => r.final >= 92 && r.final < 95).length;
    const countCritico = rowsWithMetrics.filter((r) => r.final < 92).length;
    const countSemMetricas = familyRows.length - rowsWithMetrics.length;
    const countRetrabalho = rowsWithMetrics.filter((r) => r.tem_retrabalho).length;
    const pieData = [
        { name: "Excelente (≥95%)", value: countExcelente, color: COLORS.excelente },
        { name: "Intermediário (92-94%)", value: countIntermediario, color: COLORS.intermediario },
        { name: "Crítico (<92%)", value: countCritico, color: COLORS.critico },
        ...(countSemMetricas > 0 ? [{ name: "Sem métricas", value: countSemMetricas, color: COLORS.semMetricas }] : []),
    ].filter((d) => d.value > 0);
    const totals = useMemo(() => {
        return rowsWithMetrics.reduce((acc, r) => {
            acc.metragem += r.metragem || 0;
            acc.mts_quebra += r.mts_quebra || 0;
            acc.tempo_previsto += r.tempo_previsto || 0;
            acc.tempo_realizado += r.tempo_realizado || 0;
            acc.consumo_previsto += r.consumo_previsto || 0;
            acc.consumo_realizado += r.consumo_realizado || 0;
            acc.setup_previsto += r.setup_previsto || 0;
            acc.setup_realizado += r.setup_realizado || 0;
            return acc;
        }, {
            metragem: 0,
            mts_quebra: 0,
            tempo_previsto: 0,
            tempo_realizado: 0,
            consumo_previsto: 0,
            consumo_realizado: 0,
            setup_previsto: 0,
            setup_realizado: 0,
        });
    }, [rowsWithMetrics]);
    const quebraPct = totals.metragem > 0 ? (totals.mts_quebra / totals.metragem) * 100 : 0;
    const pctTempo = totals.tempo_realizado > 0 ? (totals.tempo_previsto / totals.tempo_realizado) * 100 : 0;
    const pctSetup = totals.setup_realizado > 0 ? (totals.setup_previsto / totals.setup_realizado) * 100 : 0;
    const pctConsumo = totals.consumo_realizado > 0 ? (totals.consumo_previsto / totals.consumo_realizado) * 100 : 0;
    // Contribuições ponderadas (mesma lógica da tabela principal)
    const pesoTempo = totals.tempo_realizado > 0 ? pctTempo * 0.25 : 100 * 0.25;
    const pesoSetup = totals.setup_realizado > 0 ? pctSetup * 0.15 : (totals.setup_previsto > 0 ? 100 * 0.15 : 0);
    const pesoConsumo = totals.consumo_realizado > 0 ? pctConsumo * 0.55 : 100 * 0.55;
    const finalFamilia = Math.max(0, pesoTempo + pesoSetup + pesoConsumo - quebraPct);
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-3xl max-h-[90vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2 text-base", children: [_jsx(Target, { className: "w-4 h-4 text-indigo-600" }), "An\u00E1lise da Fam\u00EDlia: ", _jsx("span", { className: "text-indigo-700", children: familia })] }) }), familyRows.length === 0 ? (_jsx("p", { className: "text-center text-slate-500 py-10", children: "Nenhuma OP encontrada para esta fam\u00EDlia." })) : (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", children: [_jsx(KpiMini, { label: "Aproveitamento da Fam\u00EDlia", value: fmtPct(finalFamilia), icon: Award, color: finalFamilia >= 95 ? "emerald" : finalFamilia >= 92 ? "amber" : "rose" }), _jsx(KpiMini, { label: "Total de OPs", value: familyRows.length, icon: Target, color: "indigo" }), _jsx(KpiMini, { label: "OPs c/ Retrabalho", value: countRetrabalho, icon: AlertTriangle, color: "amber" }), _jsx(KpiMini, { label: "Quebra M\u00E9dia", value: fmtPct(quebraPct), icon: TrendingDown, color: quebraPct > 5 ? "rose" : "emerald" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [pieData.length > 0 && (_jsxs("div", { className: "border border-slate-200 rounded-lg p-3", children: [_jsx("h3", { className: "text-xs font-bold text-slate-600 mb-2", children: "Distribui\u00E7\u00E3o das OPs" }), _jsx(ResponsiveContainer, { width: "100%", height: 180, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: pieData, dataKey: "value", nameKey: "name", cx: "50%", cy: "50%", innerRadius: 45, outerRadius: 70, paddingAngle: 2, children: pieData.map((d, i) => (_jsx(Cell, { fill: d.color }, i))) }), _jsx(Tooltip, {})] }) }), _jsx("div", { className: "flex flex-wrap gap-2 justify-center mt-1", children: pieData.map((d, i) => (_jsxs("span", { className: "inline-flex items-center gap-1 text-[10px] text-slate-600", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-sm", style: { background: d.color } }), d.name, ": ", d.value] }, i))) })] })), _jsxs("div", { className: "border border-slate-200 rounded-lg p-3", children: [_jsx("h3", { className: "text-xs font-bold text-slate-600 mb-2", children: "Aproveitamento da Fam\u00EDlia" }), _jsxs("div", { className: "space-y-2", children: [_jsx(IndexBar, { label: "% de Tempo (\u00D725%)", value: pesoTempo }), _jsx(IndexBar, { label: "% de Setup (\u00D715%)", value: pesoSetup }), _jsx(IndexBar, { label: "% de Consumo (\u00D755%)", value: pesoConsumo }), _jsx(IndexBar, { label: "\u2212 Quebra", value: quebraPct, negative: true })] }), _jsxs("div", { className: "mt-3 pt-3 border-t border-slate-200 flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-bold text-slate-700 uppercase tracking-wide", children: "Aproveitamento Final" }), _jsx("span", { className: `text-lg font-extrabold tabular-nums ${finalFamilia >= 95 ? "text-emerald-600" : finalFamilia >= 92 ? "text-amber-600" : "text-rose-600"}`, children: fmtPct(finalFamilia) })] })] })] }), _jsxs("div", { className: "border border-slate-200 rounded-lg overflow-hidden", children: [_jsxs("h3", { className: "text-xs font-bold text-slate-600 px-3 py-2 bg-slate-50 border-b border-slate-200", children: ["OPs da Fam\u00EDlia (", familyRows.length, ")"] }), _jsx("div", { className: "overflow-auto max-h-64", children: _jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { className: "sticky top-0", children: _jsxs("tr", { className: "bg-slate-100 text-slate-600", children: [_jsx("th", { className: "px-2 py-1.5 text-left font-semibold", children: "OP" }), _jsx("th", { className: "px-2 py-1.5 text-left font-semibold", children: "Descri\u00E7\u00E3o" }), _jsx("th", { className: "px-2 py-1.5 text-right font-semibold", children: "Metragem" }), _jsx("th", { className: "px-2 py-1.5 text-right font-semibold", children: "Quebra %" }), _jsx("th", { className: "px-2 py-1.5 text-right font-semibold", children: "Aproveit." })] }) }), _jsx("tbody", { children: familyRows.map((r, i) => (_jsxs("tr", { className: "border-b border-slate-100", children: [_jsx("td", { className: "px-2 py-1.5 font-bold text-slate-800 whitespace-nowrap", children: r.num_op }), _jsx("td", { className: "px-2 py-1.5 text-slate-600 max-w-[200px] truncate", title: r.descricao_produto, children: r.descricao_produto || "—" }), _jsx("td", { className: "px-2 py-1.5 text-right tabular-nums text-slate-700", children: fmtNum(r.metragem) }), _jsx("td", { className: `px-2 py-1.5 text-right tabular-nums font-semibold ${(r.quebra_pct || 0) > 5 ? "text-rose-600" : "text-emerald-600"}`, children: fmtPct(r.quebra_pct) }), _jsx("td", { className: "px-2 py-1.5 text-right tabular-nums font-bold", children: r.hasMetrics ? (_jsx("span", { className: r.final >= 95 ? "text-emerald-600" : r.final >= 92 ? "text-amber-600" : "text-rose-600", children: fmtPct(r.final) })) : (_jsx("span", { className: "text-slate-300", children: "\u2014" })) })] }, r.id || i))) })] }) })] })] }))] }) }));
}
function KpiMini({ label, value, icon: Icon, color }) {
    const colors = {
        emerald: "from-emerald-500 to-emerald-600",
        amber: "from-amber-500 to-amber-600",
        rose: "from-rose-500 to-rose-600",
        indigo: "from-indigo-500 to-indigo-600",
    };
    return (_jsxs("div", { className: "border border-slate-200 rounded-lg p-3 bg-white", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("div", { className: `w-7 h-7 rounded-md bg-gradient-to-br ${colors[color] || colors.indigo} text-white grid place-items-center`, children: _jsx(Icon, { className: "w-3.5 h-3.5" }) }), _jsx("span", { className: "text-[10px] font-semibold text-slate-500 uppercase tracking-wide", children: label })] }), _jsx("p", { className: "text-lg font-extrabold text-slate-800 tabular-nums", children: value })] }));
}
function IndexBar({ label, value, negative }) {
    const v = value || 0;
    const pct = Math.min(100, v);
    const color = negative ? "#f43f5e" : pct >= 100 ? "#10b981" : pct >= 85 ? "#f59e0b" : "#f43f5e";
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between text-[11px] mb-0.5", children: [_jsx("span", { className: "text-slate-600", children: label }), _jsxs("span", { className: "font-bold tabular-nums", style: { color }, children: [negative ? "−" : "", v.toFixed(1), "%"] })] }), _jsx("div", { className: "h-2 bg-slate-100 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full rounded-full transition-all", style: { width: `${pct}%`, background: color } }) })] }));
}
