const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function ImportProgramacaoDialog({ open, onOpenChange, onImported }) {
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
      const res = await db.functions.invoke("importProgramacaoExcel", { file_url });
      const data = res.data;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      if (onImported) onImported();
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
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Importar Programação
          </DialogTitle>
          <DialogDescription>
            A planilha deve ter os nomes das máquinas na linha 1 e as OPs a partir da linha 2.
            Colunas: Gravadora (A), JR (G), Estampa 1 (M), Estampa 2 (S), GR (Y) — com Produto e Metragem ao lado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-8 px-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
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

          {result && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Importação concluída! <strong>{result.imported}</strong> OP(s) programada(s).
                {result.porMaquina && (
                  <span className="block mt-1 text-[10px]">
                    {Object.entries(result.porMaquina).map(([m, c]) => `${m}: ${c}`).join(" • ")}
                  </span>
                )}
                {result.datasEncontradas && result.datasEncontradas.length > 0 && (
                  <span className="block mt-1 text-[10px] text-blue-700">
                    Datas: {result.datasEncontradas.map(d => d.split("-").reverse().join("/")).join(", ")}
                  </span>
                )}
                {result.semData && result.semData.length > 0 && (
                  <span className="block mt-1 text-[10px] text-rose-700">
                    {result.semData.length} OP(s) sem data (ex: {result.semData[0].maquina} OP {result.semData[0].num_op} entrega={result.semData[0].entrega_raw || "vazio"})
                  </span>
                )}
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