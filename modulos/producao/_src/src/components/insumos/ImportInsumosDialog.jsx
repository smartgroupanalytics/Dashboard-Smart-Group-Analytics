const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

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
    if (!v) setTimeout(reset, 200);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      const res = await db.functions.invoke("importInsumosExcel", { file_url });
      const data = res.data;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      if (onParsed && data.records) onParsed(data.records);
    } catch (e) {
      setError(e.message || "Erro ao importar arquivo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Importar Insumos Químicos
          </DialogTitle>
          <DialogDescription>
            Selecione o arquivo Excel com os dados de insumos químicos. O sistema lê a aba "Insumos" com as colunas: Mês, Valor Previsto, Valor Realizado, KG Previsto, KG Realizado e Sobra.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <label
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-8 px-4 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors"
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
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && result.imported > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                 <strong>{result.imported}</strong> registro(s) importado(s) e salvos no banco.
               </span>
            </div>
          )}

          {result && result.imported === 0 && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Nenhum registro válido encontrado. Verifique se a data está na <strong>coluna B</strong> e a OP na <strong>coluna A</strong>.
                </span>
              </div>
              {result.debugSample && (
                <div className="space-y-2">
                  {result.headers && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-[10px] text-blue-700">
                      <div className="font-semibold mb-1">Cabeçalho detectado (linha {result.headerIdx + 1}):</div>
                      <pre className="whitespace-pre-wrap">{JSON.stringify(result.headers)}</pre>
                      <div className="mt-1">Colunas: OP={result.detectedCols.colOp}, Data={result.detectedCols.colData}</div>
                    </div>
                  )}
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-[10px] text-slate-600 max-h-40 overflow-auto">
                    <div className="font-semibold mb-1">Amostra (primeiras 20 linhas):</div>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(result.debugSample, null, 1)}</pre>
                  </div>
                </div>
              )}
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