const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Factory, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

import GastosMonthFilter from "@/components/gastos/GastosMonthFilter";
import GastosCategoryCard from "@/components/gastos/GastosCategoryCard";
import GastosTotalBar from "@/components/gastos/GastosTotalBar";

import ImportGastosDialog from "@/components/gastos/ImportGastosDialog";

const CATEGORIAS = [
  { key: "folha_industrial", titulo: "Folha Industrial", color: "#1e3a8a", accentClass: "bg-[#1e3a8a]" },
  { key: "manutencao", titulo: "Manutenção", color: "#0d9488", accentClass: "bg-[#0d9488]" },
  { key: "residuos_rejeitos", titulo: "Resíduos e Rejeitos", color: "#f59e0b", accentClass: "bg-[#f59e0b]" },
];

export default function GastosIndustriais() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState([1, 2, 3, 4, 5, 6, 7, 8]);
  const [importOpen, setImportOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await db.entities.GastosIndustriais.list("-mes", 100);
      setRegistros(data);
    } catch (e) {
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const dadosFiltrados = useMemo(() => {
    const filtrados = registros.filter((r) => selectedMonths.includes(r.mes));
    const result = {};
    for (const cat of CATEGORIAS) {
      const catRecords = filtrados.filter((r) => r.categoria === cat.key);
      result[cat.key] = {
        orcado: catRecords.reduce((s, r) => s + (r.orcado || 0), 0),
        valor_2025: catRecords.reduce((s, r) => s + (r.valor_2025 || 0), 0),
        valor_2026: catRecords.reduce((s, r) => s + (r.valor_2026 || 0), 0),
      };
    }
    result.total = {
      orcado: Object.values(result).reduce((s, c) => s + c.orcado, 0),
      valor_2025: Object.values(result).reduce((s, c) => s + c.valor_2025, 0),
      valor_2026: Object.values(result).reduce((s, c) => s + c.valor_2026, 0),
    };
    return result;
  }, [registros, selectedMonths]);

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Subtle blue waves at bottom */}
      <svg className="absolute bottom-0 left-0 w-full pointer-events-none opacity-60" viewBox="0 0 1440 200" preserveAspectRatio="none" style={{ height: 180 }}>
        <path d="M0,100 C320,160 480,40 720,80 C960,120 1120,40 1440,80 L1440,200 L0,200 Z" fill="#dbeafe" opacity="0.5" />
        <path d="M0,140 C240,180 560,100 840,130 C1120,160 1280,100 1440,130 L1440,200 L0,200 Z" fill="#bfdbfe" opacity="0.3" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between gap-3 mb-3 flex-wrap"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#1e3a8a]/10 ring-1 ring-[#1e3a8a]/20">
              <Factory className="w-5 h-5 text-[#1e3a8a]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-tight">Gastos Industriais</h1>
              <p className="text-xs text-slate-700 font-semibold leading-tight">Análise de custos industriais</p>
            </div>
          </div>
          <Button
            onClick={() => setImportOpen(true)}
            className="gap-2 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 rounded-full"
          >
            <UploadCloud className="w-4 h-4" />
            Importar
          </Button>
        </motion.div>

        {/* Month filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="mb-3"
        >
          <p className="text-[11px] uppercase tracking-wider text-slate-600 font-bold mb-1.5">Filtro de meses</p>
          <GastosMonthFilter selected={selectedMonths} onChange={setSelectedMonths} />
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a8a] rounded-full animate-spin" />
          </div>
        ) : registros.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Factory className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nenhum dado importado ainda</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "Importar" para carregar a planilha</p>
          </div>
        ) : (
          <>
            {/* Category cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
              {CATEGORIAS.map((cat, i) => (
                <GastosCategoryCard
                  key={cat.key}
                  categoria={cat.key}
                  titulo={cat.titulo}
                  color={cat.color}
                  accentClass={cat.accentClass}
                  index={i}
                  dados={dadosFiltrados[cat.key]}
                />
              ))}
            </div>

            {/* Total bar */}
            <div className="mb-3">
              <GastosTotalBar dados={dadosFiltrados.total} />
            </div>

          </>
        )}
      </div>

      <ImportGastosDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={loadData}
      />
    </div>
  );
}