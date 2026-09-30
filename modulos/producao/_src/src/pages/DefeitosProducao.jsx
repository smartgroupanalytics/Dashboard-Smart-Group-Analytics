const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from "react";

import { Bug, UploadCloud, Hash, Ruler, AlertTriangle, Percent, ChevronRight, Trophy, Printer, FileText } from "lucide-react";
import { fmtMeters } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import DayFilter from "@/components/desempenho/DayFilter";
import ImportDefeitosDialog from "@/components/defeitos/ImportDefeitosDialog";
import RankingDefeitosDialog from "@/components/defeitos/RankingDefeitosDialog";
import RelatorioProdutoDefeitoDialog from "@/components/defeitos/RelatorioProdutoDefeitoDialog";

const HERO_IMG = "./assets/producao-bg.svg";

function todayIso() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function pct(def, total) {
  if (!total) return 0;
  return (def / total) * 100;
}

export default function DefeitosProducao() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [relatorioOpen, setRelatorioOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState(() => {
    try {
      const saved = localStorage.getItem("defeitos_selectedDays");
      return saved ? JSON.parse(saved) : [todayIso()];
    } catch {
      return [todayIso()];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("defeitos_selectedDays", JSON.stringify(selectedDays));
    } catch {}
  }, [selectedDays]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await db.entities.DefeitoProducao.list("-data", 5000);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (selectedDays.length === 0) return records;
    return records.filter((r) => r.data && selectedDays.includes(r.data));
  }, [records, selectedDays]);

  // Consolida por OP: uma linha por OP, somando a metragem (coluna K / Qtd.aprovada)
  const byOp = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      if (!map[r.op]) {
        map[r.op] = {
          op: r.op,
          produto: r.produto || "",
          descricao: r.descricao || "",
          defeitos: {},
          metros_defeito: 0,
          metragem: 0,
          qtd_op: 0,
          qtd_refug: 0,
          count: 0,
        };
      }
      const e = map[r.op];
      e.count += 1;
      e.metragem += r.metragem || 0;
      e.metros_defeito += r.metros_defeito || 0;
      if (!e.produto && r.produto) e.produto = r.produto;
      if (!e.descricao && r.descricao) e.descricao = r.descricao;
      if (r.defeito) e.defeitos[r.defeito] = (e.defeitos[r.defeito] || 0) + (r.metros_defeito || 0);
      if (!e.qtd_op && r.qtd_op) e.qtd_op = r.qtd_op;
      if (!e.qtd_refug && r.qtd_refug) e.qtd_refug = r.qtd_refug;
    });
    return Object.values(map)
      .map((e) => ({
        ...e,
        defeitosLista: Object.entries(e.defeitos).map(([texto, metros]) => ({ texto, metros })),
      }))
      .sort((a, b) => String(a.op).localeCompare(String(b.op)));
  }, [filtered]);

  const totals = useMemo(() => {
    const totalMetragem = byOp.reduce((s, r) => s + r.metragem, 0);
    const totalDefeitos = byOp.reduce((s, r) => s + r.qtd_refug, 0);
    const totalOp = byOp.reduce((s, r) => s + r.qtd_op, 0);
    return {
      ops: byOp.length,
      metragem: totalMetragem,
      defeitos: totalDefeitos,
      pct: pct(totalDefeitos, totalOp),
    };
  }, [byOp]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const KPIS = [
    { label: "Nº de OPs", value: totals.ops.toLocaleString("pt-BR"), icon: Hash },
    { label: "Total Produzido", value: fmtMeters(totals.metragem), icon: Ruler },
    { label: "Total Defeitos", value: fmtMeters(totals.defeitos), icon: AlertTriangle },
    { label: "% Defeitos", value: `${totals.pct.toFixed(1)}%`, icon: Percent },
  ];

  return (
    <div className="df-dashboard">
      {/* Hero com glassmorphism */}
      <section className="df-hero">
        <img src={HERO_IMG} alt="" className="df-hero-img" />
        <div className="df-hero-content">
          <div className="df-hero-title">
            <div className="df-hero-icon">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h1>Defeitos de Produção</h1>
              <p>Acompanhamento de refugos por OP</p>
            </div>
          </div>
          <div className="df-actions">
            <DayFilter selectedDays={selectedDays} onSelect={setSelectedDays} triggerClassName="df-dayfilter" />
            {selectedDays.length > 0 && (
              <button className="df-action" onClick={() => setSelectedDays([])}>
                Limpar data
              </button>
            )}
            <button className="df-action teal" onClick={() => setImportOpen(true)}>
              <UploadCloud className="w-4 h-4" /> Importar
            </button>
            <button className="df-action cyan" onClick={() => setRankingOpen(true)}>
              <Trophy className="w-4 h-4" /> Ranking
            </button>
            <button className="df-action dark" onClick={() => setRelatorioOpen(true)}>
              <FileText className="w-4 h-4" /> Relatório
            </button>
          </div>
        </div>
      </section>

      {byOp.length === 0 ? (
        <div className="df-empty">
          <Bug className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Nenhum defeito encontrado para o período selecionado.</p>
          <p className="text-slate-500 text-sm mt-1">Clique em "Importar" para carregar o relatório.</p>
        </div>
      ) : (
        <>
          {/* KPIs em cards de vidro */}
          <div className="df-kpis">
            {KPIS.map((k) => (
              <article key={k.label} className="df-kpi">
                <div className="df-kpi-top">
                  <span className="df-kpi-mark">
                    <k.icon className="w-4 h-4" />
                  </span>
                  <span>{k.label}</span>
                </div>
                <div className="df-kpi-value">{k.value}</div>
              </article>
            ))}
          </div>

          {/* Tabela — Defeitos do Dia */}
          <DefeitosTable rows={byOp} selectedDays={selectedDays} />
        </>
      )}

      <ImportDefeitosDialog open={importOpen} onOpenChange={setImportOpen} onImported={load} />
      <RankingDefeitosDialog open={rankingOpen} onOpenChange={setRankingOpen} records={records} />
      <RelatorioProdutoDefeitoDialog open={relatorioOpen} onOpenChange={setRelatorioOpen} records={filtered} selectedDays={selectedDays} />
    </div>
  );
}

