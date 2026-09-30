const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from "react";

import { Printer, Timer, Clock, Gauge as GaugeIcon, TrendingUp, Search, X, BarChart3, List, Database } from "lucide-react";
import ControleTable from "@/components/controle/ControleTable";
import MachineCard from "@/components/controle/MachineCard";
import RelatorioMaquina from "@/components/controle/RelatorioMaquina";
import RelatorioProdutoMaquinas from "@/components/controle/RelatorioProdutoMaquinas";
import OpJourneyPanel from "@/components/controle/OpJourneyPanel";
import AnaliseEficienciaDashboard from "@/components/controle/AnaliseEficienciaDashboard";
import DayFilter from "@/components/desempenho/DayFilter";
import ProductFilter from "@/components/controle/ProductFilter";
import ImportExcelDialog from "@/components/controle/ImportExcelDialog";
import ImportSetupDialog from "@/components/controle/ImportSetupDialog";
import FamiliasCilindrosDialog from "@/components/controle/FamiliasCilindrosDialog";
import FamiliaEstampaDialog from "@/components/controle/FamiliaEstampaDialog";
import { tempoEsperadoHoras, tempoRealHoras } from "@/lib/controleSpeed";
import "@/components/controle/controle-vibrante.css";

const MACHINES = ["JR", "Gravadora", "Estampa 1", "Estampa 2", "GR2", "Digital UV", "Digital Solvente", "Tumbler"];


