import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FlaskConical } from "lucide-react";
export default function InsumosDistintosDialog({ open, onOpenChange, records }) {
    const insumos = useMemo(() => {
        const map = {};
        records.forEach((r) => {
            const key = r.descricao_insumo || "(sem insumo)";
            if (!map[key])
                map[key] = { descricao: key, ops: new Set(), produtos: new Set(), qtde: 0, qtdePrev: 0, valor: 0, valorPrev: 0 };
            if (r.num_op)
                map[key].ops.add(r.num_op);
            if (r.descricao_produto)
                map[key].produtos.add(r.descricao_produto);
            map[key].qtde += r.qtde_realizada || 0;
            map[key].qtdePrev += r.qtde_prevista || 0;
            map[key].valor += r.valor_realizado || 0;
            map[key].valorPrev += r.valor_previsto || 0;
        });
        return Object.values(map)
            .map((v) => {
            const difValor = v.valor - v.valorPrev;
            const difPct = v.valorPrev ? (difValor / v.valorPrev) * 100 : 0;
            return {
                descricao: v.descricao,
                numOps: v.ops.size,
                produtos: [...v.produtos].sort(),
                qtde: v.qtde,
                valor: v.valor,
                difValor,
                difPct,
            };
        })
            .filter((ins) => (ins.qtde > 0 || ins.valor > 0) && ins.descricao !== "(sem insumo)")
            .sort((a, b) => b.qtde - a.qtde);
    }, [records]);
    const fmtNum = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtCurrency = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const fmtPct = (v) => `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    const difColor = (v) => (v > 0 ? "text-rose-600" : "text-emerald-600");
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-4xl", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(FlaskConical, { className: "w-5 h-5 text-blue-600" }), "Insumos Distintos (", insumos.length, ")"] }) }), _jsx("div", { className: "max-h-[60vh] overflow-auto rounded-md border border-slate-200", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "sticky top-0 bg-slate-100", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-3 py-2 font-semibold text-slate-700", children: "Descri\u00E7\u00E3o do Insumo" }), _jsx("th", { className: "text-left px-3 py-2 font-semibold text-slate-700", children: "Produtos / C\u00F3digos" }), _jsx("th", { className: "text-right px-3 py-2 font-semibold text-slate-700 whitespace-nowrap", children: "N\u00BA OPs" }), _jsx("th", { className: "text-right px-3 py-2 font-semibold text-slate-700 whitespace-nowrap", children: "Qtde Realizada" }), _jsx("th", { className: "text-right px-3 py-2 font-semibold text-slate-700 whitespace-nowrap", children: "Valor Realizado" }), _jsx("th", { className: "text-right px-3 py-2 font-semibold text-slate-700 whitespace-nowrap", children: "Dif. Valor" }), _jsx("th", { className: "text-right px-3 py-2 font-semibold text-slate-700 whitespace-nowrap", children: "Dif. %" })] }) }), _jsx("tbody", { children: insumos.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "px-3 py-6 text-center text-slate-500", children: "Nenhum insumo encontrado." }) })) : insumos.map((ins, i) => (_jsxs("tr", { className: "border-t border-slate-100 hover:bg-slate-50 align-top", children: [_jsx("td", { className: "px-3 py-2 text-slate-800 font-medium", children: ins.descricao }), _jsx("td", { className: "px-3 py-2 text-slate-600 text-xs leading-relaxed", children: ins.produtos.length === 0 ? "—" : ins.produtos.join(", ") }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums text-slate-700", children: ins.numOps }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums text-slate-700", children: fmtNum(ins.qtde) }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums text-slate-800 font-semibold whitespace-nowrap", children: fmtCurrency(ins.valor) }), _jsx("td", { className: `px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${difColor(ins.difValor)}`, children: fmtCurrency(ins.difValor) }), _jsx("td", { className: `px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${difColor(ins.difPct)}`, children: fmtPct(ins.difPct) })] }, i))) })] }) })] }) }));
}
