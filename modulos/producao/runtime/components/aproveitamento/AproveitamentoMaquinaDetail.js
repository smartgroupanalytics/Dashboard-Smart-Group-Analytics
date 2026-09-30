import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { Cog } from "lucide-react";
const fmtNum = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export default function AproveitamentoMaquinaDetail({ controleRecords, numOp }) {
    const maquinas = useMemo(() => {
        const recs = controleRecords.filter((r) => String(r.num_op || "") === String(numOp || ""));
        const map = {};
        recs.forEach((r) => {
            const key = r.maquina || "(sem máquina)";
            if (!map[key])
                map[key] = { maquina: key, tempo: 0, setup: 0, parada: 0, ops: 0, retrabalho: 0 };
            map[key].tempo += r.tempo || 0;
            map[key].setup += r.setup || 0;
            map[key].parada += r.parada || 0;
            map[key].ops += 1;
            if (r.is_retrabalho)
                map[key].retrabalho += r.tempo || 0;
        });
        return Object.values(map).sort((a, b) => b.tempo - a.tempo);
    }, [controleRecords, numOp]);
    if (maquinas.length === 0) {
        return (_jsx("tr", { className: "bg-slate-50/60", children: _jsx("td", { colSpan: 16, className: "px-6 py-3 text-xs text-slate-500 italic", children: "Nenhum registro de m\u00E1quina encontrado para esta OP no Controle de Efici\u00EAncia." }) }));
    }
    const totalTempo = maquinas.reduce((s, m) => s + m.tempo, 0);
    const totalSetup = maquinas.reduce((s, m) => s + m.setup, 0);
    const totalParada = maquinas.reduce((s, m) => s + m.parada, 0);
    return (_jsx("tr", { className: "bg-slate-50/60", children: _jsxs("td", { colSpan: 16, className: "px-4 py-3", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Cog, { className: "w-3.5 h-3.5 text-slate-500" }), _jsxs("span", { className: "text-[11px] font-bold uppercase tracking-wide text-slate-600", children: ["M\u00E1quinas que processaram a OP ", numOp] })] }), _jsxs("table", { className: "w-full text-[11px] border border-slate-200 rounded", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-slate-200 text-slate-700", children: [_jsx("th", { className: "px-2 py-1.5 text-left font-semibold whitespace-nowrap", children: "M\u00E1quina" }), _jsx("th", { className: "px-2 py-1.5 text-right font-semibold whitespace-nowrap", children: "Registros" }), _jsx("th", { className: "px-2 py-1.5 text-right font-semibold whitespace-nowrap", children: "Tempo (h)" }), _jsx("th", { className: "px-2 py-1.5 text-right font-semibold whitespace-nowrap", children: "Setup (min)" }), _jsx("th", { className: "px-2 py-1.5 text-right font-semibold whitespace-nowrap", children: "Parada (min)" }), _jsx("th", { className: "px-2 py-1.5 text-right font-semibold whitespace-nowrap", children: "Retrabalho (h)" })] }) }), _jsx("tbody", { children: maquinas.map((m) => (_jsxs("tr", { className: "border-t border-slate-200", children: [_jsx("td", { className: "px-2 py-1.5 text-slate-800 font-semibold whitespace-nowrap", children: m.maquina }), _jsx("td", { className: "px-2 py-1.5 text-right tabular-nums text-slate-600", children: m.ops }), _jsx("td", { className: "px-2 py-1.5 text-right tabular-nums text-slate-800 font-bold whitespace-nowrap", children: fmtNum(m.tempo) }), _jsx("td", { className: "px-2 py-1.5 text-right tabular-nums text-slate-600 whitespace-nowrap", children: fmtNum(m.setup) }), _jsx("td", { className: "px-2 py-1.5 text-right tabular-nums text-slate-600 whitespace-nowrap", children: fmtNum(m.parada) }), _jsx("td", { className: `px-2 py-1.5 text-right tabular-nums whitespace-nowrap ${m.retrabalho > 0 ? "text-rose-600 font-bold" : "text-slate-400"}`, children: m.retrabalho > 0 ? fmtNum(m.retrabalho) : "—" })] }, m.maquina))) }), _jsx("tfoot", { children: _jsxs("tr", { className: "bg-slate-200 font-bold border-t-2 border-slate-300", children: [_jsx("td", { className: "px-2 py-1.5 text-slate-800 uppercase text-[10px]", children: "Total" }), _jsx("td", { className: "px-2 py-1.5 text-right tabular-nums text-slate-700", children: maquinas.reduce((s, m) => s + m.ops, 0) }), _jsx("td", { className: "px-2 py-1.5 text-right tabular-nums text-slate-900", children: fmtNum(totalTempo) }), _jsx("td", { className: "px-2 py-1.5 text-right tabular-nums text-slate-700", children: fmtNum(totalSetup) }), _jsx("td", { className: "px-2 py-1.5 text-right tabular-nums text-slate-700", children: fmtNum(totalParada) }), _jsx("td", { className: "px-2 py-1.5" })] }) })] })] }) }));
}
