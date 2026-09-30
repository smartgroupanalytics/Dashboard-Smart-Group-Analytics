import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
function pad(n) { return String(n).padStart(2, "0"); }
function todayIso() {
    const t = new Date();
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}
export default function ImportRecorrenciaDialog({ open, onOpenChange, onImported }) {
    const [file, setFile] = useState(null);
    const [data, setData] = useState(todayIso());
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const reset = () => {
        setFile(null);
        setData(todayIso());
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
            const res = await db.functions.invoke("importRecorrenciaExcel", { file_url, data });
            const resData = res.data;
            if (resData?.error)
                throw new Error(resData.error);
            setResult(resData);
            if (onImported)
                onImported(resData);
        }
        catch (e) {
            setError(e.message || "Erro ao importar arquivo");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: handleClose, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(FileSpreadsheet, { className: "w-5 h-5 text-[#00798C]" }), "Importar Recorr\u00EAncia de Pedidos"] }), _jsx(DialogDescription, { children: "Selecione a planilha com as colunas: C\u00F3digo do Produto, Descri\u00E7\u00E3o e Metragem." })] }), _jsxs("div", { className: "space-y-4 py-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-slate-700 mb-1.5 block", children: "Data dos pedidos" }), _jsx("input", { type: "date", value: data, onChange: (e) => setData(e.target.value), className: "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#00798C] focus:outline-none" })] }), _jsxs("label", { className: "flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-8 px-4 cursor-pointer hover:border-[#00798C] hover:bg-teal-50/30 transition-colors", children: [_jsx(UploadCloud, { className: "w-8 h-8 text-slate-400" }), _jsx("span", { className: "text-sm font-medium", children: file ? file.name : "Clique para selecionar o arquivo Excel" }), _jsx("span", { className: "text-[11px] text-muted-foreground", children: "Formatos: .xlsx, .xls, .csv" }), _jsx("input", { type: "file", accept: ".xlsx,.xls,.csv", className: "hidden", onChange: (e) => setFile(e.target.files?.[0] || null) })] }), error && (_jsxs("div", { className: "flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700", children: [_jsx(AlertCircle, { className: "w-4 h-4 mt-0.5 shrink-0" }), _jsx("span", { children: error })] })), result && (_jsxs("div", { className: "flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700", children: [_jsx(CheckCircle2, { className: "w-4 h-4 mt-0.5 shrink-0" }), _jsxs("span", { children: ["Importa\u00E7\u00E3o conclu\u00EDda! ", _jsx("strong", { children: result.imported }), " registro(s) importado(s) para ", result.data, "."] })] }))] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => handleClose(false), disabled: loading, children: result ? "Fechar" : "Cancelar" }), !result && (_jsx(Button, { onClick: handleImport, disabled: !file || loading, className: "gap-2 bg-[#00798C] text-white hover:bg-[#006674]", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), " Importando..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileSpreadsheet, { className: "w-4 h-4" }), " Importar"] })) }))] })] }) }));
}
