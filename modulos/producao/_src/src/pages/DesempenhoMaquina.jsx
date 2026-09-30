const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo, useRef } from "react";

import { Cog, FileSpreadsheet, Timer, Printer } from "lucide-react";
import DesempenhoTable from "@/components/desempenho/DesempenhoTable";
import DesempenhoPorMaquina from "@/components/desempenho/DesempenhoPorMaquina";
import DayFilter from "@/components/desempenho/DayFilter";
import ImportDesempenhoDialog from "@/components/desempenho/ImportDesempenhoDialog";
import ImportSetupDialog from "@/components/desempenho/ImportSetupDialog";
import "@/components/desempenho/desempenho-glass.css";

const MACHINES = ["JR", "Gravadora", "Estampa 1", "Estampa 2", "Digital Solvente", "Digital UV", "GR2"];

function pad(n) {
  return String(n).padStart(2, "0");
}
function todayIso() {
  const t = new Date();
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

export default function DesempenhoMaquina() {
  const [records, setRecords] = useState([]);
  const [selectedDays, setSelectedDays] = useState([todayIso()]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [defaultApplied, setDefaultApplied] = useState(false);
  const ensuringRef = useRef(false);

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await db.entities.DesempenhoMaquina.list();
      setRecords(data);
      // Na primeira carga, seleciona o dia mais recente que tenha produção importada
      if (!defaultApplied) {
        const comDados = data
          .filter((r) => r.tempo_produzido && r.tempo_produzido > 0)
          .map((r) => r.data)
          .sort();
        if (comDados.length) {
          setSelectedDays([comDados[comDados.length - 1]]);
        }
        setDefaultApplied(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Cria registros faltantes (data + máquina) para os dias selecionados
  // Consulta o banco a cada chamada para evitar duplicatas por estado stale
  const ensureForDays = async (days) => {
    if (!days.length) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    try {
      const fresh = await db.entities.DesempenhoMaquina.filter({ data: { $in: days } });
      const existing = new Set(fresh.map((r) => `${r.data}|${r.maquina}`));
      const toCreate = [];
      days.forEach((d) => {
        MACHINES.forEach((m) => {
          if (!existing.has(`${d}|${m}`)) toCreate.push({ data: d, maquina: m });
        });
      });
      if (toCreate.length) {
        await db.entities.DesempenhoMaquina.bulkCreate(toCreate);
        await load(true);
      }
    } finally {
      ensuringRef.current = false;
    }
  };

  useEffect(() => {
    if (!loading && selectedDays.length) ensureForDays(selectedDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDays, loading]);

  const filtered = useMemo(
    () => records.filter((r) => selectedDays.includes(r.data)),
    [records, selectedDays]
  );

  const handlePrint = () => {
    const styleEl = document.createElement("style");
    styleEl.id = "desempenho-landscape-page";
    styleEl.textContent = "@page { size: A4 landscape; margin: 5mm; }";
    document.head.appendChild(styleEl);
    document.body.classList.add("printing-desempenho");
    const cleanup = () => {
      document.body.classList.remove("printing-desempenho");
      styleEl.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 1000);
  };

  if (loading) {
    return (
      <div className="dm-page flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-100 border-t-cyan-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="dm-page">
      <div className="dm-ambient" />
      <div className="dm-shell">
        <header className="dm-topbar">
          <div className="dm-heading">
            <div className="dm-gear">
              <Cog />
            </div>
            <div>
              <h1>Desempenho de Máquina</h1>
              <p>Tempo produzido, parado e produtividade por máquina</p>
            </div>
          </div>
          <div className="dm-actions">
            <button className="dm-btn primary" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet /> Importar Produção
            </button>
            <button className="dm-btn primary" onClick={() => setSetupOpen(true)}>
              <Timer /> Importar Setup
            </button>
            <button className="dm-btn print-hide" onClick={handlePrint}>
              <Printer /> Imprimir
            </button>
            <DayFilter selectedDays={selectedDays} onSelect={setSelectedDays} triggerClassName="dm-filter" />
          </div>
        </header>
        <div className="print-hide">
          <DesempenhoPorMaquina records={filtered} />
        </div>
        <div className="desempenho-print-root">
          <DesempenhoTable records={filtered} onSaved={load} />
        </div>

        <ImportDesempenhoDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onImported={async (data) => {
            await load();
            if (data?.datas?.length) {
              setSelectedDays((prev) => Array.from(new Set([...data.datas, ...prev])).sort());
            }
          }}
        />
        <ImportSetupDialog
          open={setupOpen}
          onOpenChange={setSetupOpen}
          onImported={async (data) => {
            await load();
            if (data?.datas?.length) {
              setSelectedDays((prev) => Array.from(new Set([...data.datas, ...prev])).sort());
            }
          }}
        />
      </div>
    </div>
  );
}