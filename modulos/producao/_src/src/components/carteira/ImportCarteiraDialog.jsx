const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ImportCarteiraDialog({ open, onOpenChange, onImported }) {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [semanaAtualRange, setSemanaAtualRange] = useState("362-500");
  const [faltaProgramarRange, setFaltaProgramarRange] = useState("503-518");

  const parseRange = (str) => {
    const parts = String(str).split("-").map((s) => parseInt(s.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts;
    return null;
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
      const res = await db.functions.invoke("importCarteiraExcel", {
        file_url,
        semana_atual_rows: parseRange(semanaAtualRange),
        falta_programar_rows: parseRange(faltaProgramarRange),
      });
      setResult(res);
      toast({ title: "Importação concluída", description: "Carteira de Pedidos importada." });
      onImported?.();
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.data?.error || e?.cause?.error || e.message || "Erro ao importar";
      setError(serverMsg);
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
            Importar Carteira de Pedidos
          </DialogTitle>
          <DialogDescription>
            Selecione a planilha. As linhas são classificadas pela cor de fundo: <span className="font-semibold text-emerald-700">verde</span> = Semana Atual, <span className="font-semibold text-amber-600">amarelo</span> = Falta Programar.
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-700">Semana Atual (linhas)</label>
              <input
                type="text"
                value={semanaAtualRange}
                onChange={(e) => setSemanaAtualRange(e.target.value)}
                placeholder="1-128"
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-amber-600">Falta Programar (linhas)</label>
              <input
                type="text"
                value={faltaProgramarRange}
                onChange={(e) => setFaltaProgramarRange(e.target.value)}
                placeholder="Vazio = demais linhas"
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
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
              <span>Carteira importada — Total: {result.carteira?.total_carteira?.toLocaleString("pt-BR") || 0} metros.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!file || uploading} className="gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {uploading ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}