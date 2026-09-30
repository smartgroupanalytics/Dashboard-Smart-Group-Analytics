const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { UploadCloud, Target, Loader2, TrendingUp, TrendingDown, AlertTriangle, Award } from "lucide-react";
import ImportAproveitamentoDialog from "@/components/aproveitamento/ImportAproveitamentoDialog";
import AproveitamentoKpiCard from "@/components/aproveitamento/AproveitamentoKpiCard";
import InsumosCombinedFilter from "@/components/insumos/InsumosCombinedFilter";
import AproveitamentoMaquinaDetail from "@/components/aproveitamento/AproveitamentoMaquinaDetail";
import AproveitamentoRevisaoTable from "@/components/aproveitamento/AproveitamentoRevisaoTable";
import AproveitamentoOpReport from "@/components/aproveitamento/AproveitamentoOpReport";
import AproveitamentoFamiliaFilter, { extractFamilia, familiaKey } from "@/components/aproveitamento/AproveitamentoFamiliaFilter";
import AproveitamentoFamiliaAnalise from "@/components/aproveitamento/AproveitamentoFamiliaAnalise";
import { tempoRealHoras, tempoEsperadoHoras, setupPrevistoMinutos } from "@/lib/controleSpeed";
import { ChevronRight, ListChecks } from "lucide-react";

// === Cálculo do Aproveitamento ===
// Fórmula (média ponderada): 25% Produção + 15% Setup + 55% Consumo + 5% Quebra
// Se houver retrabalho, aplica -15% sobre o resultado.
function calcIndices(r) {
  // Sem teto: índices acima de 100% somam pontos extras (fazer em menos tempo = bônus)
  const floor0 = (v) => Math.max(0, v);
  const ip = (r.tempo_realizado > 0 || r.tempo_previsto > 0)
    ? floor0(r.tempo_realizado > 0 ? (r.tempo_previsto / r.tempo_realizado) * 100 : 100)
    : 100;
  const is = floor0(r.setup_realizado > 0 ? (r.setup_previsto / r.setup_realizado) * 100 : 100);
  const ic = floor0(r.consumo_realizado > 0 ? (r.consumo_previsto / r.consumo_realizado) * 100 : 100);
  const iq = Math.max(0, 100 - (r.quebra_pct || 0));
  let final = 0.25 * ip + 0.15 * is + 0.55 * ic - (r.quebra_pct || 0);
  if (r.tem_retrabalho) final = final * 0.85;
  return { ip, is, ic, iq, final };
}

function colorClass(v) {
  if (v >= 85) return { text: "text-emerald-600", bg: "bg-emerald-100", label: "Excelente" };
  if (v >= 70) return { text: "text-amber-600", bg: "bg-amber-100", label: "Atenção" };
  return { text: "text-rose-600", bg: "bg-rose-100", label: "Crítico" };
}

