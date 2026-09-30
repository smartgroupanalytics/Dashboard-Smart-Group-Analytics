import React, { useMemo } from "react";
import { ShoppingCart, Package, Boxes, TrendingUp, ShoppingBag, Calendar } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const COLORS = {
  VENDA: "#0ea5e9",
  BENEFICIAMENTO: "#f59e0b",
  ESTOQUE: "#10b981",
};

const COLORS_LIGHT = {
  VENDA: "#e0f2fe",
  BENEFICIAMENTO: "#fef3c7",
  ESTOQUE: "#d1fae5",
};

function fmtNum(n) {
  return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtPct(n) {
  return (n || 0).toFixed(1).replace(".", ",") + "%";
}
function fmtDate(d) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}`;
}

// Versão de impressão do relatório de Pedidos — Revisão (sem dialog, para captura em PDF).
export default function PedidosRevisaoPrint({ records = [], periodLabel = "—" }) {
  const dayData = useMemo(() => {
    const map = {};
    for (const r of records) {
      if (!r.data) continue;
      if (!map[r.data]) map[r.data] = { data: r.data, VENDA: 0, BENEFICIAMENTO: 0, ESTOQUE: 0, total: 0 };
      const cls = ["VENDA", "BENEFICIAMENTO", "ESTOQUE"].includes(r.classificacao) ? r.classificacao : "ESTOQUE";
      map[r.data][cls] += r.qtd_revisada || 0;
      map[r.data].total += r.qtd_revisada || 0;
    }
    return Object.values(map).sort((a, b) => a.data.localeCompare(b.data));
  }, [records]);

  const totals = useMemo(() => {
    const t = { VENDA: 0, BENEFICIAMENTO: 0, ESTOQUE: 0, total: 0 };
    for (const d of dayData) {
      t.VENDA += d.VENDA;
      t.BENEFICIAMENTO += d.BENEFICIAMENTO;
      t.ESTOQUE += d.ESTOQUE;
      t.total += d.total;
    }
    return t;
  }, [dayData]);

  const opStats = useMemo(() => {
    const opsPorCategoria = { VENDA: new Set(), BENEFICIAMENTO: new Set(), ESTOQUE: new Set() };
    for (const r of records) {
      if (!r.op) continue;
      const cls = ["VENDA", "BENEFICIAMENTO", "ESTOQUE"].includes(r.classificacao) ? r.classificacao : "ESTOQUE";
      opsPorCategoria[cls].add(r.op);
    }
    return {
      VENDA: { numOps: opsPorCategoria.VENDA.size, media: opsPorCategoria.VENDA.size ? totals.VENDA / opsPorCategoria.VENDA.size : 0 },
      BENEFICIAMENTO: { numOps: opsPorCategoria.BENEFICIAMENTO.size, media: opsPorCategoria.BENEFICIAMENTO.size ? totals.BENEFICIAMENTO / opsPorCategoria.BENEFICIAMENTO.size : 0 },
      ESTOQUE: { numOps: opsPorCategoria.ESTOQUE.size, media: opsPorCategoria.ESTOQUE.size ? totals.ESTOQUE / opsPorCategoria.ESTOQUE.size : 0 },
    };
  }, [records, totals]);

  const totalOps = opStats.VENDA.numOps + opStats.BENEFICIAMENTO.numOps + opStats.ESTOQUE.numOps;

  return (
    <div className="pedidos-revisao-print-root bg-white" style={{ padding: "24px 32px" }}>
      {/* Cabeçalho de impressão */}
      <div style={{ marginBottom: "16px", borderBottom: "2px solid #0f172a", paddingBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #06b6d4, #0891b2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShoppingBag style={{ width: 20, height: 20, color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>Pedidos — Revisão</h1>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
              <Calendar style={{ width: 12, height: 12 }} /> {periodLabel} · {dayData.length} dia(s) · {totalOps} OP(s)
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px" }}>
        {[
          { label: "Venda", value: totals.VENDA, pct: totals.total ? (totals.VENDA / totals.total) * 100 : 0, icon: ShoppingCart, color: COLORS.VENDA, bg: COLORS_LIGHT.VENDA },
          { label: "Beneficiamento", value: totals.BENEFICIAMENTO, pct: totals.total ? (totals.BENEFICIAMENTO / totals.total) * 100 : 0, icon: Package, color: COLORS.BENEFICIAMENTO, bg: COLORS_LIGHT.BENEFICIAMENTO },
          { label: "Estoque", value: totals.ESTOQUE, pct: totals.total ? (totals.ESTOQUE / totals.total) * 100 : 0, icon: Boxes, color: COLORS.ESTOQUE, bg: COLORS_LIGHT.ESTOQUE },
        ].map((c) => (
          <div key={c.label} style={{ position: "relative", overflow: "hidden", borderRadius: "16px", border: "1px solid #e2e8f0", background: "#fff", padding: "18px" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, borderRadius: "50%", opacity: 0.4, background: c.bg }} />
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", margin: 0 }}>{c.label}</p>
                <p style={{ fontSize: "28px", fontWeight: 800, margin: "8px 0 0", color: c.color }}>
                  {fmtNum(c.value)} <span style={{ fontSize: "14px", fontWeight: 700, color: "#94a3b8" }}>m</span>
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                  <div style={{ flex: 1, height: "8px", borderRadius: "99px", background: "#f1f5f9", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: "99px", background: c.color, width: `${c.pct}%` }} />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: c.color }}>{fmtPct(c.pct)}</span>
                </div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", background: c.bg }}>
                <c.icon style={{ width: 20, height: 20, color: c.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos de rosca + média por OP */}
      <div style={{ borderRadius: "16px", border: "1px solid #e2e8f0", background: "#fff", padding: "18px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <TrendingUp style={{ width: 16, height: 16, color: "#475569" }} />
          <h3 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#334155", margin: 0 }}>Distribuição & Média por OP</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {[
            { key: "VENDA", label: "Venda", value: totals.VENDA, pct: totals.total ? (totals.VENDA / totals.total) * 100 : 0, color: COLORS.VENDA, bg: COLORS_LIGHT.VENDA, icon: ShoppingCart },
            { key: "BENEFICIAMENTO", label: "Beneficiamento", value: totals.BENEFICIAMENTO, pct: totals.total ? (totals.BENEFICIAMENTO / totals.total) * 100 : 0, color: COLORS.BENEFICIAMENTO, bg: COLORS_LIGHT.BENEFICIAMENTO, icon: Package },
            { key: "ESTOQUE", label: "Estoque", value: totals.ESTOQUE, pct: totals.total ? (totals.ESTOQUE / totals.total) * 100 : 0, color: COLORS.ESTOQUE, bg: COLORS_LIGHT.ESTOQUE, icon: Boxes },
          ].map((c) => {
            const restante = Math.max(0, 100 - c.pct);
            const stat = opStats[c.key];
            return (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: "12px", borderRadius: "12px", border: "1px solid #f1f5f9", background: "#f8fafc", padding: "14px" }}>
                <div style={{ position: "relative", width: 150, height: 150, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[{ name: c.label, value: c.pct }, { name: "Restante", value: restante }]}
                        cx="50%" cy="50%" innerRadius={50} outerRadius={72}
                        startAngle={90} endAngle={-270} paddingAngle={2}
                        dataKey="value" stroke="none"
                      >
                        <Cell fill={c.color} />
                        <Cell fill="#e2e8f0" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    <span style={{ fontSize: "20px", fontWeight: 800, color: c.color }}>{fmtPct(c.pct)}</span>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", marginTop: 2 }}>{fmtNum(c.value)} m</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", margin: "0 0 8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <c.icon style={{ width: 14, height: 14, color: c.color }} />
                    {c.label}
                  </p>
                  <div style={{ marginBottom: "8px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "#94a3b8", margin: 0 }}>Nº de OPs</p>
                    <p style={{ fontSize: "18px", fontWeight: 800, color: "#334155", margin: "2px 0 0" }}>{stat.numOps}</p>
                  </div>
                  <div style={{ paddingTop: "8px", borderTop: "1px solid #e2e8f0" }}>
                    <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "#94a3b8", margin: 0 }}>Média por OP</p>
                    <p style={{ fontSize: "18px", fontWeight: 800, color: c.color, margin: "2px 0 0" }}>
                      {fmtNum(stat.media)} <span style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8" }}>m</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabela por dia */}
      <div style={{ borderRadius: "16px", border: "1px solid #e2e8f0", background: "#fff", overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid #e2e8f0" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#334155", margin: 0 }}>Detalhamento por Dia</h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", color: "#475569" }}>
              <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, whiteSpace: "nowrap" }}>Data</th>
              <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: "#0369a1" }}>Venda (m)</th>
              <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: "#0284c7" }}>%</th>
              <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: "#b45309" }}>Benef. (m)</th>
              <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: "#d97706" }}>%</th>
              <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: "#047857" }}>Estoque (m)</th>
              <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: "#059669" }}>%</th>
              <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, whiteSpace: "nowrap", color: "#1e293b", background: "#f1f5f9" }}>Total (m)</th>
            </tr>
          </thead>
          <tbody>
            {dayData.map((d, i) => (
              <tr key={d.data} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={{ padding: "9px 14px", fontWeight: 600, color: "#334155", whiteSpace: "nowrap" }}>{fmtDate(d.data)}</td>
                <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 600, color: "#0369a1", whiteSpace: "nowrap" }}>{fmtNum(d.VENDA)}</td>
                <td style={{ padding: "9px 14px", textAlign: "right", color: "#0284c7", whiteSpace: "nowrap" }}>{fmtPct(d.total ? (d.VENDA / d.total) * 100 : 0)}</td>
                <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 600, color: "#b45309", whiteSpace: "nowrap" }}>{fmtNum(d.BENEFICIAMENTO)}</td>
                <td style={{ padding: "9px 14px", textAlign: "right", color: "#d97706", whiteSpace: "nowrap" }}>{fmtPct(d.total ? (d.BENEFICIAMENTO / d.total) * 100 : 0)}</td>
                <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 600, color: "#047857", whiteSpace: "nowrap" }}>{fmtNum(d.ESTOQUE)}</td>
                <td style={{ padding: "9px 14px", textAlign: "right", color: "#059669", whiteSpace: "nowrap" }}>{fmtPct(d.total ? (d.ESTOQUE / d.total) * 100 : 0)}</td>
                <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700, color: "#1e293b", background: "#f1f5f9", whiteSpace: "nowrap" }}>{fmtNum(d.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: "#f1f5f9", borderTop: "2px solid #cbd5e1" }}>
              <td style={{ padding: "11px 14px", fontWeight: 800, color: "#1e293b" }}>Total</td>
              <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 800, color: "#0369a1" }}>{fmtNum(totals.VENDA)}</td>
              <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700, color: "#0284c7" }}>{fmtPct(totals.total ? (totals.VENDA / totals.total) * 100 : 0)}</td>
              <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 800, color: "#b45309" }}>{fmtNum(totals.BENEFICIAMENTO)}</td>
              <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700, color: "#d97706" }}>{fmtPct(totals.total ? (totals.BENEFICIAMENTO / totals.total) * 100 : 0)}</td>
              <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 800, color: "#047857" }}>{fmtNum(totals.ESTOQUE)}</td>
              <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700, color: "#059669" }}>{fmtPct(totals.total ? (totals.ESTOQUE / totals.total) * 100 : 0)}</td>
              <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 800, color: "#0f172a", background: "#e2e8f0" }}>{fmtNum(totals.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}