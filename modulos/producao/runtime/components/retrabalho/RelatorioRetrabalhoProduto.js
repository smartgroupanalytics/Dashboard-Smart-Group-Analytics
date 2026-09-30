import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Package } from "lucide-react";
import { fmtMeters } from "@/lib/format";
export default function RelatorioRetrabalhoProduto({ open, onOpenChange, rows, periodoLabel }) {
    const handlePrint = () => {
        document.body.classList.add("printing-retrabalho-produto");
        setTimeout(() => {
            window.print();
            setTimeout(() => document.body.classList.remove("printing-retrabalho-produto"), 500);
        }, 100);
    };
    // Agrupa por produto → OP → descrição do retrabalho (contagem e metros)
    const grouped = useMemo(() => {
        const map = {};
        rows.forEach((r) => {
            const produto = r.produto || "Sem produto";
            if (!map[produto])
                map[produto] = { ops: {}, totalMetros: 0, totalReg: 0 };
            map[produto].totalMetros += r.metros || 0;
            map[produto].totalReg += 1;
            const op = r.op || "—";
            if (!map[produto].ops[op])
                map[produto].ops[op] = { retrabalhos: {}, totalMetros: 0, totalReg: 0 };
            map[produto].ops[op].totalMetros += r.metros || 0;
            map[produto].ops[op].totalReg += 1;
            const desc = r.descricao_retrabalho || "Não informado";
            if (!map[produto].ops[op].retrabalhos[desc]) {
                map[produto].ops[op].retrabalhos[desc] = { count: 0, metros: 0 };
            }
            map[produto].ops[op].retrabalhos[desc].count += 1;
            map[produto].ops[op].retrabalhos[desc].metros += r.metros || 0;
        });
        return Object.entries(map)
            .map(([produto, data]) => ({
            produto,
            ...data,
            ops: Object.entries(data.ops).map(([op, opData]) => ({
                op,
                ...opData,
                retrabalhos: Object.entries(opData.retrabalhos)
                    .map(([desc, d]) => ({ desc, ...d }))
                    .sort((a, b) => b.count - a.count),
            })).sort((a, b) => b.totalReg - a.totalReg),
        }))
            .sort((a, b) => b.totalReg - a.totalReg);
    }, [rows]);
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-5xl max-h-[88vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(Package, { className: "w-5 h-5 text-violet-600" }), "Relat\u00F3rio de Retrabalhos por Produto"] }), _jsx(DialogDescription, { children: "Agrupado por produto e OP, mostrando os tipos de retrabalho e suas ocorr\u00EAncias." })] }), _jsx("div", { className: "flex justify-end mb-2", children: _jsxs(Button, { variant: "outline", size: "sm", className: "h-8 gap-1.5", onClick: handlePrint, children: [_jsx(Printer, { className: "w-4 h-4" }), " Imprimir"] }) }), _jsxs("div", { className: "retrabalho-produto-root space-y-4", children: [_jsx("h3", { className: "text-center text-lg font-extrabold text-slate-900 print-only", children: "Relat\u00F3rio de Retrabalhos por Produto" }), grouped.length === 0 && (_jsx("p", { className: "text-center text-slate-500 py-8", children: "Nenhum registro para o per\u00EDodo selecionado." })), grouped.map((prod) => (_jsxs("div", { className: "rounded-xl border border-slate-300 overflow-hidden", children: [_jsxs("div", { className: "bg-violet-700 text-white px-4 py-2.5 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx(Package, { className: "w-4 h-4 shrink-0" }), _jsx("span", { className: "font-bold text-sm truncate", title: prod.produto, children: prod.produto })] }), _jsxs("div", { className: "flex items-center gap-3 text-xs shrink-0 ml-3", children: [_jsxs("span", { className: "bg-white/20 px-2 py-0.5 rounded", children: [prod.ops.length, " OP(s)"] }), _jsxs("span", { className: "bg-white/20 px-2 py-0.5 rounded", children: [prod.totalReg, " retrab."] }), _jsxs("span", { className: "bg-white/20 px-2 py-0.5 rounded tabular-nums", children: [fmtMeters(prod.totalMetros), " m"] })] })] }), _jsxs("table", { className: "w-full text-xs border-collapse", children: [_jsx("thead", { className: "bg-slate-100", children: _jsxs("tr", { className: "text-left text-slate-700", children: [_jsx("th", { className: "px-3 py-2 font-medium whitespace-nowrap w-[12%]", children: "OP" }), _jsx("th", { className: "px-3 py-2 font-medium whitespace-nowrap w-[42%]", children: "Descri\u00E7\u00E3o do Retrabalho" }), _jsx("th", { className: "px-3 py-2 font-medium text-center whitespace-nowrap w-[12%]", children: "Ocorr\u00EAncias" }), _jsx("th", { className: "px-3 py-2 font-medium text-right whitespace-nowrap w-[16%]", children: "Metros Retrab." }), _jsx("th", { className: "px-3 py-2 font-medium text-center whitespace-nowrap w-[18%]", children: "% do Produto" })] }) }), _jsx("tbody", { children: prod.ops.flatMap((opData, opIdx) => {
                                                const rows = [];
                                                opData.retrabalhos.forEach((rt, rtIdx) => {
                                                    rows.push(_jsxs("tr", { className: `border-t border-slate-200 text-slate-700 ${(opIdx + rtIdx) % 2 === 0 ? "bg-white" : "bg-slate-50"}`, children: [_jsx("td", { className: "px-3 py-2 whitespace-nowrap text-center font-semibold text-slate-900", children: rtIdx === 0 ? opData.op : "" }), _jsx("td", { className: "px-3 py-2", children: rt.desc }), _jsxs("td", { className: "px-3 py-2 text-center tabular-nums font-bold text-violet-700", children: [rt.count, "x"] }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums", children: fmtMeters(rt.metros) }), _jsx("td", { className: "px-3 py-2 text-center tabular-nums", children: prod.totalMetros > 0 ? `${((rt.metros / prod.totalMetros) * 100).toFixed(1)}%` : "—" })] }, `${opData.op}-${rt.desc}`));
                                                });
                                                // linha de subtotal da OP
                                                rows.push(_jsxs("tr", { className: "bg-slate-100 border-t-2 border-slate-300", children: [_jsxs("td", { className: "px-3 py-1.5 text-right font-bold text-slate-600 text-[11px]", colSpan: 2, children: ["Subtotal OP ", opData.op] }), _jsxs("td", { className: "px-3 py-1.5 text-center tabular-nums font-bold text-slate-700 text-[11px]", children: [opData.totalReg, "x"] }), _jsx("td", { className: "px-3 py-1.5 text-right tabular-nums font-bold text-slate-700 text-[11px]", children: fmtMeters(opData.totalMetros) }), _jsx("td", { className: "px-3 py-1.5 text-center tabular-nums font-bold text-slate-700 text-[11px]", children: prod.totalMetros > 0 ? `${((opData.totalMetros / prod.totalMetros) * 100).toFixed(1)}%` : "—" })] }, `sub-${opData.op}`));
                                                return rows;
                                            }) })] })] }, prod.produto)))] })] }) }));
}
