import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect } from "react";
const MESES = [
    { num: 1, label: "JAN" }, { num: 2, label: "FEV" }, { num: 3, label: "MAR" },
    { num: 4, label: "ABR" }, { num: 5, label: "MAI" }, { num: 6, label: "JUN" },
    { num: 7, label: "JUL" }, { num: 8, label: "AGO" }, { num: 9, label: "SET" },
    { num: 10, label: "OUT" }, { num: 11, label: "NOV" }, { num: 12, label: "DEZ" },
];
const fmt = (v) => v == null || v === 0
    ? "—"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtDiff = (d) => {
    if (d == null || isNaN(d) || d === 0)
        return "—";
    const sign = d > 0 ? "+ " : "− ";
    return sign + Math.abs(d).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
};
const STYLE = `
.pmr-thead,.pmr-row{display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr;align-items:center}
.pmr-thead{min-height:20px;background:#0f172a;color:#fff;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.pmr-thead div,.pmr-row div,.pmr-total div{padding:0 8px}
.pmr-thead div:not(:first-child),.pmr-row div:not(:first-child),.pmr-total div:not(:first-child){text-align:right;white-space:nowrap}
.pmr-body{display:flex;flex-direction:column}
.pmr-row{flex:1;min-height:18px;border-bottom:1px solid #f1f5f9;font-size:15px;line-height:18px}
.pmr-row:nth-child(even){background:#f8fafc}
.pmr-month{font-weight:700;color:#334155;font-size:13px}
.pmr-metric{font-variant-numeric:tabular-nums;font-weight:700;color:#0f172a;font-size:15px;white-space:nowrap}
.pmr-diff{font-weight:700;font-size:14px;white-space:nowrap}
.pmr-down{color:#00a86b}
.pmr-up{color:#dc3545}
.pmr-total{display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr;align-items:center;min-height:26px;background:#f1f5f9;border-top:2px solid #cbd5e1;color:#0f172a;font-weight:800;font-size:16px}
.pmr-total .pmr-down{color:#00a86b}
`;
export default function PerdaOpMensalReport() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const load = async () => {
        try {
            const data = await db.entities.PerdaOpMensal.list();
            setRecords(data);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
        const unsub = db.entities.PerdaOpMensal.subscribe(() => load());
        return unsub;
    }, []);
    const byMes = {};
    for (const r of records)
        if (r.mes)
            byMes[r.mes] = r;
    const rows = MESES.map((m) => {
        const rec = byMes[m.num] || {};
        const v25 = rec.perda_2025 ?? null;
        const v26 = rec.perda_2026 ?? null;
        const g25 = rec.g_2025 ?? null;
        const j25 = rec.j_2025 ?? null;
        const g26 = rec.g_2026 ?? null;
        const j26 = rec.j_2026 ?? null;
        const diff = v25 != null && v26 != null ? ((v26 - v25) / v25) * 100 : null;
        return { ...m, v25, v26, diff, g25, j25, g26, j26 };
    });
    // Total: média simples das perdas mensais (G/J de cada mês), sem somar G e J
    const vals25 = rows.map((r) => r.v25).filter((v) => v != null);
    const vals26 = rows.map((r) => r.v26).filter((v) => v != null);
    const total25 = vals25.length ? vals25.reduce((s, v) => s + v, 0) / vals25.length : null;
    const total26 = vals26.length ? vals26.reduce((s, v) => s + v, 0) / vals26.length : null;
    const totalDiff = total25 != null && total26 != null ? total26 - total25 : null;
    const totalDiffPct = total25 ? ((total26 - total25) / total25) * 100 : null;
    const fmtPct = (v) => {
        if (v == null || isNaN(v))
            return "—";
        const sign = v > 0 ? "+ " : v < 0 ? "− " : "";
        return sign + Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
    };
    const fmtRatio = (v) => {
        if (v == null || isNaN(v))
            return "—";
        return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    };
    const diffClass = (d) => d == null || d === 0 ? "" : d < 0 ? "pmr-down" : "pmr-up";
    const half1 = rows.slice(0, 6);
    const half2 = rows.slice(6);
    const MiniTable = ({ data }) => (_jsxs("div", { className: "flex-1 border border-slate-200 rounded-[10px] overflow-hidden flex flex-col min-h-0", children: [_jsxs("div", { className: "pmr-thead", children: [_jsx("div", { children: "M\u00EAs" }), _jsx("div", { children: "2025" }), _jsx("div", { children: "2026" }), _jsx("div", { children: "Dif." })] }), _jsx("div", { className: "pmr-body flex-1", children: data.map((r) => (_jsxs("div", { className: "pmr-row", children: [_jsx("div", { className: "pmr-month", children: r.label }), _jsx("div", { className: "pmr-metric", children: fmt(r.v25) }), _jsx("div", { className: "pmr-metric", children: fmt(r.v26) }), _jsx("div", { className: `pmr-diff ${diffClass(r.diff)}`, children: fmtDiff(r.diff) })] }, r.num))) })] }));
    return (_jsxs("div", { className: "h-full bg-white border border-slate-200/80 rounded-2xl shadow-[0_14px_32px_rgba(15,23,42,0.10)] p-3 flex flex-col gap-2", children: [_jsx("style", { dangerouslySetInnerHTML: { __html: STYLE } }), _jsxs("div", { className: "flex-1 flex flex-col gap-2 min-h-0", children: [_jsxs("div", { className: "flex gap-2 flex-1 min-h-0 items-stretch", children: [_jsx(MiniTable, { data: half1 }), _jsx(MiniTable, { data: half2 })] }), _jsxs("div", { className: "pmr-total", children: [_jsx("div", { children: "Total geral" }), _jsxs("div", { children: [fmt(total25 || null), " ", _jsx("span", { className: "text-[10px] font-semibold text-slate-500 ml-1", children: "2025" })] }), _jsxs("div", { children: [fmt(total26 || null), " ", _jsx("span", { className: "text-[10px] font-semibold text-slate-500 ml-1", children: "2026" })] }), _jsx("div", { className: diffClass(totalDiff), children: fmtPct(totalDiffPct) })] })] })] }));
}
