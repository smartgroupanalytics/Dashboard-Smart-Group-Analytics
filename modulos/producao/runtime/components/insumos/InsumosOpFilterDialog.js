import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, Eraser } from "lucide-react";
export default function InsumosOpFilterDialog({ open, onOpenChange, currentFilter, onApply }) {
    const [text, setText] = useState("");
    useEffect(() => {
        if (open)
            setText(currentFilter || "");
    }, [open, currentFilter]);
    const handleApply = () => {
        onApply(text);
        onOpenChange(false);
    };
    const handleClear = () => {
        setText("");
        onApply("");
        onOpenChange(false);
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-lg", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(Search, { className: "w-5 h-5 text-blue-600" }), "Filtrar OPs"] }) }), _jsxs("p", { className: "text-sm text-slate-500 -mt-1", children: ["Cole ou digite os n\u00FAmeros das OPs, ", _jsx("strong", { children: "um embaixo da outra" }), ":"] }), _jsx("textarea", { value: text, onChange: (e) => setText(e.target.value), placeholder: "Ex.:\n12345\n12346\n12347", rows: 10, autoFocus: true, className: "w-full rounded-lg border border-slate-300 p-3 text-sm font-mono resize-y focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20" }), _jsxs(DialogFooter, { className: "gap-2", children: [_jsxs(Button, { variant: "outline", onClick: handleClear, children: [_jsx(Eraser, { className: "w-4 h-4" }), " Limpar"] }), _jsxs(Button, { onClick: handleApply, children: [_jsx(Search, { className: "w-4 h-4" }), " Procurar"] })] })] }) }));
}
