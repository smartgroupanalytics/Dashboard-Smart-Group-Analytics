const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function ImportFaturamentoDialog({ open, onOpenChange, onImported }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const reset = () => {
    setFile(null);
    setLoading(false);
    setResult(null);
    setError(null);
    setDebugInfo(null);
  };

  const handleClose = (v) => {
    onOpenChange(v);
    if (!v) setTimeout(reset, 200);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setDebugInfo(null);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      const res = await db.functions.invoke("importFaturamentoExcel", { file_url });
      const data = res.data || res;
      if (data?.error) {
        setError(data.error);
        if (data.debugSample) setDebugInfo({ sample: data.debugSample, totalRows: data.totalRows, sheetName: data.sheetName });
        return;
      }
      setResult(data);
      if (onImported) onImported();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.data?.error || e?.message || "Erro ao importar arquivo";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Importar Faturamento (Excel)
          </DialogTitle>
          <DialogDescription>
            Selecione o arquivo Excel com os dados mensais de faturamento. O sistema identifica automaticamente as colunas por cabeçalho (Mês, Faturamento Smart Group, Metros Smart Group, Faturamento STK, Metros STK, Faturamento Previsto 2026, Faturamento 2025, Metros 2025, Preço Médio Orçado, Preço Médio Realizado). Registros dos meses importados serão substituídos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <label
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-8 px-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
          >
            <UploadCloud className="w-8 h-8 text-slate-400" />
            <span className="text-sm font-medium">
              {file ? file.name : "Clique para selecionar o arquivo Excel"}
            </span>
            <span className="text-[11px] text-muted-foreground">Formatos: .xlsx, .xls, .csv</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          {error && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
              {debugInfo && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 overflow-x-auto">
                  <p className="font-bold mb-1">Debug — aba: {debugInfo.sheetName} | {debugInfo.totalRows} linhas</p>
                  <p className="font-semibold mb-1">Primeiras 5 linhas (colunas A–L):</p>
                  <pre className="whitespace-pre-wrap break-all text-[10px]">{JSON.stringify(debugInfo.sample, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Importação concluída! <strong>{result.imported}</strong> registro(s) adicionado(s) ao Faturamento.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            {result ? "Fechar" : "Cancelar"}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={!file || loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Importando...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" /> Importar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}