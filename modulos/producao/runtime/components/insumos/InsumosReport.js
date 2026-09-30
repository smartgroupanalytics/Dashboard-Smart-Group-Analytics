import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from "react";
import { Search, Printer, ChevronRight, FlaskConical, AlertOctagon } from "lucide-react";
import InsumosOpDetail from "./InsumosOpDetail.js";
import InsumosOpFilterDialog from "./InsumosOpFilterDialog.js";
export default function InsumosReport({ records, variant = "default", opFilter, onOpFilterChange }) {
    const isDensa = variant === "densa";
    const isPastel = variant === "pastel";
    const isCobalt = variant === "cobalt";
    const [opFilterOpen, setOpFilterOpen] = useState(false);
    const [onlyNegative, setOnlyNegative] = useState(false);
    const [expanded, setExpanded] = useState({});
    const filteredRecords = useMemo(() => {
        let recs = records;
        if (onlyNegative) {
            const map = {};
            recs.forEach((r) => {
                const key = r.num_op || "(sem OP)";
                if (!map[key])
                    map[key] = { qtde_prevista: 0, qtde_realizada: 0, valor_previsto: 0, valor_realizado: 0 };
                map[key].qtde_prevista += r.qtde_prevista || 0;
                map[key].qtde_realizada += r.qtde_realizada || 0;
                map[key].valor_previsto += r.valor_previsto || 0;
                map[key].valor_realizado += r.valor_realizado || 0;
            });
            const negativeOps = new Set(Object.entries(map)
                .filter(([, t]) => t.valor_realizado > t.valor_previsto)
                .map(([k]) => k));
            recs = recs.filter((r) => negativeOps.has(r.num_op || "(sem OP)"));
        }
        return recs;
    }, [records, onlyNegative]);
    const groupedOps = useMemo(() => {
        const map = {};
        filteredRecords.forEach((r) => {
            const key = r.num_op || "(sem OP)";
            if (!map[key])
                map[key] = { num_op: key, data: r.data, descricao_produto: r.descricao_produto, rows: [] };
            map[key].rows.push(r);
        });
        return Object.values(map);
    }, [filteredRecords]);
    const opTotals = useMemo(() => {
        return groupedOps.map((g) => {
            const totals = g.rows.reduce((acc, r) => ({
                qtde_prevista: acc.qtde_prevista + (r.qtde_prevista || 0),
                qtde_realizada: acc.qtde_realizada + (r.qtde_realizada || 0),
                valor_previsto: acc.valor_previsto + (r.valor_previsto || 0),
                valor_realizado: acc.valor_realizado + (r.valor_realizado || 0),
            }), { qtde_prevista: 0, qtde_realizada: 0, valor_previsto: 0, valor_realizado: 0 });
            const hasNaoPrevisto = g.rows.some((r) => {
                const v = String(r.previsto || "").toLowerCase().trim();
                return v === "nao previsto" || v === "não previsto" || v === "naoprevisto" || v === "n";
            });
            return { ...totals, hasNaoPrevisto };
        });
    }, [groupedOps]);
    const totals = useMemo(() => {
        return filteredRecords.reduce((acc, r) => ({
            qtde_prevista: acc.qtde_prevista + (r.qtde_prevista || 0),
            qtde_realizada: acc.qtde_realizada + (r.qtde_realizada || 0),
            valor_previsto: acc.valor_previsto + (r.valor_previsto || 0),
            valor_realizado: acc.valor_realizado + (r.valor_realizado || 0),
        }), { qtde_prevista: 0, qtde_realizada: 0, valor_previsto: 0, valor_realizado: 0 });
    }, [filteredRecords]);
    const fmtNum = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtCurrency = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const overClass = (realizado, previsto) => realizado > previsto
        ? (isCobalt ? "text-blue-700 font-bold" : isDensa ? "text-blue-700 font-bold" : "text-rose-600 font-bold")
        : (isCobalt ? "text-slate-700" : isPastel ? "text-slate-600" : "text-slate-700");
    const toggle = (key) => setExpanded((s) => ({ ...s, [key]: !s[key] }));
    // Conditional styling
    const rootCls = isCobalt
        ? "bc-report insumos-report-root rounded-[16px] overflow-hidden bg-[rgba(255,255,255,0.9)] border border-blue-200 flex flex-col h-full"
        : isPastel
            ? "iq-report insumos-report-root rounded-[20px] overflow-hidden bg-white border border-slate-200 flex flex-col h-full"
            : isDensa
                ? "insumos-report-root rounded-[15px] overflow-hidden shadow-sm bg-white/90 border border-blue-200 flex flex-col h-full"
                : "insumos-report-root insumos-report-anim rounded-[14px] overflow-hidden shadow-sm bg-white/80 border border-slate-300 flex flex-col h-full";
    const rootStyle = isCobalt
        ? { animation: "bc-rise 0.6s 0.25s both" }
        : isPastel
            ? { animation: "iq-scale-in 0.45s cubic-bezier(.2,.8,.2,1) 0.38s both" }
            : isDensa
                ? { animation: "insumos-slide-up 0.65s 0.25s both" }
                : { animation: "insumos-rise 0.7s 0.18s both" };
    const headCls = isCobalt
        ? "px-[21px] pt-[19px] pb-[16px] border-b border-blue-200"
        : isPastel
            ? "iq-report-head px-[22px] pt-5 pb-[17px] border-b border-violet-200 bg-violet-100"
            : isDensa
                ? "px-[17px] pt-[15px] pb-[13px] border-b border-blue-200 bg-blue-50"
                : "px-[18px] pt-[17px] pb-[14px] border-b border-slate-300 bg-slate-100/86";
    const titleCls = isCobalt
        ? "m-0 text-[17px] font-extrabold tracking-[0.02em] text-blue-900"
        : isPastel
            ? "iq-report-title m-0 text-[13px] uppercase tracking-[0.1em] text-violet-800 font-extrabold"
            : isDensa
                ? "m-0 text-xs uppercase tracking-[0.1em] text-blue-800 font-bold"
                : "m-0 text-xs uppercase tracking-[0.11em] text-slate-700 font-bold";
    const searchCls = isDensa
        ? "densa-search w-full py-2 pl-8 pr-8 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 border border-blue-200 text-xs transition-colors hover:border-blue-300 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 resize-y min-h-[34px]"
        : "w-full py-2 pl-8 pr-8 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 border border-slate-300 text-xs focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 resize-y min-h-[34px]";
    const toolBase = isCobalt
        ? "flex items-center gap-1.5 h-[34px] px-2.5 rounded-lg bg-white text-blue-800 border border-blue-200 text-[11px] font-bold transition-all hover:bg-blue-50 print-hide"
        : isPastel
            ? "iq-tool flex items-center gap-1.5 h-[34px] px-2.5 rounded-[11px] bg-white text-violet-700 border border-violet-300 text-[11px] font-bold transition-all hover:bg-amber-100 hover:text-amber-700 print-hide"
            : isDensa
                ? "densa-tool flex items-center gap-1.5 h-[31px] px-2.5 rounded-lg bg-white text-blue-800 border border-blue-200 text-[11px] font-bold transition-all hover:bg-blue-100 print-hide"
                : "flex items-center gap-1.5 h-[34px] px-2.5 rounded-lg bg-white text-slate-600 border border-slate-300 text-[11px] font-bold transition-all hover:bg-slate-200 hover:text-slate-800 print-hide";
    const negativeActive = isCobalt
        ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
        : isPastel
            ? "bg-violet-600 text-white border-violet-600 hover:bg-violet-700"
            : isDensa
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "bg-amber-700 text-white border-amber-700 hover:bg-amber-800";
    const thCls = isCobalt
        ? "px-2 py-3 text-left font-extrabold whitespace-nowrap sticky top-0 bg-blue-600 text-white z-10"
        : isPastel
            ? "iq-table px-2.5 py-3 text-left font-bold whitespace-nowrap sticky top-0 bg-teal-700 text-white z-10"
            : isDensa
                ? "px-2 py-2.5 text-left font-semibold whitespace-nowrap sticky top-0 bg-blue-800 text-white z-10"
                : "px-2 py-2.5 text-left font-semibold whitespace-nowrap sticky top-0 bg-slate-600 text-white z-10";
    const tdBase = isCobalt
        ? "px-2 py-2.5 border-b border-blue-100 text-slate-700"
        : isPastel
            ? "iq-table px-2.5 py-3 border-b border-slate-200 text-slate-600"
            : isDensa
                ? "px-2 py-2.5 border-b border-blue-100 text-slate-700"
                : "px-2 py-2.5 border-b border-slate-200 text-slate-700";
    const trBase = isCobalt
        ? "border-b border-blue-100 hover:bg-blue-50 transition-colors cursor-pointer even:bg-[#f8fbff]"
        : isPastel
            ? "border-b border-slate-200 hover:bg-teal-50 transition-colors cursor-pointer"
            : isDensa
                ? "border-b border-blue-100 hover:bg-blue-50 transition-colors cursor-pointer even:bg-[#f8fbff] densa-row"
                : "border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer";
    const tfootCls = isCobalt
        ? "bg-blue-100 font-bold border-t-2 border-blue-600"
        : isPastel
            ? "bg-sky-100 font-bold border-t-2 border-sky-200"
            : isDensa
                ? "bg-blue-100 font-bold border-t-2 border-blue-300"
                : "bg-slate-200 font-bold border-t-2 border-slate-400";
    const tfootTextCls = isCobalt ? "text-blue-900" : isPastel ? "text-sky-800" : isDensa ? "text-blue-800" : "text-slate-800";
    const footerCls = isCobalt
        ? "px-[21px] py-3 border-t border-blue-100 bg-blue-50/50 text-slate-500 text-[11px] print-hide"
        : isPastel
            ? "px-[22px] py-3 border-t border-slate-200 bg-slate-50 text-slate-500 text-[11px] print-hide"
            : isDensa
                ? "px-[17px] py-3 border-t border-blue-100 bg-blue-50/50 text-slate-500 text-[11px] print-hide"
                : "px-[18px] py-3 border-t border-slate-300 bg-slate-50 text-slate-500 text-[11px] print-hide";
    if (records.length === 0) {
        return (_jsx("div", { className: `${rootCls} p-8 text-center`, children: _jsx("p", { className: "text-slate-500", children: "Nenhuma OP encontrada para o per\u00EDodo selecionado." }) }));
    }
    return (_jsxs("div", { className: rootCls, style: rootStyle, children: [_jsx("div", { className: "insumos-print-title", children: _jsx("h1", { children: "Relat\u00F3rio de Insumos Qu\u00EDmicos" }) }), _jsxs("div", { className: headCls, children: [_jsx("h2", { className: titleCls, children: "Relat\u00F3rio de OPs" }), _jsxs("div", { className: "mt-3 flex gap-2 items-center justify-between flex-wrap", children: [_jsxs("div", { className: "flex gap-2 items-center", children: [_jsxs("button", { onClick: () => setOpFilterOpen(true), className: toolBase, children: [_jsx(Search, { className: "w-3.5 h-3.5" }), " Filtrar OPs"] }), opFilter && (_jsxs("span", { className: "text-[11px] text-slate-500 font-medium print-hide", children: ["Filtro ativo \u00B7 ", _jsx("button", { onClick: () => onOpFilterChange(""), className: "text-rose-500 hover:text-rose-700 underline", children: "limpar" })] }))] }), _jsxs("span", { className: "text-[11px] text-slate-500 font-medium whitespace-nowrap print-hide", children: [groupedOps.length, " ", groupedOps.length === 1 ? "OP" : "OPs", " \u2022 ", filteredRecords.length, " ", filteredRecords.length === 1 ? "registro" : "registros"] }), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsxs("button", { onClick: () => setOnlyNegative((v) => !v), className: `${toolBase} border ${onlyNegative ? negativeActive : ""}`, children: [_jsx(AlertOctagon, { className: "w-3.5 h-3.5" }), " OPS Negativas"] }), _jsxs("button", { onClick: () => {
                                            document.body.classList.add("printing-insumos");
                                            window.print();
                                            setTimeout(() => document.body.classList.remove("printing-insumos"), 500);
                                        }, className: toolBase, children: [_jsx(Printer, { className: "w-3.5 h-3.5" }), " Imprimir"] })] })] })] }), _jsx("div", { className: "overflow-auto max-h-[680px] print:max-h-none print:overflow-visible", children: _jsxs("table", { className: "w-full text-[11px]", children: [_jsx("thead", { children: _jsxs("tr", { className: `${isCobalt ? "bg-blue-600" : isPastel ? "bg-teal-700" : isDensa ? "bg-blue-800" : "bg-slate-600"} text-white border-b ${isCobalt ? "border-blue-500" : isPastel ? "border-teal-600" : isDensa ? "border-blue-700" : "border-slate-400"}`, children: [_jsx("th", { className: `${thCls} w-8 print-hide` }), _jsx("th", { className: `${thCls} whitespace-nowrap`, children: "N\u00BA OP" }), _jsx("th", { className: thCls, children: "Descri\u00E7\u00E3o do Produto" }), _jsx("th", { className: `${thCls} text-right whitespace-nowrap`, children: "Qtde Prevista" }), _jsx("th", { className: `${thCls} text-right whitespace-nowrap`, children: "Qtde Realizada" }), _jsx("th", { className: `${thCls} text-right whitespace-nowrap`, children: "Valor Previsto" }), _jsx("th", { className: `${thCls} text-right whitespace-nowrap`, children: "Valor Realizado" })] }) }), _jsx("tbody", { children: groupedOps.map((g, i) => {
                                const key = g.num_op;
                                const isOpen = !!expanded[key];
                                const t = opTotals[i];
                                return (_jsxs(React.Fragment, { children: [_jsxs("tr", { className: t.valor_realizado > t.valor_previsto
                                                ? `${isCobalt || isDensa ? "border-b border-blue-100" : "border-b border-slate-200"} bg-red-100 hover:bg-red-200 transition-colors cursor-pointer`
                                                : trBase, onClick: () => toggle(key), children: [_jsx("td", { className: `${tdBase} text-slate-400 print-hide`, children: _jsx(ChevronRight, { className: `w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}` }) }), _jsxs("td", { className: `${tdBase} text-slate-800 font-bold whitespace-nowrap`, children: [g.num_op, t.hasNaoPrevisto && (_jsx("span", { className: "inline-block ml-1.5 px-1.5 py-0.5 rounded bg-rose-200 text-rose-800 text-[10px] font-bold uppercase whitespace-nowrap", children: "N\u00E3o Previsto" }))] }), _jsx("td", { className: `${tdBase} max-w-[220px] truncate`, title: g.descricao_produto, children: g.descricao_produto || "—" }), _jsx("td", { className: `${tdBase} text-right tabular-nums text-slate-700 whitespace-nowrap`, children: fmtNum(t.qtde_prevista) }), _jsx("td", { className: `${tdBase} text-right tabular-nums whitespace-nowrap ${overClass(t.qtde_realizada, t.qtde_prevista)}`, children: fmtNum(t.qtde_realizada) }), _jsx("td", { className: `${tdBase} text-right tabular-nums text-slate-700 whitespace-nowrap`, children: fmtCurrency(t.valor_previsto) }), _jsx("td", { className: `${tdBase} text-right tabular-nums whitespace-nowrap ${overClass(t.valor_realizado, t.valor_previsto)}`, children: fmtCurrency(t.valor_realizado) })] }), _jsx(InsumosOpDetail, { rows: g.rows, className: isOpen ? "" : "insumos-detail-hidden" })] }, key));
                            }) }), _jsx("tfoot", { children: _jsxs("tr", { className: tfootCls, children: [_jsx("td", { className: `${tdBase} print-hide` }), _jsx("td", { colSpan: 2, className: `${tdBase} ${tfootTextCls} uppercase text-[11px] tracking-wide`, children: "Total Geral" }), _jsx("td", { className: `${tdBase} text-right tabular-nums ${tfootTextCls} whitespace-nowrap`, children: fmtNum(totals.qtde_prevista) }), _jsx("td", { className: `${tdBase} text-right tabular-nums whitespace-nowrap ${overClass(totals.qtde_realizada, totals.qtde_prevista)}`, children: fmtNum(totals.qtde_realizada) }), _jsx("td", { className: `${tdBase} text-right tabular-nums ${tfootTextCls} whitespace-nowrap`, children: fmtCurrency(totals.valor_previsto) }), _jsx("td", { className: `${tdBase} text-right tabular-nums whitespace-nowrap ${overClass(totals.valor_realizado, totals.valor_previsto)}`, children: fmtCurrency(totals.valor_realizado) })] }) })] }) }), _jsxs("div", { className: `${footerCls} flex items-center gap-2`, children: [_jsx(FlaskConical, { className: `w-3.5 h-3.5 ${isDensa ? "text-blue-600" : ""}` }), _jsx("span", { children: "Clique em uma OP para ver o consumo detalhado de insumos." })] }), _jsx(InsumosOpFilterDialog, { open: opFilterOpen, onOpenChange: setOpFilterOpen, currentFilter: opFilter, onApply: onOpFilterChange })] }));
}
