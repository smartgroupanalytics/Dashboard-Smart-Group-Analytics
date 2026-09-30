const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { UploadCloud, Printer, Cpu, ClipboardList } from "lucide-react";
import CargaKpiStrip from "@/components/carga/CargaKpiStrip";
import MaquinaGaugeCard from "@/components/carga/MaquinaGaugeCard";
import ImportCargaGeralDialog from "@/components/carga/ImportCargaGeralDialog";

function normalize(s) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

export default function ControlePedidos() {
  const [importOpen, setImportOpen] = useState(false);
  const [parametros, setParametros] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [kpis, maqs] = await Promise.all([
        db.entities.CargaGeralKpi.filter({ tipo: "parametro" }, "ordem"),
        db.entities.CargaMaquina.list(),
      ]);
      setParametros(kpis);
      setMaquinas(maqs.filter((m) => {
        const n = normalize(m.maquina);
        return n === "jr" || n === "gravadora" || n === "gr2" || n === "estampa1" || n === "estampa2" || n === "estampa 1" || n === "estampa 2";
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLoaded = async (res) => {
    await db.entities.CargaGeralKpi.deleteMany({ tipo: "parametro" });
    if (res.parametros?.length) {
      await db.entities.CargaGeralKpi.bulkCreate(
        res.parametros.map((p, i) => ({
          parametro: p.parametro,
          valor: p.valor,
          ordem: i,
          tipo: "parametro",
        }))
      );
    }
    await db.entities.CargaMaquina.deleteMany({});
    if (res.maquinas?.colunas?.length) {
      const { colunas, linhas } = res.maquinas;
      const findVal = (paramName, mi) => {
        const linha = linhas.find((l) => normalize(l.parametro).includes(normalize(paramName)));
        return linha ? (linha.valores[mi] || 0) : 0;
      };
      const records = colunas
        .map((maquina, mi) => ({
          maquina,
          rotatividade: findVal("rotativ", mi),
          tempo_setup: findVal("setup", mi),
          tempo_producao: findVal("produt", mi),
          dias_necessarios: findVal("dia", mi),
        }))
        .filter((r) => {
          const n = normalize(r.maquina);
          return n === "jr" || n === "gravadora" || n === "gr2" || n === "estampa1" || n === "estampa2" || n === "estampa 1" || n === "estampa 2";
        });
      await db.entities.CargaMaquina.bulkCreate(records);
    }
    await loadData();
  };

  const handlePrint = () => {
    document.body.classList.add("printing-carga");
    const style = document.createElement("style");
    style.id = "print-landscape-carga";
    style.media = "print";
    style.textContent = "@page { size: A4 landscape; margin: 6mm; }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-carga");
      document.getElementById("print-landscape-carga")?.remove();
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] carga-print-root">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-50 text-[#008B8B] ring-1 ring-teal-100">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Carga de Máquina</h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Dashboard de Capacidade Industrial</p>
            </div>
          </div>
          <div className="flex items-center gap-2 print-hide">
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <UploadCloud className="w-4 h-4" />
              Importar
            </Button>
            <Button
              onClick={handlePrint}
              className="gap-2 bg-[#008B8B] hover:bg-[#006d6d] text-white"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Parâmetros Gerais */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-teal-700" />
            <h2 className="text-xs font-extrabold text-teal-900 uppercase tracking-wider">Parâmetros Gerais</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-teal-500/40 to-transparent" />
          </div>
          <CargaKpiStrip parametros={parametros} />
        </div>

        {/* Carga por Máquina */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-teal-700" />
            <h2 className="text-xs font-extrabold text-teal-900 uppercase tracking-wider">Carga por Máquina</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-teal-500/40 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {maquinas.map((m, i) => (
              <MaquinaGaugeCard
                key={m.id || m.maquina}
                maquina={m.maquina}
                rotatividade={m.rotatividade || 0}
                setup={m.tempo_setup || 0}
                produtivo={m.tempo_producao || 0}
                dias={m.dias_necessarios || 0}
                index={i}
              />
            ))}
          </div>
        </div>

      </div>

      <ImportCargaGeralDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onLoaded={handleLoaded}
      />
    </div>
  );
}