function DefeitosTable({ rows, selectedDays }) {
  const handlePrint = () => {
    document.body.classList.add("printing-defeitos");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-defeitos"), 500);
  };

  const diasTexto = selectedDays && selectedDays.length > 0
    ? selectedDays.map((d) => d.split("-").reverse().join("/")).join(", ")
    : "Todos";

  return (
    <div className="df-table-card defeitos-root">
      <div className="df-table-head">
        <span className="df-warning">
          <AlertTriangle className="w-4 h-4" />
        </span>
        <h2>Defeitos do Dia</h2>
        <span className="df-count">{rows.length} OP(s)</span>
        <button className="df-print print-hide" onClick={handlePrint}>
          <Printer className="w-4 h-4" /> Imprimir
        </button>
      </div>
      <p className="print-only hidden text-center font-extrabold text-[#0a2540] text-lg mb-1">Defeitos do Dia</p>
      <p className="print-only hidden text-center text-sm text-gray-700 mb-2">{diasTexto}</p>
      <div className="df-table-wrap">
        <table className="df-table">
          <thead>
            <tr>
              <th>OP</th>
              <th>Produto</th>
              <th>Descrição</th>
              <th>Defeito</th>
              <th>Metros de Defeito</th>
              <th>Metragem</th>
              <th>Qtd.OP</th>
              <th>% Def.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = pct(r.qtd_refug, r.qtd_op);
              return (
                <tr key={r.op}>
                  <td className="df-op">{r.op}</td>
                  <td className="whitespace-nowrap">{r.produto || "—"}</td>
                  <td className="truncate df-desc" title={r.descricao}>{r.descricao || "—"}</td>
                  <td className="defeito-print"><DefeitoCell defeitos={r.defeitosLista} /></td>
                  <td className="df-num df-rose">{r.metros_defeito ? fmtMeters(r.metros_defeito) : "—"}</td>
                  <td className="df-num df-blue">{fmtMeters(r.metragem)}</td>
                  <td className="df-num df-blue">{fmtMeters(r.qtd_op)}</td>
                  <td className={`df-num ${p > 5 ? "df-rose" : p > 2 ? "df-amber" : "df-green"}`}>
                    {p.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DefeitoCell({ defeitos }) {
  if (!defeitos || defeitos.length === 0) {
    return <span className="text-slate-400">—</span>;
  }
  const multiple = defeitos.length > 1;
  const summary = multiple ? `${defeitos.length} defeitos` : defeitos[0].texto;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="df-defect-count">
          <span className="truncate">{summary}</span>
          <ChevronRight className="w-3 h-3 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 border-0 shadow-2xl rounded-2xl overflow-hidden" align="start">
        <div className="relative px-4 py-3 bg-gradient-to-r from-[#0a2540] to-[#0e3a5e] text-white">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-white/15 grid place-items-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-cyan-200 font-bold">Defeitos da OP</div>
              <div className="text-sm font-extrabold">{defeitos.length} tipo{defeitos.length > 1 ? "s" : ""} registrado{defeitos.length > 1 ? "s" : ""}</div>
            </div>
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto bg-white">
          {defeitos.map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-md bg-rose-50 text-rose-500 grid place-items-center text-[10px] font-bold tabular-nums shrink-0">{i + 1}</span>
                <span className="text-xs text-slate-700 leading-tight">{d.texto}</span>
              </div>
              <span className="text-xs font-bold text-rose-600 tabular-nums shrink-0">{d.metros ? fmtMeters(d.metros) : "—"}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}