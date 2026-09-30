import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { tempoRealHoras } from "@/lib/controleSpeed";
const fmtNum = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Converte valor decimal (H.MM) para formato de horas HH:MM (ex.: 2.28 → "2:28")
const fmtHora = (v) => {
    if (!v || v === 0)
        return "—";
    const h = Math.floor(v);
    const m = Math.round((v - h) * 100);
    let hh = h + (m >= 60 ? 1 : 0);
    let mm = m % 60;
    return `${hh}:${String(mm).padStart(2, "0")}`;
};
export default function AproveitamentoRevisaoTable({ selectedDays, controleRecords = [], aproveitamentoRecords = [] }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            try {
                const all = await db.entities.DetalheRevisaoOP.list("data", 3000);
                const filtered = selectedDays.length > 0 ? all.filter((r) => r.data && selectedDays.includes(r.data)) : all;
                if (active)
                    setRows(filtered);
            }
            finally {
                if (active)
                    setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [selectedDays.join(",")]);
    // Mapa de tempo previsto por OP (vindo do AproveitamentoOP)
    const previstoPorOp = useMemo(() => {
        const map = {};
        aproveitamentoRecords.forEach((r) => {
            if (r.num_op) {
                const prev = map[r.num_op] || 0;
                map[r.num_op] = Math.max(prev, r.tempo_previsto || 0);
            }
        });
        return map;
    }, [aproveitamentoRecords]);
    // Mapa de tempo realizado por OP (vindo do ControleEficiencia, soma das máquinas, sem retrabalho)
    const realizadoPorOp = useMemo(() => {
        const map = {};
        controleRecords.forEach((r) => {
            if (r.num_op && !r.is_retrabalho) {
                const t = r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
                map[r.num_op] = (map[r.num_op] || 0) + (t || 0);
            }
        });
        return map;
    }, [controleRecords]);
    const totals = useMemo(() => rows.reduce((acc, r) => {
        const prev = previstoPorOp[r.op] || 0;
        const real = realizadoPorOp[r.op] || 0;
        return {
            qtd_revisada: acc.qtd_revisada + (r.qtd_revisada || 0),
            qtd_refugo: acc.qtd_refugo + (r.qtd_refugo || 0),
            tempo_previsto: acc.tempo_previsto + prev,
            tempo_realizado: acc.tempo_realizado + real,
        };
    }, { qtd_revisada: 0, qtd_refugo: 0, tempo_previsto: 0, tempo_realizado: 0 }), [rows, previstoPorOp, realizadoPorOp]);
    return (_jsxs("div", { className: "bg-white/80 border border-slate-300 rounded-[14px] shadow-sm overflow-hidden backdrop-blur-[10px]", children: [_jsxs("div", { className: "px-5 py-3 border-b border-slate-300 bg-slate-100/80 flex items-center gap-2", children: [_jsx(ClipboardCheck, { className: "w-4 h-4 text-indigo-600" }), _jsx("h2", { className: "text-xs uppercase tracking-[0.11em] font-bold text-slate-700", children: "OPs Revisadas (Revis\u00E3o)" }), _jsxs("span", { className: "ml-auto text-[11px] text-slate-500 font-medium", children: [rows.length, " OPs"] })] }), loading ? (_jsx("div", { className: "flex items-center justify-center py-8", children: _jsx(Loader2, { className: "w-5 h-5 animate-spin text-slate-400" }) })) : rows.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500 py-6 text-center", children: "Nenhuma OP revisada encontrada para o per\u00EDodo selecionado." })) : (_jsx("div", { className: "overflow-auto max-h-[420px]", children: _jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { className: "sticky top-0 z-10", children: _jsxs("tr", { className: "bg-slate-700 text-white", children: [_jsx("th", { className: "px-2 py-2.5 text-left font-semibold whitespace-nowrap", children: "OP" }), _jsx("th", { className: "px-2 py-2.5 text-left font-semibold whitespace-nowrap", children: "Descri\u00E7\u00E3o" }), _jsx("th", { className: "px-2 py-2.5 text-right font-semibold whitespace-nowrap", children: "Metragem Revisada" }), _jsx("th", { className: "px-2 py-2.5 text-right font-semibold whitespace-nowrap", children: "Quebra (Refugo)" }), _jsx("th", { className: "px-2 py-2.5 text-right font-semibold whitespace-nowrap", children: "Tempo Previsto (h)" }), _jsx("th", { className: "px-2 py-2.5 text-right font-semibold whitespace-nowrap", children: "Tempo Realizado (h)" })] }) }), _jsx("tbody", { children: rows.map((r, i) => {
                                const tPrev = previstoPorOp[r.op] || 0;
                                const tReal = realizadoPorOp[r.op] || 0;
                                return (_jsxs("tr", { className: "border-b border-slate-200 hover:bg-slate-50 transition-colors even:bg-slate-50/50", children: [_jsx("td", { className: "px-2 py-2 text-slate-800 font-bold whitespace-nowrap", children: r.op }), _jsx("td", { className: "px-2 py-2 text-slate-600 max-w-[220px] truncate", title: r.descricao, children: r.descricao || "—" }), _jsx("td", { className: "px-2 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap", children: fmtNum(r.qtd_revisada) }), _jsx("td", { className: `px-2 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${(r.qtd_refugo || 0) > 0 ? "text-rose-600" : "text-slate-400"}`, children: fmtNum(r.qtd_refugo) }), _jsx("td", { className: "px-2 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap", children: fmtHora(tPrev) }), _jsx("td", { className: `px-2 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${tReal > 0 ? "text-indigo-700" : "text-slate-400"}`, children: fmtHora(tReal) })] }, r.id || i));
                            }) }), _jsx("tfoot", { children: _jsxs("tr", { className: "bg-slate-200 font-bold border-t-2 border-slate-400", children: [_jsx("td", { colSpan: 2, className: "px-2 py-2 text-slate-800 uppercase text-[11px] tracking-wide", children: "Total" }), _jsx("td", { className: "px-2 py-2 text-right tabular-nums text-slate-800 whitespace-nowrap", children: fmtNum(totals.qtd_revisada) }), _jsx("td", { className: "px-2 py-2 text-right tabular-nums text-rose-700 whitespace-nowrap", children: fmtNum(totals.qtd_refugo) }), _jsx("td", { className: "px-2 py-2 text-right tabular-nums text-slate-800 whitespace-nowrap", children: fmtHora(totals.tempo_previsto) }), _jsx("td", { className: "px-2 py-2 text-right tabular-nums text-indigo-800 whitespace-nowrap", children: fmtHora(totals.tempo_realizado) })] }) })] }) }))] }));
}
