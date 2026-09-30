import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Droplets, Palette, Hash } from "lucide-react";

function normalize(s) {
  return (s || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function isPigmentoOrPasta(desc) {
  const n = normalize(desc);
  return ["pigmento", "pasta", "corante", "tinta"].some((kw) => n.includes(kw));
}

function fmtNum(v) {
  return (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCurrency(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ConsumoColumn({ title, icon: Icon, items, theme, delay }) {
  const totals = useMemo(() => items.reduce((acc, i) => ({
    count: acc.count + i.count,
    qtde_prevista: acc.qtde_prevista + i.qtde_prevista,
    qtde_realizada: acc.qtde_realizada + i.qtde_realizada,
    valor_previsto: acc.valor_previsto + i.valor_previsto,
    valor_realizado: acc.valor_realizado + i.valor_realizado,
  }), { count: 0, qtde_prevista: 0, qtde_realizada: 0, valor_previsto: 0, valor_realizado: 0 }), [items]);

  const themeMap = {
    blue: {
      headerBg: "from-blue-600 to-blue-800",
      iconBg: "bg-blue-500/30",
      badge: "bg-blue-100 text-blue-700",
      cardBorder: "border-blue-50",
    },
    purple: {
      headerBg: "from-purple-600 to-purple-800",
      iconBg: "bg-purple-500/30",
      badge: "bg-purple-100 text-purple-700",
      cardBorder: "border-purple-50",
    },
  };
  const t = themeMap[theme] || themeMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex flex-col rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm"
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${t.headerBg} px-5 py-4 flex items-center gap-3`}>
        <div className={`w-10 h-10 rounded-xl ${t.iconBg} grid place-items-center shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-white font-extrabold text-base truncate">{title}</h3>
          <p className="text-white/70 text-xs">{items.length} insumo(s) • {totals.count} uso(s)</p>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto max-h-[560px]">
        {items.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            <Icon className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Nenhum insumo encontrado.
          </div>
        ) : items.map((item, i) => {
          const difValor = item.valor_realizado - item.valor_previsto;
          const difQtde = item.qtde_realizada - item.qtde_prevista;
          return (
            <div key={i} className={`px-5 py-3.5 border-b ${t.cardBorder} hover:bg-slate-50 transition-colors`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-sm font-bold text-slate-800 leading-tight flex-1">{item.descricao}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${t.badge} whitespace-nowrap shrink-0`}>
                  <Hash className="w-3 h-3" />
                  {item.count}x
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Qtde Prev:</span>
                  <span className="font-semibold text-slate-700 tabular-nums">{fmtNum(item.qtde_prevista)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Qtde Real:</span>
                  <span className={`font-semibold tabular-nums ${difQtde > 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmtNum(item.qtde_realizada)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor Prev:</span>
                  <span className="font-semibold text-slate-700 tabular-nums">{fmtCurrency(item.valor_previsto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor Real:</span>
                  <span className={`font-semibold tabular-nums ${difValor > 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmtCurrency(item.valor_realizado)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="px-5 py-3.5 bg-slate-50 border-t-2 border-slate-200">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Qtde Prev:</span>
            <span className="font-bold text-slate-800 tabular-nums">{fmtNum(totals.qtde_prevista)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Qtde Real:</span>
            <span className="font-bold text-slate-800 tabular-nums">{fmtNum(totals.qtde_realizada)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Valor Prev:</span>
            <span className="font-bold text-slate-800 tabular-nums">{fmtCurrency(totals.valor_previsto)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Valor Real:</span>
            <span className="font-bold text-slate-800 tabular-nums">{fmtCurrency(totals.valor_realizado)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ConsumoReport({ records }) {
  const { resinas, pigmentos } = useMemo(() => {
    const resinasMap = {};
    const pigmentosMap = {};

    records.forEach((r) => {
      const key = r.descricao_insumo || "(sem insumo)";
      if (key === "(sem insumo)") return;

      const isPig = isPigmentoOrPasta(key);
      const map = isPig ? pigmentosMap : resinasMap;

      if (!map[key]) map[key] = {
        descricao: key,
        count: 0,
        qtde_prevista: 0,
        qtde_realizada: 0,
        valor_previsto: 0,
        valor_realizado: 0,
      };

      const e = map[key];
      e.count += 1;
      e.qtde_prevista += r.qtde_prevista || 0;
      e.qtde_realizada += r.qtde_realizada || 0;
      e.valor_previsto += r.valor_previsto || 0;
      e.valor_realizado += r.valor_realizado || 0;
    });

    const toArr = (map) => Object.values(map)
      .filter((v) => v.qtde_realizada > 0 || v.valor_realizado > 0 || v.qtde_prevista > 0 || v.valor_previsto > 0)
      .sort((a, b) => b.count - a.count || b.valor_realizado - a.valor_realizado);

    return {
      resinas: toArr(resinasMap),
      pigmentos: toArr(pigmentosMap),
    };
  }, [records]);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <ConsumoColumn title="Resinas e Solventes" icon={Droplets} items={resinas} theme="blue" delay={0} />
      <ConsumoColumn title="Pigmentos e Pastas" icon={Palette} items={pigmentos} theme="purple" delay={0.1} />
    </div>
  );
}