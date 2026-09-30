const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from "react";

import { Upload, FileText, Calendar } from "lucide-react";
import DayFilter from "@/components/desempenho/DayFilter";
import ImportRecorrenciaDialog from "@/components/recorrencia/ImportRecorrenciaDialog";
import RecorrenciaSearch from "@/components/recorrencia/RecorrenciaSearch";
import RecorrenciaRelatorioGeralDialog from "@/components/recorrencia/RecorrenciaRelatorioGeralDialog";
import ProductCalendarDialog from "@/components/recorrencia/ProductCalendarDialog";

function pad(n) { return String(n).padStart(2, "0"); }
function todayIso() {
  const t = new Date();
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

const fmtNum = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const HERO_IMG = "./assets/producao-bg.svg";

export default function RecorrenciaPedidos() {
  const [records, setRecords] = useState([]);
  const [selectedDays, setSelectedDays] = useState(() => {
    try {
      const saved = localStorage.getItem("recorrencia_selected_days");
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch (e) {}
    return [todayIso()];
  });
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [relatorioOpen, setRelatorioOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [calendarProduct, setCalendarProduct] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem("recorrencia_selected_days", JSON.stringify(selectedDays));
    } catch (e) {}
  }, [selectedDays]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await db.entities.RecorrenciaPedido.list();
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => records.filter((r) => selectedDays.includes(r.data)),
    [records, selectedDays]
  );

  const buscaTrim = busca.trim().toLowerCase();
  const buscaAtiva = buscaTrim.length > 0;

  const filteredBusca = useMemo(
    () => buscaAtiva
      ? filtered.filter((r) => {
          const cod = (r.codigo_produto || "").toLowerCase();
          const desc = (r.descricao_produto || "").toLowerCase();
          return cod.includes(buscaTrim) || desc.includes(buscaTrim);
        })
      : filtered,
    [filtered, buscaTrim, buscaAtiva]
  );

  const porCodigo = useMemo(() => {
    const map = {};
    filteredBusca.forEach((r) => {
      const cod = r.codigo_produto;
      if (!cod) return;
      if (!map[cod]) map[cod] = { codigo: cod, descricao: r.descricao_produto || "", count: 0, metragem: 0, pedidos: [] };
      map[cod].count += 1;
      map[cod].metragem += r.metragem || 0;
      map[cod].pedidos.push({ data: r.data, op: r.num_op || "", metragem: r.metragem || 0 });
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredBusca]);

  const porMetragem = useMemo(
    () => [...porCodigo].sort((a, b) => b.count - a.count || b.metragem - a.metragem),
    [porCodigo]
  );

  const kpis = useMemo(() => {
    const total = porCodigo.length;
    const comRecorrencia = porCodigo.filter((p) => p.count > 1).length;
    const recorrenciaGeral = total > 0 ? Math.round((comRecorrencia / total) * 100) : 0;
    return { recorrenciaGeral, comRecorrencia, total };
  }, [porCodigo]);

  const maxCount = Math.max(1, ...porCodigo.map((d) => d.count || 0));
  const totalMetragem = porMetragem.reduce((s, d) => s + (d.metragem || 0), 0);
  const totalPedidos = porMetragem.reduce((s, d) => s + (d.count || 0), 0);
  const pctComRecorrencia = kpis.total > 0 ? Math.round((kpis.comRecorrencia / kpis.total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="recorrencia-aurora">
      <div className="ra-wash" />
      <div className="ra-content">
        {/* Hero com toolbar integrada */}
        <section className="ra-hero">
          <img src={HERO_IMG} alt="" />
          <div className="ra-hero-copy">
            <div className="ra-eyebrow">Análise em tempo real</div>
            <h1>Recorrência de Pedidos</h1>
            <p>Análise de recorrência de códigos de produto</p>
          </div>
          <div className="ra-hero-toolbar">
            <button className="ra-tool ra-primary" onClick={() => setImportOpen(true)}>
              <Upload className="w-3.5 h-3.5" /> Importar
            </button>
            <button className="ra-tool" onClick={() => setRelatorioOpen(true)}>
              <FileText className="w-3.5 h-3.5" /> Relatório Geral
            </button>
            <RecorrenciaSearch value={busca} onChange={setBusca} />
            <DayFilter selectedDays={selectedDays} onSelect={setSelectedDays} />
          </div>
        </section>

        {/* KPIs */}
        <section className="ra-section">
          <div className="ra-kpis">
            <article className="ra-card ra-kpi">
              <div className="ra-kpi-label">Recorrência Geral (%)</div>
              <div className="ra-kpi-value">{kpis.recorrenciaGeral}<span>%</span></div>
              <div className="ra-progress"><i style={{ width: `${kpis.recorrenciaGeral}%` }} /></div>
            </article>
            <article className="ra-card ra-kpi">
              <div className="ra-kpi-label">Produtos com Recorrência</div>
              <div className="ra-kpi-value">{kpis.comRecorrencia}</div>
              <div className="ra-progress ra-alt"><i style={{ width: `${pctComRecorrencia}%` }} /></div>
            </article>
          </div>
        </section>

        {/* Ranking + Tabela lado a lado */}
        <div className="ra-grid-2col">
          {/* Ranking */}
          <section className="ra-section">
            <div className="ra-section-head">
              <h2>Ranking Top 10 produtos</h2>
              <div className="ra-section-note">Desempenho por recorrência</div>
            </div>
            <div className="ra-card ra-ranking">
              {porCodigo.slice(0, 10).map((d, i) => (
                <div className="ra-rank-row" key={i}>
                  <div className="ra-rank-num">{String(i + 1).padStart(2, "0")}</div>
                  <div>
                    <div className="ra-rank-name">{d.descricao || d.codigo}</div>
                    <div className="ra-rank-code">{d.codigo}</div>
                  </div>
                  <div className="ra-rank-meter">
                    <i style={{ width: `${((d.count || 0) / maxCount) * 100}%` }} />
                  </div>
                  <div className="ra-rank-count">{d.count} pedido{d.count !== 1 ? "s" : ""}</div>
                </div>
              ))}
              {porCodigo.length === 0 && (
                <div className="ra-rank-empty">Nenhum dado para o período selecionado.</div>
              )}
            </div>
          </section>

          {/* Tabela */}
          <section className="ra-section">
            <div className="ra-section-head">
              <h2>Tabela de produtos</h2>
              <div className="ra-section-note">Visão consolidada</div>
            </div>
            <div className="ra-card ra-table-card">
              <div className="ra-table-wrap">
                <table className="ra-data">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descrição</th>
                      <th>Metragem</th>
                      <th>Pedido total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porMetragem.map((d, i) => (
                      <tr key={i}>
                        <td>
                          <span className="ra-code-cell">
                            {d.codigo}
                            <button className="ra-cal-btn" title="Ver datas" onClick={() => setCalendarProduct(d)}>
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        </td>
                        <td>{d.descricao || "—"}</td>
                        <td>{fmtNum(d.metragem)}</td>
                        <td>{d.count}</td>
                      </tr>
                    ))}
                    {porMetragem.length === 0 && (
                      <tr>
                        <td colSpan={4} className="ra-empty-row">Nenhum dado para o período selecionado.</td>
                      </tr>
                    )}
                  </tbody>
                  {porMetragem.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={2}>Total</td>
                        <td>{fmtNum(totalMetragem)}</td>
                        <td>{totalPedidos}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="ra-foot">
          <span><i className="ra-pulse" />Dados sincronizados</span>
          <span>Faturamento</span>
        </div>
      </div>

      <ImportRecorrenciaDialog open={importOpen} onOpenChange={setImportOpen} onImported={load} />
      <RecorrenciaRelatorioGeralDialog open={relatorioOpen} onOpenChange={setRelatorioOpen} data={porCodigo} />
      <ProductCalendarDialog product={calendarProduct} open={!!calendarProduct} onOpenChange={(o) => !o && setCalendarProduct(null)} />
    </div>
  );
}