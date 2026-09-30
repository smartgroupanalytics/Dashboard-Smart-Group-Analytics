import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
export default function ImportCargaGeralDialog({ open, onOpenChange, onLoaded }) {
    const { toast } = useToast();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [paramRange, setParamRange] = useState("2-7");
    const [cargaHeader, setCargaHeader] = useState("9");
    const [cargaRange, setCargaRange] = useState("10-13");
    const parseRange = (str) => {
        const parts = String(str).split("-").map((s) => parseInt(s.trim(), 10));
        return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) ? parts : null;
    };
    const parseNum = (str) => {
        const n = parseInt(String(str).trim(), 10);
        return isNaN(n) ? null : n;
    };
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
            const pr = parseRange(paramRange);
            const cr = parseRange(cargaRange);
            const ch = parseNum(cargaHeader);
            const res = await db.functions.invoke("readCargaGeral", {
                file_url,
                ...(pr ? { param_start: pr[0], param_end: pr[1] } : {}),
                ...(ch ? { carga_header: ch } : {}),
                ...(cr ? { carga_start: cr[0], carga_end: cr[1] } : {}),
            });
            if (res?.error) {
                setError(res.error);
                setResult(null);
                return;
            }
            const data = res?.data || res;
            const numMaq = data?.maquinas?.colunas?.length || 0;
            const numPar = data?.parametros?.length || 0;
            if (numMaq === 0 && numPar === 0) {
                setError("Nenhum dado encontrado. Verifique o layout da planilha e os intervalos informados.");
                setResult(null);
                return;
            }
            setResult(data);
            toast({ title: "Planilha lida", description: `${numMaq} máquina(s) e ${numPar} parâmetro(s) encontrados.` });
            onLoaded?.(data);
            onOpenChange(false);
        }
        catch (e) {
            console.error("Erro ao importar:", e);
            let msg = e?.message || e?.error || (typeof e === "string" ? e : "Erro ao carregar");
            // Tenta extrair o erro de uma string JSON
            try {
                if (typeof msg === "string" && msg.includes('"error"')) {
                    const parsed = JSON.parse(msg);
                    msg = parsed.error || msg;
                }
            }
            catch (_) { }
            setError(msg);
        }
        finally {
            setUploading(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-md", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(UploadCloud, { className: "w-5 h-5 text-slate-700" }), "Importar An\u00E1lise Geral"] }), _jsx(DialogDescription, { children: "Selecione a planilha. A primeira aba ser\u00E1 lida automaticamente (par\u00E2metros nas linhas 2\u20137 colunas A/B e carga de m\u00E1quina nas linhas 10\u201313 colunas A\u2013E)." })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("label", { className: "flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-8 px-4 cursor-pointer hover:bg-slate-50 transition-colors", children: [_jsx(FileSpreadsheet, { className: "w-8 h-8 text-slate-400" }), _jsx("span", { className: "text-sm text-slate-600 font-medium", children: file ? file.name : "Clique para selecionar um arquivo .xlsx" }), _jsx("input", { type: "file", accept: ".xlsx,.xls", className: "hidden", onChange: (e) => setFile(e.target.files?.[0] || null) })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs font-semibold text-slate-700", children: "Par\u00E2metros Gerais (linhas)" }), _jsx("input", { type: "text", value: paramRange, onChange: (e) => setParamRange(e.target.value), placeholder: "5-11", className: "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs font-semibold text-slate-700", children: "Carga \u2014 Cabe\u00E7alho (linha)" }), _jsx("input", { type: "text", value: cargaHeader, onChange: (e) => setCargaHeader(e.target.value), placeholder: "13", className: "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs font-semibold text-slate-700", children: "Carga \u2014 Dados (linhas)" }), _jsx("input", { type: "text", value: cargaRange, onChange: (e) => setCargaRange(e.target.value), placeholder: "14-17", className: "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" })] })] })] }), error && (_jsxs("div", { className: "flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700", children: [_jsx(AlertCircle, { className: "w-4 h-4 mt-0.5 shrink-0" }), _jsx("span", { children: error })] })), result && (_jsxs("div", { className: "flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700", children: [_jsx(CheckCircle2, { className: "w-4 h-4 mt-0.5 shrink-0" }), _jsx("span", { children: "Dados carregados com sucesso." })] })), result?.debug?.debugRows && (result?.maquinas?.colunas?.length || 0) === 0 && (result?.parametros?.length || 0) === 0 && (_jsxs("div", { className: "rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600 max-h-48 overflow-auto", children: [_jsxs("p", { className: "font-bold mb-1 text-slate-800", children: ["Debug \u2014 linhas lidas da aba \"", result.debug.sheetName, "\":"] }), _jsxs("p", { className: "mb-1 text-slate-500", children: ["Cabe\u00E7alho encontrado na linha: ", result.debug.headerIdx >= 0 ? result.debug.headerIdx + 1 : "não encontrado"] }), result.debug.debugRows.map((r) => (_jsxs("div", { className: "flex gap-1 py-0.5 border-b border-slate-100", children: [_jsx("span", { className: "text-slate-400 w-6 shrink-0", children: r.idx + 1 }), r.empty ? (_jsx("span", { className: "text-slate-300 italic", children: "vazia" })) : (_jsx("span", { className: "flex flex-wrap gap-1", children: r.cells.map((c, ci) => (_jsx("span", { className: "px-1 rounded bg-slate-200 text-slate-700", children: c === '' ? '·' : String(c) }, ci))) }))] }, r.idx)))] }))] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: uploading, children: "Cancelar" }), _jsxs(Button, { onClick: handleImport, disabled: !file || uploading, className: "gap-2", children: [uploading ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsx(UploadCloud, { className: "w-4 h-4" }), uploading ? "Carregando..." : "Carregar"] })] })] }) }));
}
