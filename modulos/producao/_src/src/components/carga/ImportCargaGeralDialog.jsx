const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

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
    if (!file) return;
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
    } catch (e) {
      console.error("Erro ao importar:", e);
      let msg = e?.message || e?.error || (typeof e === "string" ? e : "Erro ao carregar");
      // Tenta extrair o erro de uma string JSON
      try {
        if (typeof msg === "string" && msg.includes('"error"')) {
          const parsed = JSON.parse(msg);
          msg = parsed.error || msg;
        }
      } catch (_) {}
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-slate-700" />
            Importar Análise Geral
          </DialogTitle>
          <DialogDescription>
            Selecione a planilha. A primeira aba será lida automaticamente (parâmetros nas linhas 2–7 colunas A/B e carga de máquina nas linhas 10–13 colunas A–E).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-8 px-4 cursor-pointer hover:bg-slate-50 transition-colors">
            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
            <span className="text-sm text-slate-600 font-medium">
              {file ? file.name : "Clique para selecionar um arquivo .xlsx"}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Parâmetros Gerais (linhas)</label>
              <input
                type="text"
                value={paramRange}
                onChange={(e) => setParamRange(e.target.value)}
                placeholder="5-11"
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Carga — Cabeçalho (linha)</label>
                <input
                  type="text"
                  value={cargaHeader}
                  onChange={(e) => setCargaHeader(e.target.value)}
                  placeholder="13"
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Carga — Dados (linhas)</label>
                <input
                  type="text"
                  value={cargaRange}
                  onChange={(e) => setCargaRange(e.target.value)}
                  placeholder="14-17"
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Dados carregados com sucesso.</span>
            </div>
          )}

          {result?.debug?.debugRows && (result?.maquinas?.colunas?.length || 0) === 0 && (result?.parametros?.length || 0) === 0 && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600 max-h-48 overflow-auto">
              <p className="font-bold mb-1 text-slate-800">Debug — linhas lidas da aba "{result.debug.sheetName}":</p>
              <p className="mb-1 text-slate-500">Cabeçalho encontrado na linha: {result.debug.headerIdx >= 0 ? result.debug.headerIdx + 1 : "não encontrado"}</p>
              {result.debug.debugRows.map((r) => (
                <div key={r.idx} className="flex gap-1 py-0.5 border-b border-slate-100">
                  <span className="text-slate-400 w-6 shrink-0">{r.idx + 1}</span>
                  {r.empty ? (
                    <span className="text-slate-300 italic">vazia</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {r.cells.map((c, ci) => (
                        <span key={ci} className="px-1 rounded bg-slate-200 text-slate-700">{c === '' ? '·' : String(c)}</span>
                      ))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!file || uploading} className="gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {uploading ? "Carregando..." : "Carregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}