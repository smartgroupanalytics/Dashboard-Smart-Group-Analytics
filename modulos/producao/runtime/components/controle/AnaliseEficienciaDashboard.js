import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { tempoEsperadoHoras, tempoRealHoras } from "@/lib/controleSpeed";
import { Gauge, AlertTriangle, TrendingDown, Clock, Ruler, Hash, Wrench, CheckCircle2 } from "lucide-react";
const MACHINES = ["JR", "Gravadora", "Estampa 1", "Estampa 2", "GR2", "Digital UV", "Digital Solvente", "Tumbler"];
function fmtHoras(v) {
    if (!v && v !== 0)
        return "00:00";
    const abs = Math.abs(v);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function fmtNum(v) {
    return Math.round(v || 0).toLocaleString("pt-BR");
}
function statusEf(ef, hasData) {
    if (!hasData)
        return { label: "Sem dados", color: "#94a3b8", bg: "#f1f5f9" };
    if (ef >= 95)
        return { label: "Meta", color: "#059669", bg: "#d1fae5" };
    if (ef >= 80)
        return { label: "Atenção", color: "#d97706", bg: "#fef3c7" };
    return { label: "Crítico", color: "#dc2626", bg: "#fee2e2" };
}
export default function AnaliseEficienciaDashboard({ records, selectedDays }) {
    const porMaquina = useMemo(() => {
        return MACHINES.map((m) => {
            const recs = records.filter((r) => r.maquina === m);
            let real = 0, esperado = 0, metros = 0, setup = 0, parada = 0, retrab = 0, ops = new Set();
            recs.forEach((r) => {
                const t = r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
                real += t;
                esperado += tempoEsperadoHoras(r.metragem, m, r.processo);
                metros += r.metragem || 0;
                setup += r.setup || 0;
                parada += r.parada || 0;
                if (r.is_retrabalho)
                    retrab++;
                if (r.num_op)
                    ops.add(r.num_op);
            });
            const ef = real > 0 ? (esperado / real) * 100 : 0;
            return {
                maquina: m,
                ops: ops.size,
                metros: Math.round(metros),
                tempoReal: Math.round(real * 100) / 100,
                tempoEsperado: Math.round(esperado * 100) / 100,
                setup: Math.round(setup),
                parada: Math.round(parada),
                retrabalhos: retrab,
                eficiencia: Math.round(ef),
                hasData: recs.length > 0,
            };
        });
    }, [records]);
    const geral = useMemo(() => {
        let real = 0, esperado = 0, metros = 0, setup = 0;
        porMaquina.forEach((r) => {
            real += r.tempoReal;
            esperado += r.tempoEsperado;
            metros += r.metros;
            setup += r.setup;
        });
        const ef = real > 0 ? (esperado / real) * 100 : 0;
        const ativas = porMaquina.filter((r) => r.hasData).length;
        const criticas = porMaquina.filter((r) => r.hasData && r.eficiencia < 80).length;
        return {
            metros,
            real,
            esperado,
            setup,
            ef: Math.round(ef),
            ativas,
            criticas,
        };
    }, [porMaquina]);
    const periodoLabel = selectedDays.length > 0
        ? selectedDays.length === 1
            ? selectedDays[0].split("-").reverse().join("/")
            : `${selectedDays.length} dias selecionados`
        : "Todos os registros";
    const stGeral = statusEf(geral.ef, geral.real > 0);
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3", children: [_jsxs("div", { className: "rounded-xl border border-slate-200 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2 text-slate-500 mb-1", children: [_jsx(Ruler, { className: "w-3.5 h-3.5" }), _jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wide", children: "Metros" })] }), _jsx("p", { className: "text-2xl font-extrabold text-slate-900 tabular-nums", children: fmtNum(geral.metros) })] }), _jsxs("div", { className: "rounded-xl border border-slate-200 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2 text-slate-500 mb-1", children: [_jsx(Clock, { className: "w-3.5 h-3.5" }), _jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wide", children: "Tempo Real" })] }), _jsx("p", { className: "text-2xl font-extrabold text-slate-900 tabular-nums", children: fmtHoras(geral.real) })] }), _jsxs("div", { className: "rounded-xl border border-slate-200 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2 text-slate-500 mb-1", children: [_jsx(TrendingDown, { className: "w-3.5 h-3.5" }), _jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wide", children: "Esperado" })] }), _jsx("p", { className: "text-2xl font-extrabold text-slate-900 tabular-nums", children: fmtHoras(geral.esperado) })] }), _jsxs("div", { className: "rounded-xl border border-slate-200 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2 text-slate-500 mb-1", children: [_jsx(Wrench, { className: "w-3.5 h-3.5" }), _jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wide", children: "Setup" })] }), _jsx("p", { className: "text-2xl font-extrabold text-slate-900 tabular-nums", children: fmtHoras(geral.setup / 60) })] }), _jsxs("div", { className: "rounded-xl border border-slate-200 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2 text-slate-500 mb-1", children: [_jsx(Gauge, { className: "w-3.5 h-3.5" }), _jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wide", children: "Efici\u00EAncia" })] }), _jsxs("p", { className: "text-2xl font-extrabold tabular-nums", style: { color: stGeral.color }, children: [geral.ef, "%"] })] }), _jsxs("div", { className: "rounded-xl border border-slate-200 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2 text-slate-500 mb-1", children: [_jsx(AlertTriangle, { className: "w-3.5 h-3.5" }), _jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wide", children: "Cr\u00EDticas" })] }), _jsxs("p", { className: "text-2xl font-extrabold text-rose-600 tabular-nums", children: [geral.criticas, "/", geral.ativas] })] })] }), _jsxs("div", { className: "rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Gauge, { className: "w-4 h-4 text-slate-700" }), _jsx("h3", { className: "text-sm font-bold text-slate-900", children: "Efici\u00EAncia por M\u00E1quina" })] }), _jsx("span", { className: "text-xs text-slate-500", children: periodoLabel })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wide", children: [_jsx("th", { className: "text-left font-semibold px-4 py-2.5", children: "M\u00E1quina" }), _jsx("th", { className: "text-right font-semibold px-4 py-2.5", children: "OPs" }), _jsx("th", { className: "text-right font-semibold px-4 py-2.5", children: "Metros" }), _jsx("th", { className: "text-right font-semibold px-4 py-2.5", children: "Tempo Real" }), _jsx("th", { className: "text-right font-semibold px-4 py-2.5", children: "Esperado" }), _jsx("th", { className: "text-right font-semibold px-4 py-2.5", children: "Setup" }), _jsx("th", { className: "text-right font-semibold px-4 py-2.5", children: "Retrab." }), _jsx("th", { className: "text-right font-semibold px-4 py-2.5", children: "Efici\u00EAncia" }), _jsx("th", { className: "text-center font-semibold px-4 py-2.5", children: "Status" })] }) }), _jsx("tbody", { children: porMaquina.map((r) => {
                                        const st = statusEf(r.eficiencia, r.hasData);
                                        return (_jsxs("tr", { className: "border-t border-slate-100 hover:bg-slate-50/60", children: [_jsx("td", { className: "px-4 py-2.5 font-bold text-slate-900", children: r.maquina }), _jsx("td", { className: "px-4 py-2.5 text-right tabular-nums text-slate-700", children: r.ops }), _jsx("td", { className: "px-4 py-2.5 text-right tabular-nums text-slate-700", children: fmtNum(r.metros) }), _jsx("td", { className: "px-4 py-2.5 text-right tabular-nums text-slate-700", children: fmtHoras(r.tempoReal) }), _jsx("td", { className: "px-4 py-2.5 text-right tabular-nums text-slate-500", children: fmtHoras(r.tempoEsperado) }), _jsx("td", { className: "px-4 py-2.5 text-right tabular-nums text-slate-700", children: fmtHoras(r.setup / 60) }), _jsx("td", { className: "px-4 py-2.5 text-right tabular-nums", children: r.retrabalhos > 0 ? _jsx("span", { className: "text-rose-600 font-semibold", children: r.retrabalhos }) : _jsx("span", { className: "text-slate-300", children: "0" }) }), _jsx("td", { className: "px-4 py-2.5 text-right", children: r.hasData ? (_jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsx("div", { className: "w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden", children: _jsx("div", { className: "h-full rounded-full", style: { width: `${Math.min(r.eficiencia, 100)}%`, background: st.color } }) }), _jsxs("span", { className: "font-bold tabular-nums w-10 text-right", style: { color: st.color }, children: [r.eficiencia, "%"] })] })) : (_jsx("span", { className: "text-slate-300", children: "\u2014" })) }), _jsx("td", { className: "px-4 py-2.5 text-center", children: _jsx("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold", style: { color: st.color, background: st.bg }, children: st.label }) })] }, r.maquina));
                                    }) })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-3", children: [_jsxs("div", { className: "rounded-xl border border-amber-200 bg-amber-50 p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-amber-600" }), _jsx("h4", { className: "text-sm font-bold text-amber-900", children: "Pontos de aten\u00E7\u00E3o" })] }), _jsxs("ul", { className: "space-y-1.5 text-sm text-amber-800", children: [geral.ef < 80 && (_jsxs("li", { className: "flex gap-2", children: [_jsx("span", { className: "text-rose-500", children: "\u2022" }), " Efici\u00EAncia geral em ", _jsxs("strong", { children: [geral.ef, "%"] }), " \u2014 meta \u00E9 95%."] })), porMaquina.filter((r) => r.hasData && r.eficiencia < 80).map((r) => (_jsxs("li", { className: "flex gap-2", children: [_jsx("span", { className: "text-rose-500", children: "\u2022" }), " ", _jsx("strong", { children: r.maquina }), " em ", r.eficiencia, "% com ", r.setup, "min de setup."] }, r.maquina))), porMaquina.filter((r) => r.retrabalhos > 0).map((r) => (_jsxs("li", { className: "flex gap-2", children: [_jsx("span", { className: "text-rose-500", children: "\u2022" }), " ", _jsx("strong", { children: r.maquina }), " com ", r.retrabalhos, " retrabalho(s)."] }, r.maquina))), geral.ef >= 80 && porMaquina.filter((r) => r.hasData && r.eficiencia < 80).length === 0 && (_jsxs("li", { className: "flex gap-2", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-600" }), " Todas as m\u00E1quinas acima de 80%."] }))] })] }), _jsxs("div", { className: "rounded-xl border border-slate-200 bg-white p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Hash, { className: "w-4 h-4 text-slate-600" }), _jsx("h4", { className: "text-sm font-bold text-slate-900", children: "Resumo operacional" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-slate-500 text-xs", children: "M\u00E1quinas ativas" }), _jsxs("p", { className: "font-bold text-slate-900 text-lg", children: [geral.ativas, "/", MACHINES.length] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-500 text-xs", children: "Total de setup" }), _jsx("p", { className: "font-bold text-slate-900 text-lg", children: fmtHoras(geral.setup / 60) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-500 text-xs", children: "Metros / hora real" }), _jsxs("p", { className: "font-bold text-slate-900 text-lg", children: [geral.real > 0 ? fmtNum(geral.metros / geral.real) : 0, " m/h"] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-500 text-xs", children: "Gap (real - esperado)" }), _jsxs("p", { className: "font-bold text-slate-900 text-lg", children: [fmtHoras(geral.real - geral.esperado), " h"] })] })] })] })] })] }));
}
