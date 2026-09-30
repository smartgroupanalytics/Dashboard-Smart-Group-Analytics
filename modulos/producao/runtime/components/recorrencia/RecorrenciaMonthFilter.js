import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, ArrowRight, X } from "lucide-react";
const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
function pad(n) {
    return String(n).padStart(2, "0");
}
function isoOf(y, m, d) {
    return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function diasUteisMes(y, m) {
    const days = [];
    const dim = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) {
        const dt = new Date(y, m, d);
        const dow = dt.getDay();
        if (dow !== 0 && dow !== 6)
            days.push(isoOf(y, m, d));
    }
    return days;
}
export default function RecorrenciaMonthFilter({ selectedDays, onSelect, triggerClassName }) {
    const [open, setOpen] = useState(false);
    const today = new Date();
    const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
    const count = selectedDays.length;
    const summary = count === 0
        ? "Nenhuma data"
        : count === 1
            ? selectedDays[0].split("-").reverse().join("/")
            : `${count} datas`;
    const addMonth = () => {
        const uteis = diasUteisMes(view.y, view.m);
        const merged = [...selectedDays];
        uteis.forEach((iso) => { if (!merged.includes(iso))
            merged.push(iso); });
        onSelect(merged.sort());
    };
    const remove = (iso) => onSelect(selectedDays.filter((x) => x !== iso));
    const prev = () => setView((v) => {
        const m = v.m - 1;
        return m < 0 ? { y: v.y - 1, m: 11 } : { ...v, m };
    });
    const next = () => setView((v) => {
        const m = v.m + 1;
        return m > 11 ? { y: v.y + 1, m: 0 } : { ...v, m };
    });
    const uteisCount = diasUteisMes(view.y, view.m).length;
    return (_jsxs(Popover, { open: open, onOpenChange: setOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", size: "sm", className: `gap-2 h-9 ${triggerClassName || "bg-white text-slate-800 hover:bg-white"}`, children: [_jsx(Calendar, { className: "w-4 h-4" }), _jsx("span", { className: "max-w-[180px] truncate", children: summary })] }) }), _jsxs(PopoverContent, { className: "w-80 p-3", align: "end", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7", onClick: prev, children: _jsx(ChevronLeft, { className: "w-4 h-4" }) }), _jsxs("span", { className: "text-sm font-bold text-slate-900", children: [MESES[view.m], " ", view.y] }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7", onClick: next, children: _jsx(ChevronRight, { className: "w-4 h-4" }) })] }), _jsxs(Button, { onClick: addMonth, className: "w-full gap-2 bg-[#00798C] text-white hover:bg-[#006674] mb-2", children: ["Selecionar dias \u00FAteis deste m\u00EAs", _jsx(ArrowRight, { className: "w-4 h-4" })] }), _jsxs("p", { className: "text-[11px] text-slate-500 text-center mb-3", children: [uteisCount, " dias \u00FAteis \u2022 adiciona \u00E0 sele\u00E7\u00E3o atual"] }), count > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center justify-between mb-1.5 pt-2 border-t border-border", children: [_jsxs("span", { className: "text-[11px] font-semibold text-slate-600", children: [count, " data", count > 1 ? "s" : "", " selecionada", count > 1 ? "s" : ""] }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-6 text-[11px] text-rose-600 hover:text-rose-700", onClick: () => onSelect([]), children: "Limpar tudo" })] }), _jsx("div", { className: "max-h-40 overflow-y-auto flex flex-wrap gap-1", children: selectedDays.map((d) => (_jsxs("button", { type: "button", onClick: () => remove(d), className: "flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 text-[11px] text-slate-700", children: [d.split("-").reverse().join("/"), _jsx(X, { className: "w-3 h-3 text-slate-400" })] }, d))) })] }))] })] }));
}
