import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function RecorrenciaSearch({ value, onChange }) {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (!open)
            return;
        const handler = (e) => {
            const el = e.target.closest("[data-recorrencia-search]");
            if (!el)
                setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);
    return (_jsxs("div", { className: "relative", "data-recorrencia-search": true, children: [_jsxs(Button, { variant: "outline", size: "sm", className: "gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100", onClick: () => setOpen((s) => !s), children: [_jsx(Search, { className: "w-4 h-4" }), " Buscar"] }), open && (_jsxs("div", { className: "absolute right-0 mt-2 w-72 rounded-lg bg-white border border-slate-300 shadow-xl z-30 p-3", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" }), _jsx(Input, { autoFocus: true, value: value, onChange: (e) => onChange(e.target.value), placeholder: "Digite o c\u00F3digo do produto...", className: "pl-9 pr-8 h-9 text-sm" }), value && (_jsx("button", { onClick: () => onChange(""), className: "absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600", children: _jsx(X, { className: "w-4 h-4" }) }))] }), _jsx("p", { className: "text-xs text-slate-500 mt-2 px-1", children: "Filtra ranking e tabela por c\u00F3digo ou descri\u00E7\u00E3o." })] }))] }));
}
