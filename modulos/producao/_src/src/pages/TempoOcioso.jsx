const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from "react";

import { Clock, AlertTriangle, Percent, Upload } from "lucide-react";
import { MESES } from "@/lib/format";
import ImportTempoOciosoDialog from "@/components/tempo-ocioso/ImportTempoOciosoDialog";
import TempoOciosoGraficoDialog from "@/components/tempo-ocioso/TempoOciosoGraficoDialog";

const ORDEM_MAQUINAS = ["JR", "Gravadora", "Estampa 1", "Estampa 2", "GR 2", "GR 3", "Digital Solvente", "Digital UV"];
const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").trim();
const ORDEM_NORM = ORDEM_MAQUINAS.map(normalize);

const HERO_IMG = "./assets/producao-bg.svg";

function fmtMin(v) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
}
function fmtPct(v) {
  return `${(v || 0).toFixed(2).replace(".", ",")}%`;
}

export default function TempoOcioso() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [graficoOpen, setGraficoOpen] = useState(false);
  const now = new Date();
  const [selectedMes, setSelectedMes] = useState(now.getMonth() + 1);

  const load = async () => {
    try {
      setLoading(true);
      const data = await db.entities.TempoOcioso.list("-data", 5000);
      setRecords(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => records.filter((r) => {
      if (!r.data) return false;
      const m = parseInt(String(r.data).split("-")[1], 10);
      return m === selectedMes;
    }),
    [records, selectedMes]
  );

  const machineData = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      const key = r.maquina;
      if (!map[key]) map[key] = { tempo_ocioso: 0, tempo_disponivel: 0 };
      map[key].tempo_ocioso += r.tempo_ocioso || 0;
      map[key].tempo_disponivel += r.tempo_disponivel || 0;
    });
    const result = Object.entries(map).map(([maquina, v]) => {
      const disponivel = v.tempo_disponivel;
      const ocioso = v.tempo_ocioso;
      const pct = disponivel > 0 ? (ocioso / disponivel) * 100 : 0;
      return { maquina, disponivel, ocioso, pct };
    });
    result.sort((a, b) => {
      const ia = ORDEM_NORM.indexOf(normalize(a.maquina));
      const ib = ORDEM_NORM.indexOf(normalize(b.maquina));
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return result;
  }, [filtered]);

  const totais = useMemo(() => {
    const disponivel = machineData.reduce((s, m) => s + m.disponivel, 0);
    const ocioso = machineData.reduce((s, m) => s + m.ocioso, 0);
    const pct = disponivel > 0 ? (ocioso / disponivel) * 100 : 0;
    return { disponivel, ocioso, pct };
  }, [machineData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#00798c] rounded-full animate-spin" />
      </div>
    );
  }

  const KPIS = [
    { label: "Tempo Total Disponível", value: fmtMin(totais.disponivel), unit: "min", icon: Clock },
    { label: "Tempo Total Ocioso", value: fmtMin(totais.ocioso), unit: "min", icon: AlertTriangle },
    { label: "% Tempo Ocioso", value: fmtPct(totais.pct), unit: "", icon: Percent },
  ];

  return (
    <div className="to-aurora">
      <div className="to-orb" />

      {/* Hero */}
      <section className="to-hero">
        <img src={HERO_IMG} alt="" className="to-hero-img" />
        <div className="to-hero-content">
          <h1>ANÁLISE DE TEMPO OCIOSO (MINUTOS)</h1>
          <div className="to-toolbar">
            <div />
            <div className="to-toolbar-right">
              <button className="to-btn" onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4" /> Importar
              </button>
              <button className="to-btn" onClick={() => setGraficoOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8"/><rect x="12" y="6" width="3" height="12"/><rect x="17" y="13" width="3" height="5"/></svg>
                Gráfico
              </button>
              <label className="to-month">
                Mês:
                <select
                  value={selectedMes}
                  onChange={(e) => setSelectedMes(Number(e.target.value))}
                  className="to-select"
                >
                  {MESES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="to-kpis">
        {KPIS.map((k, i) => (
          <article key={i} className="to-kpi">
            <div className="to-kpi-top">
              <div />
              <div className="to-kpi-icon">
                <k.icon />
              </div>
            </div>
            <p className="to-kpi-label">{k.label}</p>
            <p className="to-kpi-value">
              {k.value}
              {k.unit && <span className="to-unit">{k.unit}</span>}
            </p>
          </article>
        ))}
      </div>

      {/* Tabela */}
      <section className="to-data-card">
        <div className="to-data-head">
          <h2>Detalhamento por Máquina — {MESES[selectedMes - 1]?.label}</h2>
          <span>Tempo Ocioso</span>
        </div>
        <div className="to-table-wrap">
          <table className="to-table">
            <thead>
              <tr>
                <th>Máquinas</th>
                <th>Tempo Disponível</th>
                <th>Tempo Ocioso</th>
                <th>% Tempo Ocioso</th>
              </tr>
            </thead>
            <tbody>
              {machineData.map((m) => (
                <tr key={m.maquina}>
                  <td>{m.maquina}</td>
                  <td className="to-available">{fmtMin(m.disponivel)} min</td>
                  <td className="to-idle">{fmtMin(m.ocioso)} min</td>
                  <td className="to-percent">{fmtPct(m.pct)}</td>
                </tr>
              ))}
              {machineData.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#54767c", padding: "24px 16px" }}>
                    Nenhum dado encontrado para {MESES[selectedMes - 1]?.label}.
                  </td>
                </tr>
              )}
            </tbody>
            {machineData.length > 0 && (
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="to-available">{fmtMin(totais.disponivel)} min</td>
                  <td className="to-idle">{fmtMin(totais.ocioso)} min</td>
                  <td className="to-percent">{fmtPct(totais.pct)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <ImportTempoOciosoDialog open={importOpen} onOpenChange={setImportOpen} onImported={load} />
      <TempoOciosoGraficoDialog open={graficoOpen} onOpenChange={setGraficoOpen} />
    </div>
  );
}