import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useRef } from "react";
import { getSpeed, tempoEsperadoHoras, tempoRealHoras } from "@/lib/controleSpeed";
import { Printer, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
function fmtHoras(v) {
    if (!v && v !== 0)
        return "—";
    const abs = Math.abs(v);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${v < 0 ? "-" : ""}${hh}:${mm}`;
}
function fmtNum(v, dec = 1) {
    if (v == null || isNaN(v))
        return "—";
    return v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtMinutos(v) {
    if (!v && v !== 0)
        return "—";
    const abs = Math.abs(v);
    const h = Math.floor(abs / 60);
    const m = Math.round(abs % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
export default function RelatorioProdutoMaquinas({ products, records, onClose }) {
    const rootRef = useRef(null);
    const handlePrint = async () => {
        const root = rootRef.current;
        if (!root) {
            window.print();
            return;
        }
        const styleEl = document.createElement("style");
        styleEl.id = "relatorio-landscape-page";
        styleEl.textContent = "@page { size: A4 landscape; margin: 8mm; }";
        document.head.appendChild(styleEl);
        document.body.classList.add("printing-relatorio");
        await new Promise((res) => setTimeout(res, 300));
        const cleanup = () => {
            document.body.classList.remove("printing-relatorio");
            styleEl.remove();
            window.removeEventListener("afterprint", cleanup);
        };
        window.addEventListener("afterprint", cleanup);
        window.print();
    };
    // Agrupa registros por máquina
    const byMachine = useMemo(() => {
        const map = {};
        records.forEach((r) => {
            const m = r.maquina || "—";
            if (!map[m]) {
                map[m] = {
                    maquina: m,
                    rows: [],
                    metragem: 0,
                    tempo: 0,
                    setup: 0,
                    parada: 0,
                    tempoEsperado: 0,
                    ops: new Set(),
                };
            }
            const tempo = r.tempo && r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
            const tempoEsperado = tempoEsperadoHoras(r.metragem, m, r.processo);
            map[m].rows.push({ ...r, tempo, tempoEsperado });
            map[m].metragem += r.metragem || 0;
            map[m].tempo += tempo;
            map[m].tempoEsperado += tempoEsperado;
            map[m].setup += r.setup || 0;
            map[m].parada += r.parada || 0;
            if (r.num_op)
                map[m].ops.add(r.num_op);
        });
        return Object.values(map).sort((a, b) => b.tempo - a.tempo);
    }, [records]);
    const totalGeral = useMemo(() => {
        return byMachine.reduce((acc, m) => {
            acc.metragem += m.metragem;
            acc.tempo += m.tempo;
            acc.tempoEsperado += m.tempoEsperado;
            acc.setup += m.setup;
            acc.parada += m.parada;
            return acc;
        }, { metragem: 0, tempo: 0, tempoEsperado: 0, setup: 0, parada: 0 });
    }, [byMachine]);
    const titulo = products.length === 1 ? products[0] : `${products.length} produtos`;
    return (_jsxs("div", { ref: rootRef, className: "relatorio-root rounded-2xl border border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-lg font-bold text-slate-900 flex items-center gap-2", children: [_jsx(Package, { className: "w-5 h-5 text-blue-600" }), "Relat\u00F3rio por Produto \u2014 ", titulo] }), _jsxs("p", { className: "text-xs text-slate-900 font-medium", children: [byMachine.length, " m\u00E1quina(s) \u2022 ", records.length, " registro(s)"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", className: "h-8 gap-1 bg-white text-slate-800 border-slate-300 hover:bg-slate-100", onClick: handlePrint, children: [_jsx(Printer, { className: "w-4 h-4" }), " Imprimir"] }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 text-slate-600 hover:bg-slate-100", onClick: onClose, children: _jsx(X, { className: "w-4 h-4" }) })] })] }), _jsx("div", { className: "overflow-x-auto rounded-xl border border-slate-200 mb-4", children: _jsxs("table", { className: "w-full text-xs border-collapse table-fixed", children: [_jsx("thead", { className: "bg-emerald-100/70", children: _jsxs("tr", { className: "text-left text-slate-900", children: [_jsx("th", { className: "px-3 py-2.5 font-medium whitespace-nowrap w-[18%]", children: "M\u00E1quina" }), _jsx("th", { className: "px-3 py-2.5 font-medium text-center whitespace-nowrap w-[10%]", children: "OPs" }), _jsx("th", { className: "px-3 py-2.5 font-medium text-right whitespace-nowrap w-[14%]", children: "Metragem" }), _jsx("th", { className: "px-3 py-2.5 font-medium text-right whitespace-nowrap w-[12%]", children: "Tempo Real" }), _jsx("th", { className: "px-3 py-2.5 font-medium text-right whitespace-nowrap w-[12%]", children: "Tempo Previsto" }), _jsx("th", { className: "px-3 py-2.5 font-medium text-center whitespace-nowrap w-[10%]", children: "Setup" }), _jsx("th", { className: "px-3 py-2.5 font-medium text-center whitespace-nowrap w-[10%]", children: "Parada" }), _jsx("th", { className: "px-3 py-2.5 font-medium text-right whitespace-nowrap w-[14%]", children: "Dif. Tempo" })] }) }), _jsxs("tbody", { children: [byMachine.map((m, idx) => {
                                    const dif = m.tempo - m.tempoEsperado;
                                    const difPositive = dif <= 0;
                                    return (_jsxs("tr", { className: `border-t border-slate-200 text-slate-900 hover:bg-slate-100 ${idx % 2 === 1 ? "bg-emerald-100/40" : "bg-white"}`, children: [_jsx("td", { className: "px-3 py-2 font-semibold whitespace-nowrap", children: m.maquina }), _jsx("td", { className: "px-3 py-2 text-center tabular-nums", children: m.ops.size }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums font-bold text-[13px]", children: fmtNum(m.metragem, 2) }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums font-bold text-cyan-700 text-[13px]", children: fmtHoras(m.tempo) }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums font-bold text-blue-700 text-[13px]", children: fmtHoras(m.tempoEsperado) }), _jsx("td", { className: "px-3 py-2 text-center tabular-nums font-bold text-amber-600 text-[13px]", children: m.setup ? fmtMinutos(m.setup) : "—" }), _jsx("td", { className: "px-3 py-2 text-center tabular-nums font-bold text-rose-600 text-[13px]", children: m.parada ? fmtMinutos(m.parada) : "—" }), _jsx("td", { className: `px-3 py-2 text-right tabular-nums font-bold text-[13px] ${difPositive ? "text-emerald-600" : "text-rose-600"}`, children: (difPositive ? "-" : "+") + fmtHoras(Math.abs(dif)) })] }, m.maquina));
                                }), byMachine.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "px-3 py-8 text-center text-slate-900 font-medium", children: "Nenhum registro encontrado para o(s) produto(s) selecionado(s)." }) }))] }), byMachine.length > 0 && (_jsx("tfoot", { className: "bg-slate-100 border-t-2 border-slate-300", children: _jsxs("tr", { className: "text-xs font-bold text-slate-900", children: [_jsx("td", { className: "px-3 py-2.5", children: "Total Geral" }), _jsx("td", { className: "px-3 py-2.5" }), _jsx("td", { className: "px-3 py-2.5 text-right tabular-nums", children: fmtNum(totalGeral.metragem, 2) }), _jsx("td", { className: "px-3 py-2.5 text-right tabular-nums font-bold text-cyan-700 text-[14px]", children: fmtHoras(totalGeral.tempo) }), _jsx("td", { className: "px-3 py-2.5 text-right tabular-nums font-bold text-blue-700 text-[14px]", children: fmtHoras(totalGeral.tempoEsperado) }), _jsx("td", { className: "px-3 py-2.5 text-center tabular-nums font-bold text-amber-600 text-[14px]", children: totalGeral.setup ? fmtMinutos(totalGeral.setup) : "—" }), _jsx("td", { className: "px-3 py-2.5 text-center tabular-nums font-bold text-rose-600 text-[14px]", children: totalGeral.parada ? fmtMinutos(totalGeral.parada) : "—" }), _jsx("td", { className: `px-3 py-2.5 text-right tabular-nums font-bold text-[14px] ${totalGeral.tempo - totalGeral.tempoEsperado <= 0 ? "text-emerald-600" : "text-rose-600"}`, children: ((totalGeral.tempo - totalGeral.tempoEsperado) <= 0 ? "-" : "+") + fmtHoras(Math.abs(totalGeral.tempo - totalGeral.tempoEsperado)) })] }) }))] }) }), byMachine.map((m) => (_jsxs("div", { className: "mb-4", children: [_jsxs("h4", { className: "text-sm font-bold text-slate-900 mb-2 pb-1 border-b border-slate-300", children: [m.maquina, " ", _jsxs("span", { className: "text-xs font-normal text-slate-500", children: ["(", m.rows.length, " registro(s))"] })] }), _jsx("div", { className: "overflow-x-auto rounded-xl border border-slate-200", children: _jsxs("table", { className: "w-full text-xs border-collapse table-fixed", children: [_jsx("thead", { className: "bg-slate-100", children: _jsxs("tr", { className: "text-left text-slate-900", children: [_jsx("th", { className: "px-2 py-2 font-medium whitespace-nowrap w-[10%] text-right pr-4", children: "Data" }), _jsx("th", { className: "px-3 py-2 font-medium whitespace-nowrap w-[8%] text-center", children: "OP" }), _jsx("th", { className: "px-3 py-2 font-medium whitespace-nowrap w-[8%]", children: "Proc." }), _jsx("th", { className: "px-3 py-2 font-medium text-right whitespace-nowrap w-[10%]", children: "Metragem" }), _jsx("th", { className: "px-3 py-2 font-medium text-center whitespace-nowrap w-[9%]", children: "Hora Inicial" }), _jsx("th", { className: "px-3 py-2 font-medium text-center whitespace-nowrap w-[9%]", children: "Hora Final" }), _jsx("th", { className: "px-3 py-2 font-medium text-right whitespace-nowrap w-[8%]", children: "Tempo" }), _jsx("th", { className: "px-3 py-2 font-medium text-center whitespace-nowrap w-[8%]", children: "Setup" }), _jsx("th", { className: "px-3 py-2 font-medium text-center whitespace-nowrap w-[8%]", children: "Parada" }), _jsx("th", { className: "px-3 py-2 font-medium text-right whitespace-nowrap w-[10%]", children: "Previsto" }), _jsx("th", { className: "px-3 py-2 font-medium text-right whitespace-nowrap w-[10%]", children: "Dif. Tempo" })] }) }), _jsx("tbody", { children: m.rows.map((r, idx) => {
                                        const dif = r.tempo - r.tempoEsperado;
                                        const difPositive = dif <= 0;
                                        return (_jsxs("tr", { className: `border-t border-slate-200 text-slate-900 ${idx % 2 === 1 ? "bg-emerald-100/40" : "bg-white"}`, children: [_jsx("td", { className: "px-2 py-1.5 whitespace-nowrap tabular-nums text-[11px] text-right pr-4", children: r.data ? r.data.split("-").reverse().join("/") : "—" }), _jsx("td", { className: "px-3 py-1.5 whitespace-nowrap text-center", children: r.num_op || "—" }), _jsx("td", { className: "px-3 py-1.5 whitespace-nowrap text-[11px]", children: r.processo || "—" }), _jsx("td", { className: "px-3 py-1.5 text-right tabular-nums font-bold text-[13px]", children: fmtNum(r.metragem, 2) }), _jsx("td", { className: "px-3 py-1.5 text-center tabular-nums font-bold text-[13px]", children: r.hora_inicial || "—" }), _jsx("td", { className: "px-3 py-1.5 text-center tabular-nums font-bold text-[13px]", children: r.hora_final || "—" }), _jsx("td", { className: "px-3 py-1.5 text-right tabular-nums font-bold text-cyan-700 text-[13px]", children: fmtHoras(r.tempo) }), _jsx("td", { className: "px-3 py-1.5 text-center tabular-nums font-bold text-amber-600 text-[13px]", children: r.setup ? fmtMinutos(r.setup) : "—" }), _jsx("td", { className: "px-3 py-1.5 text-center tabular-nums font-bold text-rose-600 text-[13px]", children: r.parada ? fmtMinutos(r.parada) : "—" }), _jsx("td", { className: "px-3 py-1.5 text-right tabular-nums font-bold text-blue-700 text-[13px]", children: fmtHoras(r.tempoEsperado) }), _jsx("td", { className: `px-3 py-1.5 text-right tabular-nums font-bold text-[13px] ${difPositive ? "text-emerald-600" : "text-rose-600"}`, children: r.tempo > 0 ? (difPositive ? "-" : "+") + fmtHoras(Math.abs(dif)) : "—" })] }, r.id || idx));
                                    }) })] }) })] }, m.maquina)))] }));
}
