import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
export default function ImportInsumosDialog({ open, onOpenChange, onParsed }) {
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
            const res = await db.functions.invoke("importInsumosExcel", { file_url });
            const data = res.data;
            if (data?.error)
                throw new Error(data.error);
            setResult(data);
            if (onParsed && data.records)
                onParsed(data.records);
        }
        catch (e) {
            setError(e.message || "Erro ao importar arquivo");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: handleClose, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(FileSpreadsheet, { className: "w-5 h-5 text-emerald-600" }), "Importar Insumos Qu\u00EDmicos"] }), _jsx(DialogDescription, { children: "Selecione o arquivo Excel com os dados de insumos qu\u00EDmicos. O sistema l\u00EA a aba \"Insumos\" com as colunas: M\u00EAs, Valor Previsto, Valor Realizado, KG Previsto, KG Realizado e Sobra." })] }), _jsxs("div", { className: "space-y-4 py-2", children: [_jsxs("label", { className: "flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-8 px-4 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors", children: [_jsx(UploadCloud, { className: "w-8 h-8 text-slate-400" }), _jsx("span", { className: "text-sm font-medium", children: file ? file.name : "Clique para selecionar o arquivo Excel" }), _jsx("span", { className: "text-[11px] text-muted-foreground", children: "Formatos: .xlsx, .xls, .csv" }), _jsx("input", { type: "file", accept: ".xlsx,.xls,.csv", className: "hidden", onChange: (e) => setFile(e.target.files?.[0] || null) })] }), error && (_jsxs("div", { className: "flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700", children: [_jsx(AlertCircle, { className: "w-4 h-4 mt-0.5 shrink-0" }), _jsx("span", { children: error })] })), result && result.imported > 0 && (_jsxs("div", { className: "flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700", children: [_jsx(CheckCircle2, { className: "w-4 h-4 mt-0.5 shrink-0" }), _jsxs("span", { children: [_jsx("strong", { children: result.imported }), " registro(s) importado(s) e salvos no banco."] })] })), result && result.imported === 0 && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700", children: [_jsx(AlertCircle, { className: "w-4 h-4 mt-0.5 shrink-0" }), _jsxs("span", { children: ["Nenhum registro v\u00E1lido encontrado. Verifique se a data est\u00E1 na ", _jsx("strong", { children: "coluna B" }), " e a OP na ", _jsx("strong", { children: "coluna A" }), "."] })] }), result.debugSample && (_jsxs("div", { className: "space-y-2", children: [result.headers && (_jsxs("div", { className: "rounded-lg bg-blue-50 border border-blue-200 p-2 text-[10px] text-blue-700", children: [_jsxs("div", { className: "font-semibold mb-1", children: ["Cabe\u00E7alho detectado (linha ", result.headerIdx + 1, "):"] }), _jsx("pre", { className: "whitespace-pre-wrap", children: JSON.stringify(result.headers) }), _jsxs("div", { className: "mt-1", children: ["Colunas: OP=", result.detectedCols.colOp, ", Data=", result.detectedCols.colData] })] })), _jsxs("div", { className: "rounded-lg bg-slate-50 border border-slate-200 p-2 text-[10px] text-slate-600 max-h-40 overflow-auto", children: [_jsx("div", { className: "font-semibold mb-1", children: "Amostra (primeiras 20 linhas):" }), _jsx("pre", { className: "whitespace-pre-wrap", children: JSON.stringify(result.debugSample, null, 1) })] })] }))] }))] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => handleClose(false), disabled: loading, children: result ? "Fechar" : "Cancelar" }), !result && (_jsx(Button, { onClick: handleImport, disabled: !file || loading, className: "gap-2", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), " Importando..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileSpreadsheet, { className: "w-4 h-4" }), " Importar"] })) }))] })] }) }));
}
