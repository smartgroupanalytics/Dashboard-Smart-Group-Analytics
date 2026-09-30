import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
export default function DetalheRevisaoDialog({ open, onOpenChange, datas }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!open)
            return;
        let active = true;
        (async () => {
            setLoading(true);
            try {
                const all = await db.entities.DetalheRevisaoOP.list("data");
                const filtered = datas.length > 0 ? all.filter((r) => r.data && datas.includes(r.data)) : all;
                if (active)
                    setRows(filtered);
            }
            finally {
                if (active)
                    setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [open, datas.join(",")]);
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[80vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "OPs Revisadas no Dia" }) }), loading ? (_jsx("div", { className: "flex items-center justify-center py-10", children: _jsx("div", { className: "w-6 h-6 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" }) })) : rows.length === 0 ? (_jsx("p", { className: "text-sm text-muted-foreground py-6 text-center", children: "Nenhum detalhe de OP encontrado para o per\u00EDodo selecionado." })) : (_jsx("div", { className: "rounded-lg border border-border overflow-hidden", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "OP" }), _jsx(TableHead, { children: "Descri\u00E7\u00E3o" }), _jsx(TableHead, { className: "text-right", children: "Qtd Revisada" }), _jsx(TableHead, { className: "text-right", children: "Qtd Refugo" })] }) }), _jsx(TableBody, { children: rows.map((r) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium whitespace-nowrap", children: r.op }), _jsx(TableCell, { className: "text-muted-foreground", children: r.descricao || "—" }), _jsx(TableCell, { className: "text-right tabular-nums", children: (r.qtd_revisada ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }), _jsx(TableCell, { className: "text-right tabular-nums text-rose-600", children: (r.qtd_refugo ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })] }, r.id))) })] }) }))] }) }));
}
