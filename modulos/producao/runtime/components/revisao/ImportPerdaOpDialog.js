import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
export default function ImportPerdaOpDialog({ open, onOpenChange, onImported }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const reset = () => {
        setFile(null);
        setLoading(false);
        setResult(null);
        setError(null);
    };
    const handleClose = (v) => {
        onOpenChange(v);
        if (!v)
            setTimeout(reset, 200);
    };
    const handleImport = async () => {
        if (!file)
            return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const { file_url } = await db.integrations.Core.UploadFile({ file });
            const res = await db.functions.invoke("importPerdaOpExcel", { file_url });
            const data = res.data;
            if (data?.error)
                throw new Error(data.error);
            setResult(data);
            if (onImported)
                onImported(data);
        }
        catch (e) {
            setError(e.message || "Erro ao importar arquivo");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: handleClose, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(FileSpreadsheet, { className: "w-5 h-5 text-emerald-600" }), "Importar Perda por OP (Mensal)"] }), _jsxs(DialogDescription, { children: ["Selecione a planilha. O sistema l\u00EA a aba ", _jsx("strong", { children: "DADOS" }), ": 2025 (linhas 2-13) e 2026 (linhas 14-25). Perda por OP = coluna G \u00F7 coluna J, por m\u00EAs (coluna C)."] })] }), _jsxs("div", { className: "space-y-4 py-2", children: [_jsxs("label", { className: "flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-8 px-4 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors", children: [_jsx(UploadCloud, { className: "w-8 h-8 text-slate-400" }), _jsx("span", { className: "text-sm font-medium", children: file ? file.name : "Clique para selecionar o arquivo Excel" }), _jsx("span", { className: "text-[11px] text-muted-foreground", children: "Formatos: .xlsx, .xls, .csv" }), _jsx("input", { type: "file", accept: ".xlsx,.xls,.csv", className: "hidden", onChange: (e) => setFile(e.target.files?.[0] || null) })] }), error && (_jsxs("div", { className: "flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700", children: [_jsx(AlertCircle, { className: "w-4 h-4 mt-0.5 shrink-0" }), _jsx("span", { children: error })] })), result && (_jsxs("div", { className: "flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700", children: [_jsx(CheckCircle2, { className: "w-4 h-4 mt-0.5 shrink-0" }), _jsxs("span", { children: ["Importa\u00E7\u00E3o conclu\u00EDda! ", _jsx("strong", { children: result.imported }), " meses importados (2025 e 2026)."] })] }))] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => handleClose(false), disabled: loading, children: result ? "Fechar" : "Cancelar" }), !result && (_jsx(Button, { onClick: handleImport, disabled: !file || loading, className: "gap-2", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), " Importando..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileSpreadsheet, { className: "w-4 h-4" }), " Importar"] })) }))] })] }) }));
}
