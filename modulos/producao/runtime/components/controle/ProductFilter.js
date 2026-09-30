import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Package, Check, ChevronDown, Search } from "lucide-react";
export default function ProductFilter({ products, selected, onSelect, triggerClassName }) {
    const [open, setOpen] = useState(false);
    const [busca, setBusca] = useState("");
    const sorted = useMemo(() => [...products].filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR")), [products]);
    const filtered = useMemo(() => {
        const t = busca.trim().toLowerCase();
        if (!t)
            return sorted;
        return sorted.filter((p) => p.toLowerCase().includes(t));
    }, [sorted, busca]);
    const label = selected.length === 0
        ? "Produto"
        : selected.length === 1
            ? selected[0]
            : `${selected.length} produtos`;
    const toggle = (p) => {
        if (selected.includes(p))
            onSelect(selected.filter((x) => x !== p));
        else
            onSelect([...selected, p]);
    };
    return (_jsxs(Popover, { open: open, onOpenChange: (o) => { setOpen(o); if (!o)
            setBusca(""); }, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", size: "sm", className: `h-9 gap-1.5 max-w-[220px] ${triggerClassName || "bg-white text-slate-800 hover:bg-white"}`, children: [_jsx(Package, { className: "w-4 h-4 shrink-0" }), _jsx("span", { className: "truncate", children: label }), _jsx(ChevronDown, { className: "w-3.5 h-3.5 opacity-60 shrink-0" })] }) }), _jsxs(PopoverContent, { className: "w-72 p-0", align: "start", children: [_jsxs("div", { className: "flex items-center justify-between px-3 py-2 border-b border-border", children: [_jsx("span", { className: "text-xs font-medium text-muted-foreground", children: selected.length > 0 ? `${selected.length} selecionado(s)` : "Filtrar por produto" }), selected.length > 0 && (_jsx("button", { className: "text-[11px] text-blue-600 hover:underline", onClick: () => onSelect([]), children: "Limpar" }))] }), _jsx("div", { className: "px-2 py-2 border-b border-border", children: _jsxs("div", { className: "flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2", children: [_jsx(Search, { className: "w-3.5 h-3.5 text-slate-400 shrink-0" }), _jsx("input", { autoFocus: true, type: "text", value: busca, onChange: (e) => setBusca(e.target.value), placeholder: "Buscar produto...", className: "w-full text-xs py-1.5 outline-none bg-transparent" })] }) }), _jsxs("div", { className: "max-h-64 overflow-y-auto py-1", children: [filtered.length === 0 && (_jsx("p", { className: "px-3 py-2 text-xs text-muted-foreground", children: sorted.length === 0 ? "Nenhum produto disponível" : "Nenhum produto encontrado" })), filtered.map((p) => {
                                const active = selected.includes(p);
                                return (_jsxs("button", { onClick: () => toggle(p), className: "w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent", children: [_jsx("span", { className: `flex items-center justify-center w-4 h-4 rounded border shrink-0 ${active ? "bg-blue-600 border-blue-600" : "border-slate-300"}`, children: active && _jsx(Check, { className: "w-3 h-3 text-white" }) }), _jsx("span", { className: "truncate", children: p })] }, p));
                            })] })] })] }));
}
