import React from "react";
import { motion } from "framer-motion";
import RadialGauge from "./RadialGauge";

const TEAL = "#008785";
const CARD_BG = "#F8F9FA";

function fmtNum(n) {
  return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(n) {
  return (n || 0).toFixed(1).replace(".", ",") + "%";
}

export default function CarteiraCard({ data, index = 0 }) {
  if (!data) return null;

  const total = data.total_carteira || 0;
  const pct = (v) => (total > 0 ? (v / total) * 100 : 0);

  const rows = [
    { label: "Total Carteira", value: data.total_carteira, isTotal: true },
    { label: "PEDIDO BEIRA RIO", value: data.pedido_beira_rio },
    { label: "PEDIDOS OUTROS", value: data.pedidos_outros },
    { label: "ESTOQUE BEIRA RIO", value: data.estoque_beira_rio },
    { label: "ESTOQUE STK", value: data.estoque_stk },
    { label: "ESTOQUE OUTROS", value: data.estoque_outros },
  ];

  const pedidosTotal = (data.pedido_beira_rio || 0) + (data.pedidos_outros || 0);
  const estoqueTotal = (data.estoque_beira_rio || 0) + (data.estoque_stk || 0) + (data.estoque_outros || 0);
  const baseRelacao = pedidosTotal + estoqueTotal;
  const pedidosPct = baseRelacao > 0 ? (pedidosTotal / baseRelacao) * 100 : 0;
  const estoquePct = baseRelacao > 0 ? (estoqueTotal / baseRelacao) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="rounded-2xl shadow-lg overflow-hidden border border-slate-300 h-full flex flex-col"
      style={{ background: CARD_BG }}
    >
      <div className="px-5 py-3 text-white" style={{ background: TEAL }}>
        <h3 className="text-lg font-bold tracking-wide">{data.semana_label}</h3>
      </div>

      <div className="flex flex-col sm:flex-row flex-1">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-300" style={{ background: CARD_BG }}>
              <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">Pedido</th>
              <th className="px-3 py-2 text-right text-sm font-semibold whitespace-nowrap text-slate-600">Entrada</th>
              <th className="px-2 py-2 text-right text-sm font-semibold w-12 text-slate-600">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className={`border-b border-slate-200 ${r.isTotal ? "font-bold" : ""}`}
                  style={{ background: i % 2 === 0 ? CARD_BG : "#fff" }}
                >
                  <td className="px-4 py-3 text-slate-900 font-semibold text-sm">{r.label}</td>
                  <td className={`px-3 py-3 text-right tabular-nums text-slate-900 ${r.isTotal ? "text-2xl font-extrabold" : "text-xl font-bold"}`}>{fmtNum(r.value)}</td>
                  <td className="px-2 py-3 text-right tabular-nums text-slate-700 text-sm font-semibold">
                    {r.isTotal ? "100%" : fmtPct(pct(r.value))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-row sm:flex-col items-center justify-center gap-6 sm:gap-4 p-4 sm:border-l border-slate-200 bg-white sm:min-w-[220px]">
          <RadialGauge label="Pedidos" value={pedidosPct} max={100} index={index * 2} subValue={pedidosTotal} />
          <RadialGauge label="Estoques" value={estoquePct} max={100} index={index * 2 + 1} subValue={estoqueTotal} />
        </div>
      </div>
    </motion.div>
  );
}