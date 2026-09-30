const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

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
    if (!v) setTimeout(reset, 200);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      const res = await db.functions.invoke("importRecorrenciaExcel", { file_url, data });
      const resData = res.data;
      if (resData?.error) throw new Error(resData.error);
      setResult(resData);
      if (onImported) onImported(resData);
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
            <FileSpreadsheet className="w-5 h-5 text-[#00798C]" />
            Importar Recorrência de Pedidos
          </DialogTitle>
          <DialogDescription>
            Selecione a planilha com as colunas: Código do Produto, Descrição e Metragem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Data dos pedidos</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#00798C] focus:outline-none"
            />
          </div>

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-8 px-4 cursor-pointer hover:border-[#00798C] hover:bg-teal-50/30 transition-colors">
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
                Importação concluída! <strong>{result.imported}</strong> registro(s) importado(s) para {result.data}.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            {result ? "Fechar" : "Cancelar"}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={!file || loading} className="gap-2 bg-[#00798C] text-white hover:bg-[#006674]">
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