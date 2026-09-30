const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fuel, Upload, ArrowUpRight, ArrowDownRight, Percent, TrendingUp, Calculator, Gauge, Weight, DollarSign } from "lucide-react";
import MonthFilter from "@/components/faturamento/MonthFilter";
import ImportCombustivelDialog from "@/components/combustivel/ImportCombustivelDialog";
import { fmtCurrency, fmtPrice, mesLabel } from "@/lib/format";
import LightHeader from "@/components/ui/LightHeader";

function fmtKg(v) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
}

function fmtNum(v, dec = 3) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v || 0);
}

function MetricCard({ title, icon: Icon, accent, columns, horizontal = false, borderClass = "" }) {
  const c = { icon: "text-slate-600" };
  return (
    <div className={`rounded-xl border p-3 bg-gradient-to-br from-white via-slate-50 to-slate-100 flex flex-col h-full ${borderClass || "border-slate-300 shadow-sm"}`}>
      <div className="flex flex-col items-center gap-1 mb-2.5 pb-2 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-100 -mx-3 -mt-3 px-3 pt-2.5 rounded-t-xl">
        <Icon className={`w-6 h-6 ${c.icon}`} />
        <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide text-center leading-tight">{title}</h3>
      </div>
      <div className={`${horizontal ? "grid grid-cols-2 sm:grid-cols-4 gap-2 items-center flex-1" : "flex flex-col gap-2 flex-1"}`}>
        {columns.map((col, i) => (
          <div key={i} className="text-center rounded-lg bg-slate-50 border border-slate-300 py-1">
            <p className="text-[10px] text-slate-700 uppercase font-semibold mb-1">{col.label}</p>
            {col.dif ? (
              <div className="flex flex-col items-center gap-0.5">
                <p className={`text-base font-bold tabular-nums ${col.value >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {col.value >= 0 ? "+" : "-"}{col.isCurrency !== false ? fmtCurrency(Math.abs(col.value)) : fmtKg(Math.abs(col.value))}
                </p>
                <p className={`text-xs font-medium tabular-nums ${col.pct >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {col.pct >= 0 ? "+" : ""}{col.pct.toFixed(1).replace(".", ",")}%
                </p>
              </div>
            ) : (
              <p className={`text-base font-bold tabular-nums ${col.color || "text-slate-900"}`}>{col.value}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarBlock({ title, icon: Icon, rows, headerClass = "", borderClass = "" }) {
  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden bg-gradient-to-br from-white via-slate-50 to-slate-100 flex flex-col flex-1 ${borderClass || "border-slate-300"}`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 ${headerClass || "bg-slate-100"}`}>
        <Icon className="w-3.5 h-3.5 text-slate-800" />
        <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-2.5 space-y-1 flex flex-col justify-center flex-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-300">
            <div className="flex items-center gap-2">
              <row.icon className="w-3.5 h-3.5 text-slate-700" />
              <p className="text-[11px] text-slate-800 uppercase font-medium">{row.label}</p>
            </div>
            <p className={`text-sm font-bold tabular-nums ${row.color || "text-slate-900"}`}>{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CombustivelProducao() {
  const [records, setRecords] = useState([]);
  const [revisaoRecords, setRevisaoRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeses, setSelectedMeses] = useState([new Date().getMonth() + 1]);
  const [importOpen, setImportOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [data, rev] = await Promise.all([
        db.entities.CombustivelProducao.list("mes"),
        db.entities.Revisao.list("mes"),
      ]);
      setRecords(data);
      setRevisaoRecords(rev);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selectedRecords = useMemo(
    () => records.filter((r) => selectedMeses.includes(r.mes)),
    [records, selectedMeses]
  );

  const agg = useMemo(() => {
    if (selectedRecords.length === 0) return null;
    const sum = (fn) => selectedRecords.reduce((s, r) => s + (fn(r) || 0), 0);
    const valor2025 = sum((r) => r.valor_2025);
    const valor2026 = sum((r) => r.valor_2026);
    const kg2025 = sum((r) => r.kg_2025);
    const kg2026 = sum((r) => r.kg_2026);
    const valorOrcado = sum((r) => r.valor_orcado);
    const kgOrcado = sum((r) => r.kg_orcado);
    const recs2025 = selectedRecords.filter((r) => r.ano === 2025);
    const recs2026 = selectedRecords.filter((r) => r.ano === 2026);
    // Preço médio = coluna R (valor) / coluna T (kg) — conforme os meses selecionados
    const selValor2025 = recs2025.reduce((s, r) => s + (r.valor_2025 || 0), 0);
    const selValor2026 = recs2026.reduce((s, r) => s + (r.valor_2026 || 0), 0);
    const selKg2025 = recs2025.reduce((s, r) => s + (r.kg_2025 || 0), 0);
    const selKg2026 = recs2026.reduce((s, r) => s + (r.kg_2026 || 0), 0);
    const precoMedio2025 = selKg2025 ? selValor2025 / selKg2025 : 0;
    const precoMedio2026 = selKg2026 ? selValor2026 / selKg2026 : 0;

    // Metros produzidos importados da própria entidade (por ano)
    const metros1_2025 = recs2025.reduce((s, r) => s + (r.metros_produzidos || 0), 0);
    const metros1_2026 = recs2026.reduce((s, r) => s + (r.metros_produzidos || 0), 0);

    // Coluna E por ano
    const colE2025 = recs2025.reduce((s, r) => s + (r.col_e || 0), 0);
    const colE2026 = recs2026.reduce((s, r) => s + (r.col_e || 0), 0);

    const difValor = valor2026 - valor2025;
    const difValorPct = valor2025 ? (difValor / valor2025) * 100 : 0;
    const difKg = kg2026 - kg2025;
    const difKgPct = kg2025 ? (difKg / kg2025) * 100 : 0;

    const difOrcValor = valor2026 - valorOrcado;
    const difOrcValorPct = valorOrcado ? (difOrcValor / valorOrcado) * 100 : 0;
    const difOrcKg = kg2026 - kgOrcado;
    const difOrcKgPct = kgOrcado ? (difOrcKg / kgOrcado) * 100 : 0;

    const difPreco = precoMedio2026 - precoMedio2025;
    const difPrecoPct = precoMedio2025 ? (difPreco / precoMedio2025) * 100 : 0;

    // Custo por Metro Produzido = coluna R (valor) / coluna I (metros produzidos)
    const custoMetro2025 = metros1_2025 ? valor2025 / metros1_2025 : 0;
    const custoMetro2026 = metros1_2026 ? valor2026 / metros1_2026 : 0;

    // Custo por Metro 1° = coluna R (valor) / coluna E
    const custoMetro1_2025 = colE2025 ? valor2025 / colE2025 : 0;
    const custoMetro1_2026 = colE2026 ? valor2026 / colE2026 : 0;

    // Consumo por Metro 1° = coluna T (kg) / coluna E
    const consumoMetro1_2025 = colE2025 ? kg2025 / colE2025 : 0;
    const consumoMetro1_2026 = colE2026 ? kg2026 / colE2026 : 0;

    // KG por Metro Produzido = metros (I) / kg (T)
    const kgPorMetro2025 = kg2025 ? metros1_2025 / kg2025 : 0;
    const kgPorMetro2026 = kg2026 ? metros1_2026 / kg2026 : 0;

    const difCustoMetro = custoMetro2026 - custoMetro2025;
    const difCustoMetroPct = custoMetro2025 ? (difCustoMetro / custoMetro2025) * 100 : 0;
    const difKgPorMetro = kgPorMetro2026 - kgPorMetro2025;
    const difKgPorMetroPct = kgPorMetro2025 ? (difKgPorMetro / kgPorMetro2025) * 100 : 0;

    return {
      valor2025, valor2026, kg2025, kg2026, valorOrcado, kgOrcado,
      precoMedio2025, precoMedio2026,
      difValor, difValorPct, difKg, difKgPct,
      difOrcValor, difOrcValorPct, difOrcKg, difOrcKgPct,
      difPreco, difPrecoPct,
      custoMetro2025, custoMetro2026,
      custoMetro1_2025, custoMetro1_2026,
      consumoMetro1_2025, consumoMetro1_2026,
      kgPorMetro2025, kgPorMetro2026,
      difCustoMetro, difCustoMetroPct,
      difKgPorMetro, difKgPorMetroPct,
      metros1_2025, metros1_2026,
      count: selectedRecords.length,
    };
  }, [selectedRecords, revisaoRecords, selectedMeses, records]);

  const mesesLabel = useMemo(
    () => selectedMeses.length === 0 ? "—" : selectedMeses.map((m) => mesLabel(m)).join(", "),
    [selectedMeses]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!agg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 flex flex-col items-center justify-center gap-6 p-6">
        <p className="text-slate-600">Nenhum dado encontrado para {mesesLabel}.</p>
        <div className="flex items-center gap-3">
          <MonthFilter selectedMeses={selectedMeses} onSelect={setSelectedMeses} />
          <Button onClick={() => setImportOpen(true)} variant="outline" size="sm" className="gap-1.5 bg-white text-slate-800 hover:bg-white">
            <Upload className="w-4 h-4" /> Importar
          </Button>
        </div>
        <ImportCombustivelDialog open={importOpen} onOpenChange={setImportOpen} onImported={load} />
      </div>
    );
  }

  const cards = {
    combValor: {
      title: "Combustível Produção (Valores)",
      icon: DollarSign,
      accent: "blue",
      borderClass: "border-[#1e3a8a] border-2 shadow-lg shadow-blue-900/20",
      columns: [
        { label: "Valor 2025", value: fmtCurrency(agg.valor2025) },
        { label: "Valor 2026", value: fmtCurrency(agg.valor2026) },
        { label: "Diferença R$", dif: true, value: agg.difValor, pct: agg.difValorPct },
        { label: "Variação", value: `${agg.difValorPct >= 0 ? "+" : ""}${agg.difValorPct.toFixed(1).replace(".", ",")}%`, color: agg.difValorPct >= 0 ? "text-rose-600" : "text-emerald-600" },
      ],
    },
    orcRealValor: {
      title: "Orçado x Realizado (Valores)",
      icon: TrendingUp,
      accent: "green",
      borderClass: "border-[#1e3a8a] border-2 shadow-lg shadow-blue-900/20",
      columns: [
        { label: "Valor Orçado", value: fmtCurrency(agg.valorOrcado) },
        { label: "Valor Realizado", value: fmtCurrency(agg.valor2026) },
        { label: "Diferença R$", dif: true, value: agg.difOrcValor, pct: agg.difOrcValorPct },
        { label: "Variação", value: `${agg.difOrcValorPct >= 0 ? "+" : ""}${agg.difOrcValorPct.toFixed(1).replace(".", ",")}%`, color: agg.difOrcValorPct >= 0 ? "text-rose-600" : "text-emerald-600" },
      ],
    },
    combKg: {
      title: "Combustível Produção (KG)",
      icon: Weight,
      accent: "blue",
      borderClass: "border-[#1e3a8a] border-2 shadow-lg shadow-blue-900/20",
      columns: [
        { label: "KG 25", value: fmtKg(agg.kg2025) },
        { label: "KG 26", value: fmtKg(agg.kg2026) },
        { label: "Dif. KG", dif: true, value: agg.difKg, pct: agg.difKgPct, isCurrency: false },
        { label: "Variação", value: `${agg.difKgPct >= 0 ? "+" : ""}${agg.difKgPct.toFixed(1).replace(".", ",")}%`, color: agg.difKgPct >= 0 ? "text-rose-600" : "text-emerald-600" },
      ],
    },
    orcRealKg: {
      title: "Orçado x Realizado (KG)",
      icon: Gauge,
      accent: "green",
      borderClass: "border-[#1e3a8a] border-2 shadow-lg shadow-blue-900/20",
      columns: [
        { label: "KG Orçado", value: fmtKg(agg.kgOrcado) },
        { label: "KG Realizado", value: fmtKg(agg.kg2026) },
        { label: "Dif. KG", dif: true, value: agg.difOrcKg, pct: agg.difOrcKgPct, isCurrency: false },
        { label: "Variação", value: `${agg.difOrcKgPct >= 0 ? "+" : ""}${agg.difOrcKgPct.toFixed(1).replace(".", ",")}%`, color: agg.difOrcKgPct >= 0 ? "text-rose-600" : "text-emerald-600" },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        {/* Header */}
        <LightHeader icon={Fuel} title="Combustível Produção" subtitle={`Dashboard gerencial — ${mesesLabel}`} className="mb-2 py-2.5 px-3" >
          <div className="flex items-center gap-3">
            <Button onClick={() => setImportOpen(true)} variant="outline" size="sm" className="gap-1.5 bg-white text-slate-800 hover:bg-slate-100">
              <Upload className="w-4 h-4" /> Importar
            </Button>
            <MonthFilter selectedMeses={selectedMeses} onSelect={setSelectedMeses} />
          </div>
        </LightHeader>

        {/* Layout principal: grid 4 cards | sidebar 3 blocos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          {/* Coluna esquerda: 4 cards altos + 2 cards de custo */}
          <div className="lg:col-span-2 flex flex-col gap-2.5 h-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <MetricCard {...cards.combValor} index={0} />
              <MetricCard {...cards.orcRealValor} index={1} />
              <MetricCard {...cards.combKg} index={2} />
              <MetricCard {...cards.orcRealKg} index={3} />
            </div>
            <div className="flex-1">
              <MetricCard
                title="Custo por Metro Produzido"
                icon={DollarSign}
                accent="blue"
                horizontal
                borderClass="border-[#1e3a8a] border-2 shadow-lg shadow-blue-900/20"
                columns={[
                  { label: "Custo/M 2025", value: fmtPrice(agg.custoMetro2025) },
                  { label: "Custo/M 2026", value: fmtPrice(agg.custoMetro2026) },
                  { label: "Diferença", dif: true, value: agg.difCustoMetro, pct: agg.difCustoMetroPct },
                  { label: "Variação", value: `${agg.difCustoMetroPct >= 0 ? "+" : ""}${agg.difCustoMetroPct.toFixed(1).replace(".", ",")}%`, color: agg.difCustoMetroPct >= 0 ? "text-rose-600" : "text-emerald-600" },
                ]}
              />
            </div>
          </div>

          {/* Coluna direita: 3 blocos verticais */}
          <div className="flex flex-col gap-2.5 h-full">
            <SidebarBlock
              title="Preço Médio"
              icon={Calculator}
              headerClass="bg-gradient-to-r from-blue-50 to-slate-100"
              borderClass="border-[#1e3a8a] border-2 shadow-lg shadow-blue-900/20"
              rows={[
                { label: "Preço Médio 2025", value: fmtPrice(agg.precoMedio2025), icon: DollarSign },
                { label: "Preço Médio 2026", value: fmtPrice(agg.precoMedio2026), icon: DollarSign },
                { label: "Diferença", value: `${agg.difPreco >= 0 ? "+" : ""}${fmtPrice(agg.difPreco)}`, icon: TrendingUp, color: agg.difPreco >= 0 ? "text-rose-600" : "text-emerald-600" },
                { label: "Variação", value: `${agg.difPrecoPct >= 0 ? "+" : ""}${agg.difPrecoPct.toFixed(2).replace(".", ",")}%`, icon: Percent, color: agg.difPrecoPct >= 0 ? "text-rose-600" : "text-emerald-600" },
              ]}
            />
            <SidebarBlock
              title="Custo por Metro 1°"
              icon={DollarSign}
              headerClass="bg-gradient-to-r from-blue-50 to-slate-100"
              borderClass="border-[#1e3a8a] border-2 shadow-lg shadow-blue-900/20"
              rows={[
                { label: "Custo/Metro 1° 2025", value: fmtPrice(agg.custoMetro1_2025), icon: DollarSign },
                { label: "Custo/Metro 1° 2026", value: fmtPrice(agg.custoMetro1_2026), icon: DollarSign },
              ]}
            />
            <SidebarBlock
              title="Consumo por Metro 1°"
              icon={Fuel}
              headerClass="bg-gradient-to-r from-blue-50 to-slate-100"
              borderClass="border-[#1e3a8a] border-2 shadow-lg shadow-blue-900/20"
              rows={[
                { label: "Consumo/Metro 1° 2025", value: fmtNum(agg.consumoMetro1_2025), icon: Gauge },
                { label: "Consumo/Metro 1° 2026", value: fmtNum(agg.consumoMetro1_2026), icon: Gauge },
              ]}
            />
          </div>
        </div>
      </div>

      <ImportCombustivelDialog open={importOpen} onOpenChange={setImportOpen} onImported={load} />
    </div>
  );
}