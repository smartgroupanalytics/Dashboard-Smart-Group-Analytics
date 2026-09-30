const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, DollarSign, Ruler, TrendingUp, Calculator, BarChart3, Wallet, LayoutDashboard, Table, Presentation, X, Upload, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import MonthFilter from "@/components/faturamento/MonthFilter";
import EditFaturamentoDialog from "@/components/faturamento/EditFaturamentoDialog";
import ImportFaturamentoDialog from "@/components/faturamento/ImportFaturamentoDialog";
import FaturamentoTable from "@/components/faturamento/FaturamentoTable";
import { fmtCurrency, fmtMeters, fmtPrice, mesLabel } from "@/lib/format";
import "@/components/faturamento/faturamento-teal.css";

export default function Faturamento() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeses, setSelectedMeses] = useState([new Date().getMonth() + 1]);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [viewMode, setViewMode] = useState("dashboard");
  const [presenting, setPresenting] = useState(false);
  const rootRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);

  const startPresentation = async () => {
    setViewMode("dashboard");
    setPresenting(true);
    try {
      await rootRef.current?.requestFullscreen?.();
    } catch (e) {
      /* fullscreen pode ser bloqueado — ainda assim entra no modo apresentação */
    }
  };

  const exitPresentation = () => {
    setPresenting(false);
    if (document.fullscreenElement) document.exitFullscreen?.();
  };

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useLayoutEffect(() => {
    if (!presenting) {
      setScale(1);
      return;
    }
    const compute = () => {
      const el = contentRef.current;
      if (!el) return;
      const vh = window.innerHeight;
      const ch = el.scrollHeight;
      if (ch > 0) setScale(Math.min(1.6, vh / ch));
    };
    compute();
    const t = setTimeout(compute, 50);
    window.addEventListener("resize", compute);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", compute);
    };
  }, [presenting, viewMode, selectedMeses, records]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await db.entities.Faturamento.list("mes");
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    await db.entities.Faturamento.deleteMany({});
    await load();
  };

  useEffect(() => {
    load();
  }, []);

  const selectedRecords = useMemo(
    () => records.filter((r) => selectedMeses.includes(r.mes)),
    [records, selectedMeses]
  );

  const agg = useMemo(() => {
    if (selectedRecords.length === 0) return null;
    const sum = (fn) => selectedRecords.reduce((s, r) => s + (fn(r) || 0), 0);
    const sg = sum((r) => r.faturamento_smart_group);
    const msg = sum((r) => r.metros_smart_group);
    const stk = sum((r) => r.faturamento_stk);
    const mstk = sum((r) => r.metros_stk);
    const totalFat = sg + stk;
    const totalMetros = msg + mstk;
    const fat2025 = sum((r) => r.faturamento_2025);
    const previsto = sum((r) => r.faturamento_previsto_2026);
    const metros2025 = sum((r) => r.metros_2025);
    const orcadoAvg =
      selectedRecords.reduce((s, r) => s + (r.preco_medio_orcado || 0), 0) / selectedRecords.length;
    const realizadoAvg = totalMetros ? totalFat / totalMetros : 0;
    const ano = selectedRecords[0]?.ano;
    const dif2025Valor = totalFat - fat2025;
    const dif2025Pct = fat2025 ? (dif2025Valor / fat2025) * 100 : 0;
    const difPrevistoValor = totalFat - previsto;
    const difPrevistoPct = previsto ? (difPrevistoValor / previsto) * 100 : 0;
    const metrosOrcado = sum((r) => r.preco_medio_orcado ? (r.faturamento_previsto_2026 || 0) / r.preco_medio_orcado : 0);
    const difMetrosValor = totalMetros - metrosOrcado;
    const difMetrosPct = metrosOrcado ? (difMetrosValor / metrosOrcado) * 100 : 0;
    return {
      sg, msg, stk, mstk, totalFat, totalMetros, fat2025, previsto,
      preco_medio_orcado: orcadoAvg,
      preco_medio_realizado: realizadoAvg,
      ano, count: selectedRecords.length,
      dif2025Valor, dif2025Pct, difPrevistoValor, difPrevistoPct,
      metrosOrcado, difMetrosValor, difMetrosPct,
      precoSG: msg ? sg / msg : 0,
      precoSTK: mstk ? stk / mstk : 0,
      precoGeral: totalMetros ? totalFat / totalMetros : 0,
    };
  }, [selectedRecords]);

  const mesesLabel = useMemo(
    () => (selectedMeses.length === 0 ? "—" : selectedMeses.map((m) => mesLabel(m)).join(", ")),
    [selectedMeses]
  );

  if (loading) {
    return (
      <div className="ft-page">
        <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#00798c] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!agg) {
    return (
      <div className="ft-page">
        <div className="ft-shell">
          <header className="ft-hero">
            <div className="ft-hero-content">
              <div className="ft-hero-brand">
                <div className="ft-hero-mark"><Wallet className="w-4 h-4" /></div>
                <div>
                  <h1>Faturamento</h1>
                  <p>Dashboard gerencial — {mesesLabel}</p>
                </div>
              </div>
              <div className="ft-actions">
                <button className="ft-btn" onClick={() => setImportOpen(true)}>
                  <Upload className="w-3.5 h-3.5" /> Importar
                </button>
              </div>
            </div>
          </header>
          <div className="ft-empty">
            <p className="text-slate-600 text-sm">Nenhum dado encontrado para {mesesLabel}.</p>
            <MonthFilter selectedMeses={selectedMeses} onSelect={setSelectedMeses} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-rose-600 hover:bg-rose-50">
                  <Trash2 className="w-4 h-4" /> Limpar dados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar todos os dados?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá apagar todos os registros de faturamento. Não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll} className="bg-rose-600 hover:bg-rose-700">
                    Apagar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <ImportFaturamentoDialog open={importOpen} onOpenChange={setImportOpen} onImported={load} />
      </div>
    );
  }

  const kpiCards = [
    { title: "Fat. Smart Group", value: fmtCurrency(agg.sg), icon: DollarSign, bar: 76 },
    { title: "Fat. STK", value: fmtCurrency(agg.stk), icon: DollarSign, bar: 62 },
  ];

  return (
    <div ref={rootRef} className={`ft-page ${presenting ? "ft-presenting" : ""}`}>
      <div
        ref={contentRef}
        className="ft-shell"
        style={presenting ? { transform: `scale(${scale})`, transformOrigin: "top center" } : undefined}
      >
        {/* Hero */}
        <header className="ft-hero">
          <div className="ft-hero-content">
            <div className="ft-hero-brand">
              <div className="ft-hero-mark"><Wallet className="w-4 h-4" /></div>
              <div>
                <h1>Faturamento</h1>
                <p>Dashboard gerencial — {mesesLabel} {agg.ano}</p>
              </div>
            </div>
            {!presenting && (
              <div className="ft-actions">
                <div className="ft-toggle">
                  <button className={`ft-btn ${viewMode === "dashboard" ? "ft-active" : ""}`} onClick={() => setViewMode("dashboard")}>
                    <LayoutDashboard className="w-3.5 h-3.5" />
                  </button>
                  <button className={`ft-btn ${viewMode === "tabela" ? "ft-active" : ""}`} onClick={() => setViewMode("tabela")}>
                    <Table className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button className="ft-btn" onClick={() => setImportOpen(true)}>
                  <Upload className="w-3.5 h-3.5" /> Importar
                </button>
                {viewMode === "dashboard" && (
                  <>
                    <MonthFilter selectedMeses={selectedMeses} onSelect={setSelectedMeses} />
                    {selectedMeses.length === 1 && (
                      <button className="ft-btn" onClick={() => setEditOpen(true)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
                <button className="ft-btn ft-primary" onClick={startPresentation}>
                  <Presentation className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {presenting && (
              <div className="ft-actions">
                <MonthFilter selectedMeses={selectedMeses} onSelect={setSelectedMeses} />
                <button className="ft-btn" onClick={exitPresentation}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </header>

        {viewMode === "tabela" ? (
          <FaturamentoTable records={records} onSaved={load} />
        ) : (
          <>
            {/* KPIs */}
            <section className="ft-section">
              <div className="ft-section-head">
                <span className="ft-mark"><BarChart3 /></span>
                <h2>Indicadores</h2>
              </div>
              <div className="ft-kpis">
                {kpiCards.map((k, i) => (
                  <div key={i} className="ft-kpi">
                    <div className="ft-kpi-top">
                      <span>{k.title}</span>
                      <span className="ft-kpi-icon"><k.icon /></span>
                    </div>
                    <strong>{k.value}</strong>
                    <div className="ft-bar"><i style={{ "--w": `${k.bar}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            {/* Main grid: Análise + Comparativo (left) | Pyramids (right) */}
            <div className="ft-main-grid">
              <div className="ft-left-col">
                {/* Análise de Faturamento */}
                <section className="ft-section">
                  <div className="ft-section-head">
                    <span className="ft-mark"><BarChart3 /></span>
                    <h2>Análise de Faturamento</h2>
                  </div>
                  <div className="ft-analysis">
                    <div className="ft-unit">
                      <div className="ft-unit-top">
                        <span className="ft-dot" />
                        <strong>SMART GROUP</strong>
                      </div>
                      <div className="ft-metric"><span>Metros</span><b>{fmtMeters(agg.msg)}</b></div>
                      <div className="ft-metric"><span>Valor</span><b>{fmtCurrency(agg.sg)}</b></div>
                      <div className="ft-metric"><span>Preço Médio</span><b>{fmtPrice(agg.precoSG)}</b></div>
                    </div>
                    <div className="ft-unit">
                      <div className="ft-unit-top">
                        <span className="ft-dot" />
                        <strong>STK</strong>
                      </div>
                      <div className="ft-metric"><span>Metros</span><b>{fmtMeters(agg.mstk)}</b></div>
                      <div className="ft-metric"><span>Valor</span><b>{fmtCurrency(agg.stk)}</b></div>
                      <div className="ft-metric"><span>Preço Médio</span><b>{fmtPrice(agg.precoSTK)}</b></div>
                    </div>
                  </div>
                </section>

                {/* Comparativo */}
                <section className="ft-section">
                  <div className="ft-section-head">
                    <span className="ft-mark"><TrendingUp /></span>
                    <h2>Comparativo</h2>
                  </div>
                  <div className="ft-compare">
                    <div className="ft-compare-card">
                      <label>2025</label>
                      <b>{fmtCurrency(agg.fat2025)}</b>
                    </div>
                    <div className="ft-compare-card">
                      <label>2026</label>
                      <b>{fmtCurrency(agg.totalFat)}</b>
                    </div>
                    <div className="ft-compare-card">
                      <label>Diferença</label>
                      <b><span className="ft-sign">{agg.dif2025Valor >= 0 ? "+" : "−"}</span>{fmtCurrency(Math.abs(agg.dif2025Valor))}</b>
                    </div>
                    <div className="ft-compare-card">
                      <label>Variação %</label>
                      <b><span className="ft-sign">{agg.dif2025Pct >= 0 ? "+" : "−"}</span>{agg.dif2025Pct.toFixed(2).replace(".", ",")}%</b>
                    </div>
                  </div>
                </section>
              </div>

              {/* Previsão vs Realizado */}
              <section className="ft-section ft-forecast">
                <div className="ft-section-head">
                  <span className="ft-mark"><Calculator /></span>
                  <h2>Previsão vs Realizado</h2>
                </div>
                <div className="ft-badges">
                  <div className="ft-badge">
                    {agg.difPrevistoValor >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <strong>Dif. Valor</strong>
                    {agg.difPrevistoValor >= 0 ? "+" : ""}{fmtCurrency(agg.difPrevistoValor)}
                  </div>
                  <div className="ft-badge">
                    {agg.difPrevistoPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <strong>Variação %</strong>
                    {agg.difPrevistoPct >= 0 ? "+" : ""}{agg.difPrevistoPct.toFixed(2).replace(".", ",")}%
                  </div>
                  <div className="ft-badge">
                    {agg.difMetrosValor >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <strong>Dif. Metros</strong>
                    {agg.difMetrosValor >= 0 ? "+" : ""}{fmtMeters(agg.difMetrosValor)}
                  </div>
                  <div className="ft-badge">
                    {agg.difMetrosPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <strong>Var. Metros %</strong>
                    {agg.difMetrosPct >= 0 ? "+" : ""}{agg.difMetrosPct.toFixed(2).replace(".", ",")}%
                  </div>
                </div>
                <div className="ft-stackcols">
                  <div className="ft-stackcol">
                    <h3>Previsão</h3>
                    <p>Orçado 2026</p>
                    <div className="ft-stackcards">
                      <div className="ft-stackcard ft-sc-blue">
                        <span className="ft-sc-icon"><DollarSign className="w-3.5 h-3.5" /></span>
                        <div className="ft-sc-body"><p>Preço Médio</p><b>{fmtPrice(agg.preco_medio_orcado)}</b></div>
                      </div>
                      <div className="ft-stackcard ft-sc-indigo">
                        <span className="ft-sc-icon"><Ruler className="w-3.5 h-3.5" /></span>
                        <div className="ft-sc-body"><p>Metros</p><b>{fmtMeters(agg.metrosOrcado)}</b></div>
                      </div>
                      <div className="ft-stackcard ft-sc-violet">
                        <span className="ft-sc-icon"><Wallet className="w-3.5 h-3.5" /></span>
                        <div className="ft-sc-body"><p>Valor Total</p><b>{fmtCurrency(agg.previsto)}</b></div>
                      </div>
                    </div>
                  </div>
                  <div className="ft-stackcol">
                    <h3>Realizado</h3>
                    <p>2026</p>
                    <div className="ft-stackcards">
                      <div className="ft-stackcard ft-sc-amber">
                        <span className="ft-sc-icon"><DollarSign className="w-3.5 h-3.5" /></span>
                        <div className="ft-sc-body"><p>Preço Médio</p><b>{fmtPrice(agg.preco_medio_realizado)}</b></div>
                      </div>
                      <div className="ft-stackcard ft-sc-orange">
                        <span className="ft-sc-icon"><Ruler className="w-3.5 h-3.5" /></span>
                        <div className="ft-sc-body"><p>Metros</p><b>{fmtMeters(agg.totalMetros)}</b></div>
                      </div>
                      <div className="ft-stackcard ft-sc-red">
                        <span className="ft-sc-icon"><Wallet className="w-3.5 h-3.5" /></span>
                        <div className="ft-sc-body"><p>Valor Total</p><b>{fmtCurrency(agg.totalFat)}</b></div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>

      {selectedMeses.length === 1 && (
        <EditFaturamentoDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          record={selectedRecords[0]}
          onSaved={load}
        />
      )}

      <ImportFaturamentoDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={load}
      />
    </div>
  );
}