const fmtNum = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtCurrency = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;
// Converte minutos para formato HH:MM (ex.: 125 → "02:05")
const fmtMinHora = (v) => {
  if (!v || v === 0) return "—";
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
// Converte valor decimal (H.MM) para formato de horas HH:MM (ex.: 1.50 → "1:50")
const fmtHora = (v) => {
  if (!v || v === 0) return "—";
  const h = Math.floor(v);
  const m = Math.round((v - h) * 100);
  let hh = h + (m >= 60 ? 1 : 0);
  let mm = m % 60;
  return `${hh}:${String(mm).padStart(2, "0")}`;
};

export default function AproveitamentoOP() {
  const [records, setRecords] = useState([]);
  const [detalheRecords, setDetalheRecords] = useState([]);
  const [controleRecords, setControleRecords] = useState([]);
  const [insumosRecords, setInsumosRecords] = useState([]);
  const [retrabalhoRecords, setRetrabalhoRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [reportRow, setReportRow] = useState(null);
  const [filterLevel, setFilterLevel] = useState(null);
  const [selectedFamilias, setSelectedFamilias] = useState([]);
  const [analiseFamilia, setAnaliseFamilia] = useState(null);
  const [selectedDays, setSelectedDays] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aproveitamento_selected_days") || "[]"); } catch { return []; }
  });
  const setSelectedDaysPersist = (days) => {
    setSelectedDays(days);
    try { localStorage.setItem("aproveitamento_selected_days", JSON.stringify(days)); } catch {}
  };

  const load = async () => {
    try {
      setLoading(true);
      const [data, detalhe, controle, insumos, retrabalho] = await Promise.all([
        db.entities.AproveitamentoOP.list("-created_date", 2000),
        db.entities.DetalheRevisaoOP.list("data", 3000),
        db.entities.ControleEficiencia.list("-created_date", 3000),
        db.entities.InsumosQuimicos.list("-created_date", 5000),
        db.entities.RetrabalhoAnalise.list("-data", 5000),
      ]);
      setRecords(data);
      setDetalheRecords(detalhe);
      setControleRecords(controle);
      setInsumosRecords(insumos);
      setRetrabalhoRecords(retrabalho);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleParsed = async (parsed) => {
    setSaving(true);
    try {
      if (parsed.length > 0) {
        const dates = [...new Set(parsed.map((r) => r.data).filter(Boolean))];
        for (const d of dates) { await db.entities.AproveitamentoOP.deleteMany({ data: d }); }
        await db.entities.AproveitamentoOP.bulkCreate(parsed);
      }
      await load();
      toast({ title: `${parsed.length} registro(s) salvo(s).` });
      setImportOpen(false);
    } catch (e) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  // Métricas por OP vindas do AproveitamentoOP (melhor registro por OP)
  const metricsByOp = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      if (!r.num_op) return;
      const ex = map[r.num_op];
      if (!ex || (r.tempo_previsto || 0) > (ex.tempo_previsto || 0)) map[r.num_op] = r;
    });
    return map;
  }, [records]);

  // Consumo (previsto/realizado) por OP vindos do Insumos Químicos — usa Qtde (kg) em vez de Valor (R$)
  const consumoByOp = useMemo(() => {
    const map = {};
    insumosRecords.forEach((r) => {
      if (!r.num_op) return;
      const key = String(r.num_op).trim();
      if (!map[key]) map[key] = { previsto: 0, realizado: 0 };
      map[key].previsto += r.qtde_prevista || 0;
      map[key].realizado += r.qtde_realizada || 0;
    });
    return map;
  }, [insumosRecords]);

  // Tempo Previsto somado por OP vindos do Controle de Eficiência (metragem / velocidade prevista, todas as máquinas, sem retrabalho)
  const tempoPrevistoByOp = useMemo(() => {
    const map = {};
    controleRecords.forEach((r) => {
      if (!r.num_op || r.is_retrabalho) return;
      const key = String(r.num_op).trim();
      const t = tempoEsperadoHoras(r.metragem, r.maquina, r.processo);
      map[key] = (map[key] || 0) + (t || 0);
    });
    return map;
  }, [controleRecords]);

  // Tempo Real somado por OP vindos do Controle de Eficiência (todas as máquinas, sem retrabalho)
  const tempoRealByOp = useMemo(() => {
    const map = {};
    controleRecords.forEach((r) => {
      if (!r.num_op || r.is_retrabalho) return;
      const key = String(r.num_op).trim();
      const t = r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
      map[key] = (map[key] || 0) + (t || 0);
    });
    return map;
  }, [controleRecords]);

  // Setup Real somado por OP vindos do Controle de Eficiência (coluna setup + parada, todas as máquinas, sem retrabalho)
  const setupRealByOp = useMemo(() => {
    const map = {};
    controleRecords.forEach((r) => {
      if (!r.num_op || r.is_retrabalho) return;
      const key = String(r.num_op).trim();
      map[key] = (map[key] || 0) + (r.setup || 0) + (r.parada || 0);
    });
    return map;
  }, [controleRecords]);

  // Setup Previsto somado por OP vindos do Controle de Eficiência (regra por máquina/processo, todas as máquinas, sem retrabalho)
  const setupPrevistoByOp = useMemo(() => {
    const map = {};
    controleRecords.forEach((r) => {
      if (!r.num_op || r.is_retrabalho) return;
      const key = String(r.num_op).trim();
      const s = setupPrevistoMinutos(r.maquina, r.processo);
      map[key] = (map[key] || 0) + (s || 0);
    });
    return map;
  }, [controleRecords]);

  // Metros de retrabalho por OP vindos da Análise de Retrabalho (RetrabalhoAnalise)
  const retrabalhoByOp = useMemo(() => {
    const map = {};
    retrabalhoRecords.forEach((r) => {
      if (!r.op) return;
      const key = String(r.op).trim();
      map[key] = (map[key] || 0) + (r.metros || 0);
    });
    return map;
  }, [retrabalhoRecords]);

  // Metragem (qtd_revisada) e Quebra (qtd_refugo) por OP vindas do DetalheRevisaoOP
  const detalheByOp = useMemo(() => {
    const map = {};
    detalheRecords.forEach((r) => {
      if (!r.op) return;
      const key = String(r.op).trim();
      if (!map[key]) map[key] = { metragem: 0, mts_quebra: 0 };
      map[key].metragem += r.qtd_revisada || 0;
      map[key].mts_quebra += r.qtd_refugo || 0;
    });
    return map;
  }, [detalheRecords]);

  // OPs vêm do DetalheRevisaoOP (detalhamento), filtradas pelos dias selecionados
  const filteredDetalhe = useMemo(() => {
    if (selectedDays.length === 0) return detalheRecords;
    return detalheRecords.filter((r) => r.data && selectedDays.includes(r.data));
  }, [detalheRecords, selectedDays]);

  // OPs somente de revisão (não são produção) — excluídas do aproveitamento
  const OPS_EXCLUIDAS = ["8300", "6207"];

  const rows = useMemo(() => {
    const seen = new Set();
    const result = [];
    filteredDetalhe.forEach((d) => {
      if (!d.op || seen.has(d.op)) return;
      if (OPS_EXCLUIDAS.includes(String(d.op).trim())) return;
      seen.add(d.op);
      const opKey = String(d.op).trim();
      const ap = metricsByOp[opKey] || metricsByOp[d.op] || {};
      const cons = consumoByOp[opKey] || {};
      const det = detalheByOp[opKey] || detalheByOp[d.op] || {};
      const consumoPrev = cons.previsto || 0;
      const consumoReal = cons.realizado || 0;
      const merged = {
        id: d.id,
        num_op: d.op,
        descricao_produto: d.descricao || ap.descricao_produto || "",
        data: d.data,
        metragem: det.metragem || 0,
        mts_quebra: det.mts_quebra || 0,
        tempo_previsto: tempoPrevistoByOp[opKey] || tempoPrevistoByOp[d.op] || 0,
        tempo_realizado: tempoRealByOp[opKey] || tempoRealByOp[d.op] || 0,
        setup_previsto: setupPrevistoByOp[opKey] || setupPrevistoByOp[d.op] || 0,
        setup_realizado: setupRealByOp[opKey] || setupRealByOp[d.op] || 0,
        consumo_previsto: consumoPrev,
        consumo_realizado: consumoReal,
        quebra_pct: (det.metragem || 0) > 0 ? ((det.mts_quebra || 0) / (det.metragem || 0)) * 100 : (ap.quebra_pct || 0),
        tem_retrabalho: (retrabalhoByOp[opKey] || retrabalhoByOp[d.op] || 0) > 0 || ap.tem_retrabalho || false,
        retrabalho_metros: retrabalhoByOp[opKey] || retrabalhoByOp[d.op] || ap.retrabalho_metros || 0,
        hasMetrics: !!(tempoPrevistoByOp[opKey] || tempoRealByOp[opKey] || consumoPrev || consumoReal),
      };
      result.push({ ...merged, ...calcIndices(merged) });
    });
    return result;
  }, [filteredDetalhe, metricsByOp, consumoByOp, detalheByOp]);

  const familyFilteredRows = useMemo(() => {
    if (selectedFamilias.length === 0) return rows;
    const selectedKeys = selectedFamilias.map(familiaKey);
    return rows.filter((r) => selectedKeys.includes(familiaKey(extractFamilia(r.descricao_produto))));
  }, [rows, selectedFamilias]);

  const rowsWithMetrics = useMemo(() => familyFilteredRows.filter((r) => r.hasMetrics), [familyFilteredRows]);

  const avgAproveitamento = useMemo(() => {
    if (rowsWithMetrics.length === 0) return 0;
    // Cálculo geral (não média): soma das contribuições ponderadas de todas as OPs, dividindo pelo total de OPs
    const totalTempo = rowsWithMetrics.reduce((s, r) => s + (r.ip || 0) * 0.25, 0);
    const totalSetup = rowsWithMetrics.reduce((s, r) => s + (r.is || 0) * 0.15, 0);
    const totalConsumo = rowsWithMetrics.reduce((s, r) => s + (r.ic || 0) * 0.55, 0);
    const totalQuebra = rowsWithMetrics.reduce((s, r) => s + (r.quebra_pct || 0), 0);
    const n = rowsWithMetrics.length;
    return Math.max(0, (totalTempo + totalSetup + totalConsumo) / n - totalQuebra / n);
  }, [rowsWithMetrics]);

  const countExcelente = useMemo(() => rowsWithMetrics.filter((r) => r.final >= 95).length, [rowsWithMetrics]);
  const countIntermediario = useMemo(() => rowsWithMetrics.filter((r) => r.final >= 92 && r.final < 95).length, [rowsWithMetrics]);
  const countCritico = useMemo(() => rowsWithMetrics.filter((r) => r.final < 92).length, [rowsWithMetrics]);
  const countRetrabalho = useMemo(() => rowsWithMetrics.filter((r) => r.tem_retrabalho).length, [rowsWithMetrics]);

  // Linhas exibidas na tabela — filtradas pelo card de KPI selecionado
  const visibleRows = useMemo(() => {
    if (!filterLevel) return familyFilteredRows;
    if (filterLevel === "retrabalho") return familyFilteredRows.filter((r) => r.tem_retrabalho);
    if (filterLevel === "excelente") return familyFilteredRows.filter((r) => r.hasMetrics && r.final >= 95);
    if (filterLevel === "intermediario") return familyFilteredRows.filter((r) => r.hasMetrics && r.final >= 92 && r.final < 95);
    if (filterLevel === "critico") return familyFilteredRows.filter((r) => r.hasMetrics && r.final < 92);
    return familyFilteredRows;
  }, [familyFilteredRows, filterLevel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 88% 5%, rgba(99,102,241,.12), transparent 28%)" }} />
      <div className="relative mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-5 py-4 border border-slate-300 rounded-[14px] shadow-sm bg-white/80 backdrop-blur-[12px] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-indigo-600 to-indigo-800 text-white grid place-items-center shadow-md">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-lg tracking-wide font-extrabold text-slate-800">APROVEITAMENTO POR OP</strong>
              <p className="text-xs text-slate-500">Fórmula: 25% Produção + 15% Setup + 55% Consumo + 5% Quebra · −15% se houver retrabalho</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InsumosCombinedFilter selectedDays={selectedDays} onSelect={setSelectedDaysPersist} triggerClassName="bg-white border-slate-300" />
            <AproveitamentoFamiliaFilter rows={rows} selected={selectedFamilias} onChange={setSelectedFamilias} onAnalise={setAnaliseFamilia} />
            <Button variant="default" size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700" onClick={() => setDetalheOpen((v) => !v)}>
              <ListChecks className="w-4 h-4" /> Detalhes do Dia
            </Button>
            <Button variant="default" size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700" onClick={() => setImportOpen(true)}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} Importação
            </Button>
          </div>
        </header>

        {/* OPs Revisadas (da Revisão) — aparece ao clicar Detalhes do Dia */}
        {detalheOpen && (
          <div className="mb-5">
            <AproveitamentoRevisaoTable selectedDays={selectedDays} controleRecords={controleRecords} aproveitamentoRecords={records} />
          </div>
        )}

        {rows.length === 0 ? (
          <div className="text-center py-20 border border-slate-300 rounded-[14px] bg-white/70">
            <Target className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Nenhum dado de aproveitamento importado.</p>
            <p className="text-slate-500 text-sm mt-1">Clique em "Importação" para carregar a planilha.</p>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
              <AproveitamentoKpiCard label="Aproveitamento Real" value={fmtPct(avgAproveitamento)} icon={Award} color={avgAproveitamento >= 95 ? "emerald" : avgAproveitamento >= 92 ? "amber" : "rose"} delay={0} active={filterLevel === "all"} onClick={() => setFilterLevel((f) => (f === "all" ? null : "all"))} />
              <AproveitamentoKpiCard label="OPs Excelentes (≥95%)" value={countExcelente} icon={TrendingUp} color="emerald" delay={0.06} active={filterLevel === "excelente"} onClick={() => setFilterLevel((f) => (f === "excelente" ? null : "excelente"))} />
              <AproveitamentoKpiCard label="OPs Intermediárias (92-94%)" value={countIntermediario} icon={Target} color="amber" delay={0.12} active={filterLevel === "intermediario"} onClick={() => setFilterLevel((f) => (f === "intermediario" ? null : "intermediario"))} />
              <AproveitamentoKpiCard label="OPs Críticas (<92%)" value={countCritico} icon={TrendingDown} color="rose" delay={0.18} active={filterLevel === "critico"} onClick={() => setFilterLevel((f) => (f === "critico" ? null : "critico"))} />
              <AproveitamentoKpiCard label="OPs c/ Retrabalho" value={countRetrabalho} icon={AlertTriangle} color="amber" delay={0.24} active={filterLevel === "retrabalho"} onClick={() => setFilterLevel((f) => (f === "retrabalho" ? null : "retrabalho"))} />
            </div>

            {/* Tabela detalhada */}
            <div className="bg-white/80 border border-slate-300 rounded-[14px] shadow-sm overflow-hidden backdrop-blur-[10px]">
              <div className="px-5 py-3 border-b border-slate-300 bg-slate-100/80 flex items-center justify-between gap-3">
                <h2 className="text-xs uppercase tracking-[0.11em] font-bold text-slate-700">Detalhamento por OP</h2>
                <div className="flex items-center gap-3">
                  {selectedFamilias.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        Família(s): <strong className="text-indigo-700">{selectedFamilias.join(", ")}</strong>
                      </span>
                      <button onClick={() => setSelectedFamilias([])} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline">limpar</button>
                    </div>
                  )}
                  {filterLevel && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      Filtro: <strong className="text-slate-700">
                        {filterLevel === "all" ? "Todas com métricas" : filterLevel === "excelente" ? "Excelentes (≥95%)" : filterLevel === "intermediario" ? "Intermediárias (92-94%)" : filterLevel === "critico" ? "Críticas (<92%)" : "Com Retrabalho"}
                      </strong>
                      {" "}({visibleRows.length} OP{visibleRows.length !== 1 ? "s" : ""})
                    </span>
                    <button onClick={() => setFilterLevel(null)} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline">limpar</button>
                  </div>
                  )}
                </div>
              </div>
              <div className="overflow-auto max-h-[620px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-700 text-white">
                      <th className="px-2 py-2.5 text-center font-semibold w-8 print-hide"></th>
                      <th className="px-2 py-2.5 text-left font-semibold whitespace-nowrap">Nº OP</th>
                      <th className="px-2 py-2.5 text-left font-semibold whitespace-nowrap">Descrição</th>
                      <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap bg-blue-700/80">Metragem</th>
                      <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap bg-blue-700/80">Mts Quebra</th>
                      <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap bg-blue-700/80">Quebra %</th>
                      <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap bg-green-900/90 border-l-2 border-slate-400">T. Prev (h)</th>
                      <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap bg-green-900/90">T. Real (h)</th>
                      <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap bg-green-900/90">% de Tempo</th>
                      <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">Setup Prev (h)</th>
                      <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">Setup Real (h)</th>
                      <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">% Setup</th>
                      <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap bg-orange-600 border-l-2 border-slate-400">Cons. Prev (kg)</th>
                      <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap bg-orange-600">Cons. Real (kg)</th>
                      <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap bg-orange-600">% Consumo</th>
                      <th className="px-2 py-2.5 text-center font-semibold whitespace-nowrap bg-red-600 border-l-2 border-slate-400">Retrab.</th>
                      <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">APROVEIT.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td colSpan={17} className="px-4 py-10 text-center text-slate-500 text-sm">
                          Nenhuma OP nesta categoria para o período selecionado.
                        </td>
                      </tr>
                    ) : visibleRows.map((r, i) => {
                      const c = colorClass(r.final);
                      const key = r.id || i;
                      const isOpen = !!expanded[key];
                      return (
                        <React.Fragment key={key}>
                        <tr onClick={() => setExpanded((s) => ({ ...s, [key]: !s[key] }))} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer ${r.tem_retrabalho ? "bg-amber-50/40" : "even:bg-slate-50/50"}`}>
                          <td className="px-2 py-2 text-center text-slate-400 print-hide" onClick={(e) => { e.stopPropagation(); setReportRow(r); }}>
                            <ChevronRight className={`w-4 h-4 inline transition-transform hover:text-indigo-600 hover:scale-110 ${isOpen ? "rotate-90" : ""}`} />
                          </td>
                          <td className="px-2 py-2 text-slate-800 font-bold whitespace-nowrap">{r.num_op}</td>
                          <td className="px-2 py-2 text-slate-600 max-w-[200px] truncate" title={r.descricao_produto}>{r.descricao_produto || "—"}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap">{fmtNum(r.metragem)}</td>
                          <td className={`px-2 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${(r.mts_quebra || 0) > 0 ? "text-rose-600" : "text-slate-400"}`}>{fmtNum(r.mts_quebra)}</td>
                          <td className={`px-2 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${(r.quebra_pct || 0) > 5 ? "text-rose-600" : "text-emerald-600"}`}>{fmtPct(r.quebra_pct)}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap border-l-2 border-slate-300">{fmtHora(r.tempo_previsto)}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap">{fmtHora(r.tempo_realizado)}</td>
                          <td className={`px-2 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${(r.ip || 0) >= 100 ? "text-emerald-700" : "text-amber-700"}`}>{fmtPct((r.ip || 0) * 0.25)}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap border-l-2 border-slate-300">{fmtMinHora(r.setup_previsto)}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap">{fmtMinHora(r.setup_realizado)}</td>
                          <td className={`px-2 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${(r.is || 0) >= 100 ? "text-emerald-700" : "text-amber-700"}`}>{fmtPct((r.is || 0) * 0.15)}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap border-l-2 border-slate-300">{fmtNum(r.consumo_previsto)}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap">{fmtNum(r.consumo_realizado)}</td>
                          <td className={`px-2 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${(r.consumo_realizado || 0) > 0 ? (r.ic || 0) >= 100 ? "text-emerald-700" : "text-amber-700" : "text-emerald-700"}`}>{(r.consumo_realizado || 0) > 0 ? fmtPct((r.ic || 0) * 0.55) : fmtPct(100 * 0.55)}</td>
                          <td className="px-2 py-2 text-center whitespace-nowrap border-l-2 border-slate-300">
                            {r.tem_retrabalho ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                                <AlertTriangle className="w-3 h-3" /> {fmtNum(r.retrabalho_metros)}m
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums font-extrabold whitespace-nowrap">
                            {r.hasMetrics ? (
                              <span className={`inline-block px-2 py-0.5 rounded ${c.bg} ${c.text}`}>{fmtPct(r.final)}</span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                        {isOpen && <AproveitamentoMaquinaDetail controleRecords={controleRecords} numOp={r.num_op} />}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      <ImportAproveitamentoDialog open={importOpen} onOpenChange={setImportOpen} onParsed={handleParsed} />
      <AproveitamentoOpReport open={!!reportRow} onOpenChange={(o) => !o && setReportRow(null)} row={reportRow} controleRecords={controleRecords} />
      <AproveitamentoFamiliaAnalise open={!!analiseFamilia} onOpenChange={(o) => !o && setAnaliseFamilia(null)} familia={analiseFamilia} rows={rows} />
    </div>
  );
}