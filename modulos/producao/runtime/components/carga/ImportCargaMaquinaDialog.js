import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
export default function ImportCargaMaquinaDialog({ open, onOpenChange, onImported }) {
    const { toast } = useToast();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!open) {
            setFile(null);
            setUploading(false);
            setResult(null);
            setError(null);
        }
    }, [open]);
    const handleImport = async () => {
        if (!file)
            return;
        setUploading(true);
        setError(null);
        setResult(null);
        try {
            const { file_url } = await db.integrations.Core.UploadFile({ file });
            const res = await db.functions.invoke("importCargaMaquinaExcel", { file_url });
            setResult(res);
            toast({ title: "Importação concluída", description: `${res.imported} máquina(s) importada(s).` });
            onImported?.();
        }
        catch (e) {
            setError(e.message || "Erro ao importar");
        }
        finally {
            setUploading(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-md", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(UploadCloud, { className: "w-5 h-5 text-slate-700" }), "Importar Carga de M\u00E1quina"] }), _jsx(DialogDescription, { children: "Selecione a planilha de programa\u00E7\u00E3o. As colunas ResourceName (m\u00E1quina), ProductionTime, Setup, DeliveryDate e Quantity ser\u00E3o lidas automaticamente." })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("label", { className: "flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-8 px-4 cursor-pointer hover:bg-slate-50 transition-colors", children: [_jsx(FileSpreadsheet, { className: "w-8 h-8 text-slate-400" }), _jsx("span", { className: "text-sm text-slate-600 font-medium", children: file ? file.name : "Clique para selecionar um arquivo .xlsx" }), _jsx("input", { type: "file", accept: ".xlsx,.xls", className: "hidden", onChange: (e) => setFile(e.target.files?.[0] || null) })] }), error && (_jsxs("div", { className: "flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700", children: [_jsx(AlertCircle, { className: "w-4 h-4 mt-0.5 shrink-0" }), _jsx("span", { children: error })] })), result && (_jsxs("div", { className: "flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700", children: [_jsx(CheckCircle2, { className: "w-4 h-4 mt-0.5 shrink-0" }), _jsxs("span", { children: [result.imported, " m\u00E1quina(s) importada(s) com sucesso."] })] }))] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: uploading, children: "Cancelar" }), _jsxs(Button, { onClick: handleImport, disabled: !file || uploading, className: "gap-2", children: [uploading ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsx(UploadCloud, { className: "w-4 h-4" }), uploading ? "Importando..." : "Importar"] })] })] }) }));
}