function fmtHoras(v) {
  if (!v && v !== 0) return "00:00";
  const abs = Math.abs(v);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function ControleEficiencia() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(MACHINES[0]);
  const [selectedDays, setSelectedDaysState] = useState(() => {
    try {
      const saved = localStorage.getItem("controle_eficiencia_selected_days");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const setSelectedDays = (days) => {
    setSelectedDaysState(days);
    try {
      localStorage.setItem("controle_eficiencia_selected_days", JSON.stringify(days));
    } catch {
      // ignore
    }
  };
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [opSearch, setOpSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [familiasOpen, setFamiliasOpen] = useState(false);
  const [familiasEstampaOpen, setFamiliasEstampaOpen] = useState(false);
  const [importMachine, setImportMachine] = useState(null);
  const [relatorioMaquina, setRelatorioMaquina] = useState(null);
  const [viewMode, setViewMode] = useState("maquinas"); // "maquinas" | "analise"

  const toggleRelatorio = (m) => {
    setRelatorioMaquina((prev) => (prev === m ? null : m));
  };

  const load = async () => {
    try {
      setLoading(true);
      const data = await db.entities.ControleEficiencia.list("-created_date", 5000);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  // Recarrega registros sem flash de loading — preserva filtros e relatório aberto
  const reload = async () => {
    const data = await db.entities.ControleEficiencia.list("-created_date", 5000);
    setRecords(data);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (selectedDays.length > 0) {
      setRelatorioMaquina(active);
    }
  }, [selectedDays]);

  const opActive = opSearch.trim() !== "";

  const filtered = useMemo(() => {
    return records.filter((r) => {
      // Busca por OP: ignora filtro de datas e produtos, varre todos os registros
      if (opActive) {
        if (!r.num_op || !String(r.num_op).toLowerCase().includes(opSearch.trim().toLowerCase())) return false;
        return true;
      }
      if (selectedDays.length > 0 && (!r.data || !selectedDays.includes(r.data))) return false;
      if (selectedProducts.length > 0 && (!r.descricao_produto || !selectedProducts.includes(r.descricao_produto))) return false;
      // Só aparece registro que foi efetivamente produzido (tempo ou metragem > 0)
      // ou que seja retrabalho. Setup/parada sem produção (ex.: OP 8000) fica oculto.
      // GR2: tempo de 1 minuto (00:01) não considera como produção
      const tempo = r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
      const isGR2Curto = r.maquina === "GR2" && tempo > 0 && Math.round(tempo * 60) <= 1;
      const temProducao = ((r.tempo || 0) > 0 || (r.metragem || 0) > 0) && !isGR2Curto;
      const isRetrabalho = !!r.is_retrabalho;
      if (!temProducao && !isRetrabalho) return false;
      return true;
    });
  }, [records, selectedDays, selectedProducts, opSearch, opActive]);

  const byMachine = useMemo(() => {
    const map = {};
    MACHINES.forEach((m) => (map[m] = []));
    filtered.forEach((r) => {
      if (map[r.maquina]) map[r.maquina].push(r);
    });
    return map;
  }, [filtered]);

  // Lista de produtos de TODAS as máquinas (filtrado por dias) — permite buscar
  // um produto independente da máquina ativa e ver por onde ele passou
  const productsForFilter = useMemo(() => {
    const dayRecords = records.filter((r) => {
      if (selectedDays.length > 0 && (!r.data || !selectedDays.includes(r.data))) return false;
      return true;
    });
    return [...new Set(dayRecords.map((r) => r.descricao_produto).filter(Boolean))];
  }, [records, selectedDays]);

  const temFiltro = selectedDays.length > 0 || selectedProducts.length > 0 || opSearch.trim() !== "";

  const totaisActive = useMemo(() => {
    const recs = byMachine[active] || [];
    const real = recs.reduce((s, r) => s + (r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final)), 0);
    const esperado = recs.reduce((s, r) => s + tempoEsperadoHoras(r.metragem, active, r.processo), 0);
    return { real, esperado, eficiencia: real > 0 ? (esperado / real) * 100 : 0 };
  }, [byMachine, active]);

  // Hero stats globais
  const heroStats = useMemo(() => {
    const machinesAtivas = MACHINES.filter((m) => (byMachine[m] || []).length > 0).length;
    let totalReal = 0;
    let totalEsperado = 0;
    MACHINES.forEach((m) => {
      const recs = byMachine[m] || [];
      recs.forEach((r) => {
        totalReal += r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
        totalEsperado += tempoEsperadoHoras(r.metragem, m, r.processo);
      });
    });
    const efMedia = totalReal > 0 ? (totalEsperado / totalReal) * 100 : 0;
    return { machinesAtivas, totalReal, efMedia };
  }, [byMachine]);

  const corEfGeral = totaisActive.eficiencia >= 95 ? "#10b981" : "#ef4444";

  const handlePrint = async () => {
    // Se houver um relatório aberto, imprime apenas ele em paisagem (paginação natural)
    const relatorio = document.querySelector(".relatorio-root");
    if (relatorio) {
      document.body.classList.add("printing-relatorio");
      const reset = () => {
        document.body.classList.remove("printing-relatorio");
        window.removeEventListener("afterprint", reset);
      };
      window.addEventListener("afterprint", reset);
      window.print();
      return;
    }
    const area = document.querySelector(".print-area");
    if (!area) { window.print(); return; }
    const prevDisplay = area.style.display;
    area.style.display = "block";
    const reset = () => { area.style.display = prevDisplay; window.removeEventListener("afterprint", reset); };
    window.addEventListener("afterprint", reset);
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="ce-page">
      <div className="ce-shell">
        {/* Hero */}
        <header className="ce-hero">
          <div className="ce-top">
            <div className="ce-identity">
              <div className="ce-mark">
                <svg viewBox="0 0 24 24">
                  <path d="M12 3a9 9 0 1 0 9 9" />
                  <path d="M12 7v5l3 2" />
                  <path d="M12 3v4M21 12h-4" />
                </svg>
              </div>
              <div>
                <div className="ce-title">Controle de Eficiência de Máquinas</div>
                <div className="ce-subtitle">Registro de OPs, metragem e tempo por máquina</div>
              </div>
            </div>
            <div className="ce-tools">
              <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === "maquinas" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                  onClick={() => setViewMode("maquinas")}
                >
                  <List className="w-3.5 h-3.5" /> Máquinas
                </button>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === "analise" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                  onClick={() => setViewMode("analise")}
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Análise
                </button>
              </div>
              <button className="ce-btn" onClick={handlePrint}>
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button className="ce-btn primary" onClick={() => setSetupOpen(true)}>
                <Timer className="w-4 h-4" /> Importar Setup
              </button>
              <button className="ce-btn" onClick={() => setFamiliasOpen(true)}>
                <Database className="w-4 h-4" /> Famílias e Cilindros
              </button>
              <button className="ce-btn" onClick={() => setFamiliasEstampaOpen(true)}>
                <Database className="w-4 h-4" /> Famílias Estampas
              </button>
              <DayFilter
                selectedDays={selectedDays}
                onSelect={setSelectedDays}
                triggerClassName="ce-filter"
              />
              <ProductFilter
                products={productsForFilter}
                selected={selectedProducts}
                onSelect={setSelectedProducts}
                triggerClassName="ce-filter"
              />
              <div className="ce-op-search">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar OP..."
                  value={opSearch}
                  onChange={(e) => setOpSearch(e.target.value)}
                  className="ce-op-input"
                />
                {opSearch && (
                  <button onClick={() => setOpSearch("")} className="ce-op-clear">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {temFiltro && (
                <button
                  className="ce-btn"
                  onClick={() => { setSelectedDays([]); setSelectedProducts([]); setOpSearch(""); }}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
          <div className="ce-hero-stats">
            <div className="ce-hero-stat">
              <strong>{String(heroStats.machinesAtivas).padStart(2, "0")}</strong>
              <span>Máquinas monitoradas</span>
            </div>
            <div className="ce-hero-stat">
              <strong>{fmtHoras(heroStats.totalReal)}</strong>
              <span>Tempo registrado</span>
            </div>
            <div className="ce-hero-stat">
              <strong>{heroStats.efMedia > 0 ? Math.round(heroStats.efMedia) : 0}%</strong>
              <span>Eficiência média</span>
            </div>
          </div>
        </header>

        {viewMode === "analise" ? (
          <section className="ce-section">
            <div className="ce-section-head">
              <h2>Análise de Eficiência</h2>
              <span className="ce-section-note">Visão consolidada por máquina</span>
            </div>
            <AnaliseEficienciaDashboard records={filtered} selectedDays={selectedDays} />
          </section>
        ) : (
        <>
        {/* Machines section */}
        <section className="ce-section">
          <div className="ce-section-head">
            <h2>Máquinas</h2>
            <span className="ce-section-note">Selecione uma máquina para visualizar o relatório</span>
          </div>
          <div className="ce-machines">
            {MACHINES.map((m) => (
              <MachineCard
                key={m}
                maquina={m}
                records={byMachine[m] || []}
                active={active === m}
                onSelect={() => { setActive(m); setRelatorioMaquina(m); }}
                onImport={() => { setImportMachine(m); setImportOpen(true); }}
                onRelatorio={toggleRelatorio}
                relatorioAtivo={relatorioMaquina === m}
              />
            ))}
          </div>
        </section>

        {/* Report section */}
        <section className="ce-section">
          {opActive ? (
            <OpJourneyPanel
              op={opSearch.trim()}
              records={filtered}
              onClose={() => setOpSearch("")}
            />
          ) : selectedProducts.length > 0 ? (
            <RelatorioProdutoMaquinas
              products={selectedProducts}
              records={filtered}
              onClose={() => setSelectedProducts([])}
            />
          ) : (
            relatorioMaquina && (byMachine[relatorioMaquina] || []).length >= 0 && (
              <RelatorioMaquina
                maquina={relatorioMaquina}
                records={byMachine[relatorioMaquina] || []}
                onClose={() => setRelatorioMaquina(null)}
                onSaved={load}
              />
            )
          )}
        </section>
        </>
        )}

      </div>

      <ImportExcelDialog open={importOpen} maquina={importMachine} onOpenChange={setImportOpen} onImported={reload} />
      <ImportSetupDialog open={setupOpen} onOpenChange={setSetupOpen} onImported={reload} />
      <FamiliasCilindrosDialog open={familiasOpen} onOpenChange={setFamiliasOpen} />
      <FamiliaEstampaDialog open={familiasEstampaOpen} onOpenChange={setFamiliasEstampaOpen} />

      {/* Área de impressão: máquina selecionada */}
      <div className="hidden print:block print-area">
        <div className="mb-6 pb-4 border-b-2 border-slate-900">
          <h1 className="text-2xl font-bold">Controle de Eficiência — {active}</h1>
          <p className="text-sm text-slate-600">
            {temFiltro ? "Relatório filtrado" : "Relatório completo"} — gerado em {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="print-machine">
          <div className="flex gap-3 mb-4 print-cards">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="text-[10px] text-emerald-700/70 uppercase font-medium">Total Real</p>
                <p className="text-sm font-bold text-emerald-700 tabular-nums">{totaisActive.real.toFixed(2).replace(".", ",")} h</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-[10px] text-blue-700/70 uppercase font-medium">Total Previsto</p>
                <p className="text-sm font-bold text-blue-700 tabular-nums">{totaisActive.esperado.toFixed(2).replace(".", ",")} h</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: corEfGeral }}>
              <GaugeIcon className="w-4 h-4 text-white" />
              <div>
                <p className="text-[10px] text-white/80 uppercase font-medium">Eficiência</p>
                <p className="text-sm font-bold tabular-nums text-white">{totaisActive.eficiencia.toFixed(0)}%</p>
              </div>
            </div>
          </div>
          <ControleTable records={byMachine[active]} maquina={active} onSaved={load} />
        </div>
      </div>
    </div>
  );
}
