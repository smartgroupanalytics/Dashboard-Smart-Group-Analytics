import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
export default function InsumosOpDetail({ rows, className = "" }) {
    const fmtNum = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtCurrency = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const overClass = (realizado, previsto) => realizado > previsto ? "text-rose-600 font-bold" : "text-slate-700";
    const isNaoPrevisto = (r) => {
        const v = String(r.previsto || "").toLowerCase().trim();
        return v === "nao previsto" || v === "não previsto" || v === "naoprevisto" || v === "n";
    };
    return (_jsx("tr", { className: `border-b border-slate-200 ${className}`, children: _jsx("td", { colSpan: 6, className: "p-0", children: _jsx("div", { className: "bg-slate-50 px-4 py-3", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200", children: [_jsx("th", { className: "px-2 py-1.5 text-left font-semibold", children: "Insumo" }), _jsx("th", { className: "px-2 py-1.5 text-right font-semibold whitespace-nowrap", children: "Qtde Prevista" }), _jsx("th", { className: "px-2 py-1.5 text-right font-semibold whitespace-nowrap", children: "Qtde Realizada" }), _jsx("th", { className: "px-2 py-1.5 text-right font-semibold whitespace-nowrap", children: "Valor Previsto" }), _jsx("th", { className: "px-2 py-1.5 text-right font-semibold whitespace-nowrap", children: "Valor Realizado" }), _jsx("th", { className: "px-2 py-1.5 text-center font-semibold whitespace-nowrap", children: "Previsto" })] }) }), _jsx("tbody", { children: rows.map((r, i) => {
                                const foraFormulacao = (!r.qtde_prevista || r.qtde_prevista === 0) && (r.qtde_realizada || 0) > 0;
                                const naoPrev = isNaoPrevisto(r);
                                const insumoLabel = naoPrev
                                    ? (r.descricao_nao_previsto || r.descricao_insumo || "—")
                                    : foraFormulacao
                                        ? (r.descricao_produto || r.descricao_insumo || "—")
                                        : (r.descricao_insumo || "—");
                                return (_jsxs("tr", { className: `border-b border-slate-100 hover:bg-slate-100 ${foraFormulacao ? "bg-amber-50" : ""} ${naoPrev ? "bg-rose-50" : ""}`, children: [_jsxs("td", { className: "px-2 py-1.5 text-slate-700 max-w-[320px] truncate", title: insumoLabel, children: [foraFormulacao && (_jsx("span", { className: "inline-block mr-1.5 px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 text-[10px] font-bold uppercase whitespace-nowrap", children: "Fora Formula\u00E7\u00E3o" })), insumoLabel] }), _jsx("td", { className: "px-2 py-1.5 text-right tabular-nums text-slate-700 whitespace-nowrap", children: fmtNum(r.qtde_prevista) }), _jsx("td", { className: `px-2 py-1.5 text-right tabular-nums whitespace-nowrap ${overClass(r.qtde_realizada, r.qtde_prevista)}`, children: fmtNum(r.qtde_realizada) }), _jsx("td", { className: "px-2 py-1.5 text-right tabular-nums text-slate-700 whitespace-nowrap", children: fmtCurrency(r.valor_previsto) }), _jsx("td", { className: `px-2 py-1.5 text-right tabular-nums whitespace-nowrap ${overClass(r.valor_realizado, r.valor_previsto)}`, children: fmtCurrency(naoPrev && r.valor_realizado_nao_previsto ? r.valor_realizado_nao_previsto : r.valor_realizado) }), _jsx("td", { className: "px-2 py-1.5 text-center whitespace-nowrap", children: r.previsto ? (_jsx("span", { className: `inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${naoPrev ? "bg-rose-200 text-rose-800" : "bg-emerald-200 text-emerald-800"}`, children: naoPrev ? "Não" : "Sim" })) : "—" })] }, r.id || i));
                            }) })] }) }) }) }));
}
