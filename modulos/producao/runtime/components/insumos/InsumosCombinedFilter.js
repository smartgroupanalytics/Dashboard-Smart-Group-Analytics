import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
const MESES = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
function pad(n) {
    return String(n).padStart(2, "0");
}
function isoOf(y, m, d) {
    return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function daysInMonthOf(y, m) {
    return new Date(y, m + 1, 0).getDate();
}
export default function InsumosCombinedFilter({ selectedDays, onSelect, triggerClassName }) {
    const [open, setOpen] = useState(false);
    const today = new Date();
    const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
    const count = selectedDays.length;
    const summary = count === 0
        ? "Mês e dias"
        : count === 1
            ? selectedDays[0].split("-").reverse().join("/")
            : `${count} datas`;
    const monthDays = (y, m) => Array.from({ length: daysInMonthOf(y, m) }, (_, i) => isoOf(y, m, i + 1));
    const isMonthFull = (y, m) => {
        const days = monthDays(y, m);
        return days.length > 0 && days.every((d) => selectedDays.includes(d));
    };
    const isMonthPartial = (y, m) => {
        const days = monthDays(y, m);
        return days.some((d) => selectedDays.includes(d)) && !days.every((d) => selectedDays.includes(d));
    };
    const toggleMonth = (y, m) => {
        const days = monthDays(y, m);
        if (days.every((d) => selectedDays.includes(d))) {
            onSelect(selectedDays.filter((d) => !days.includes(d)));
        }
        else {
            onSelect(days.sort());
        }
    };
    const toggleDay = (iso) => {
        if (selectedDays.includes(iso)) {
            onSelect(selectedDays.filter((x) => x !== iso));
        }
        else {
            onSelect([...selectedDays, iso].sort());
        }
    };
    const prev = () => setView((v) => {
        const m = v.m - 1;
        return m < 0 ? { y: v.y - 1, m: 11 } : { ...v, m };
    });
    const next = () => setView((v) => {
        const m = v.m + 1;
        return m > 11 ? { y: v.y + 1, m: 0 } : { ...v, m };
    });
    const daysInMonth = daysInMonthOf(view.y, view.m);
    return (_jsxs(Popover, { open: open, onOpenChange: setOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", size: "sm", className: `gap-2 h-9 ${triggerClassName || "bg-white text-slate-800 hover:bg-white"}`, children: [_jsx(Calendar, { className: "w-4 h-4" }), _jsx("span", { className: "max-w-[180px] truncate", children: summary })] }) }), _jsxs(PopoverContent, { className: "w-auto p-3", align: "end", children: [_jsxs("p", { className: "text-[11px] font-semibold text-slate-500 mb-2", children: ["Meses de ", view.y] }), _jsx("div", { className: "grid grid-cols-4 gap-1", children: MESES.map((mes, i) => {
                            const full = isMonthFull(view.y, i);
                            const partial = isMonthPartial(view.y, i);
                            return (_jsx("button", { type: "button", onClick: () => toggleMonth(view.y, i), className: `flex items-center justify-center h-8 rounded-md text-xs font-semibold transition-colors border ${full
                                    ? "bg-primary text-primary-foreground border-transparent"
                                    : partial
                                        ? "bg-primary/25 text-primary border-transparent"
                                        : "hover:bg-accent border-transparent"}`, children: mes }, i));
                        }) }), _jsxs("div", { className: "mt-3 pt-3 border-t border-border", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7", onClick: prev, children: _jsx(ChevronLeft, { className: "w-4 h-4" }) }), _jsxs("span", { className: "text-sm font-semibold", children: [MESES[view.m], " ", view.y] }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7", onClick: next, children: _jsx(ChevronRight, { className: "w-4 h-4" }) })] }), _jsx("div", { className: "grid grid-cols-7 gap-1", children: Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                                    const iso = isoOf(view.y, view.m, d);
                                    const checked = selectedDays.includes(iso);
                                    return (_jsx("button", { type: "button", onClick: () => toggleDay(iso), className: `flex items-center justify-center h-8 w-8 rounded-md text-xs transition-colors ${checked
                                            ? "bg-primary text-primary-foreground font-semibold"
                                            : "hover:bg-accent border border-transparent"}`, children: d }, iso));
                                }) })] }), _jsxs("div", { className: "flex justify-between gap-1 mt-3 pt-2 border-t border-border", children: [_jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-[11px]", onClick: () => onSelect([isoOf(today.getFullYear(), today.getMonth(), today.getDate())]), children: "Hoje" }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-[11px]", onClick: () => {
                                    const days = [...selectedDays];
                                    for (let d = 1; d <= daysInMonth; d++) {
                                        const dt = new Date(view.y, view.m, d);
                                        const dow = dt.getDay();
                                        const iso = isoOf(view.y, view.m, d);
                                        if (dow !== 0 && dow !== 6 && !days.includes(iso))
                                            days.push(iso);
                                    }
                                    onSelect(days.sort());
                                }, children: "+ Dias \u00FAteis" }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-7 text-[11px]", onClick: () => onSelect([]), children: "Limpar" })] }), count > 0 && (_jsx("div", { className: "mt-2 flex flex-wrap gap-1 max-w-[320px]", children: selectedDays.map((d) => (_jsxs("button", { type: "button", onClick: () => toggleDay(d), className: "flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-[11px]", children: [d.split("-").reverse().join("/"), _jsx("span", { className: "text-muted-foreground", children: _jsx(X, { className: "w-3 h-3" }) })] }, d))) }))] })] }));
}
