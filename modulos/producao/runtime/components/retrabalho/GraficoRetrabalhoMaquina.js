import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChartBar, Cog } from "lucide-react";
import PentagonalBarChart from "@/components/retrabalho/PentagonalBarChart";
import HorizontalPentagonalBarChart from "@/components/retrabalho/HorizontalPentagonalBarChart";
export default function GraficoRetrabalhoMaquina({ open, onOpenChange, rows, periodoLabel }) {
    const porRetrabalho = useMemo(() => {
        const map = {};
        rows.forEach((r) => {
            const desc = r.descricao_retrabalho || "Não informado";
            map[desc] = (map[desc] || 0) + 1;
        });
        return Object.entries(map).map(([descricao, total]) => ({ descricao, total }));
    }, [rows]);
    const porMaquina = useMemo(() => {
        const map = {};
        rows.forEach((r) => {
            const maq = r.maquina || "Sem máquina";
            map[maq] = (map[maq] || 0) + 1;
        });
        return Object.entries(map).map(([maquina, total]) => ({ maquina, total }));
    }, [rows]);
    const semDados = porRetrabalho.length === 0 && porMaquina.length === 0;
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-4xl h-[85vh] overflow-hidden flex flex-col bg-white", children: [_jsxs(DialogHeader, { className: "flex-shrink-0", children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(ChartBar, { className: "w-5 h-5 text-violet-500" }), "Retrabalhos por M\u00E1quina"] }), _jsx(DialogDescription, { children: "Quantidade de retrabalhos e ocorr\u00EAncias por m\u00E1quina." })] }), semDados ? (_jsx("p", { className: "text-center text-slate-400 py-8", children: "Nenhum registro para exibir." })) : (_jsxs("div", { className: "flex-1 overflow-auto flex flex-col gap-4 min-h-0 pr-1", children: [_jsxs("div", { className: "flex flex-col flex-shrink-0", children: [_jsxs("h3", { className: "text-[11px] font-semibold text-slate-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5", children: [_jsx(ChartBar, { className: "w-3.5 h-3.5 text-violet-400" }), "N\u00BA de Retrabalhos (por tipo)"] }), _jsx("div", { className: "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm", children: _jsx(HorizontalPentagonalBarChart, { data: porRetrabalho, labelKey: "descricao", valueKey: "total", height: 420, maxItems: 10 }) })] }), _jsxs("div", { className: "flex flex-col flex-shrink-0", children: [_jsxs("h3", { className: "text-[11px] font-semibold text-slate-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5", children: [_jsx(Cog, { className: "w-3.5 h-3.5 text-cyan-400" }), "Ocorr\u00EAncias por M\u00E1quina"] }), _jsx("div", { className: "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm", children: _jsx(PentagonalBarChart, { data: porMaquina, labelKey: "maquina", valueKey: "total", height: 280, maxItems: 8 }) })] })] }))] }) }));
}
