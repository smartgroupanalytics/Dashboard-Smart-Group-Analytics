const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo, useRef } from "react";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ListChecks, UploadCloud, Gauge as GaugeIcon, Printer, Save, Loader2, LineChart as LineChartIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ImportProgramacaoDialog from "@/components/aderencia/ImportProgramacaoDialog";
import AderenciaChartDialog from "@/components/aderencia/AderenciaChartDialog";
import DayFilter from "@/components/desempenho/DayFilter";
import LightHeader from "@/components/ui/LightHeader";

const MACHINES = ["Gravadora", "JR", "Estampa 1", "Estampa 2", "GR", "Revisão"];

function sisterEstampa(maquina) {
  if (maquina === "Estampa 1") return "Estampa 2";
  if (maquina === "Estampa 2") return "Estampa 1";
  return null;
}

function isDoneStatus(status) {
  return status.startsWith("PRONTA") || status === "FEITO NA OUTRA ESTAMPA" || status === "FEITO NA OUTRA MÁQUINA" || status === "FEITO NA REVISÃO" || status === "FEITA NO DIA ANTERIOR";
}

// Escolhe o melhor registro de produção para uma OP dado o dia programado (entrega):
// prefere o dia exato, depois o mais recente antes da entrega, depois o mais cedo depois.
function pickBestProd(arr, entregaIso) {
  if (!arr || arr.length === 0) return null;
  if (!entregaIso) return arr[0];
  const exact = arr.find((p) => p.data === entregaIso);
  if (exact) return exact;
  const before = arr
    .filter((p) => p.data && p.data < entregaIso)
    .sort((a, b) => b.data.localeCompare(a.data))[0];
  if (before) return before;
  const after = arr
    .filter((p) => p.data && p.data > entregaIso)
    .sort((a, b) => a.data.localeCompare(b.data))[0];
  return after || null;
}

function normalizeMachine(maquina) {
  const upper = (maquina || "").trim().toUpperCase();
  if (upper === "GR2" || upper === "GR 2" || upper === "GR") return "GR";
  if (upper === "GRAVADORA") return "Gravadora";
  if (upper === "JR") return "JR";
  if (upper === "ESTAMPA 1") return "Estampa 1";
  if (upper === "ESTAMPA 2") return "Estampa 2";
  if (upper === "REVISAO" || upper === "REVISÃO") return "Revisão";
  return null;
}

function entregaToIso(entrega) {
  if (!entrega) return null;
  const parts = entrega.split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  return null;
}

export default function AderenciaProgramacao() {
  const [programacao, setProgramacao] = useState([]);
  const [producao, setProducao] = useState([]);
  const [revisaoOPs, setRevisaoOPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState(() => {
    try {
      const saved = localStorage.getItem("aderencia_selectedDays");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("aderencia_selectedDays", JSON.stringify(selectedDays));
    } catch {}
  }, [selectedDays]);

  const load = async () => {
    try {
      setLoading(true);
      const [prog, prod, rev] = await Promise.all([
        db.entities.ProgramacaoOP.list("-created_date", 5000),
        db.entities.ControleEficiencia.list("-created_date", 5000),
        db.entities.DetalheRevisaoOP.list("-created_date", 5000),
      ]);
      setProgramacao(prog);
      setProducao(prod);
      setRevisaoOPs(rev);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Registros de revisão (DetalheRevisaoOP) mapeados para o mesmo formato de produção
  const revisaoAsProducao = useMemo(() => {
    return revisaoOPs.map((r) => ({
      ...r,
      num_op: r.op,
      maquina: "Revisão",
      metragem: r.qtd_revisada,
      descricao_produto: r.descricao || r.produto,
    }));
  }, [revisaoOPs]);

  // Produção combinada: ControleEficiencia (exceto Revisão) + revisão (DetalheRevisaoOP)
  // Revisão NÃO usa ControleEficiencia — apenas DetalheRevisaoOP
  const producaoCombinada = useMemo(() => {
    const producaoSemRevisao = producao.filter((r) => normalizeMachine(r.maquina) !== "Revisão");
    return [...producaoSemRevisao, ...revisaoAsProducao];
  }, [producao, revisaoAsProducao]);

  // Produção filtrada pelos dias selecionados (vazio = todas)
  const producaoFiltrada = useMemo(() => {
    if (selectedDays.length === 0) return producaoCombinada;
    return producaoCombinada.filter((r) => r.data && selectedDays.includes(r.data));
  }, [producaoCombinada, selectedDays]);

  // Mapa de OPs produzidas por máquina: "maquina:num_op" → lista de registros (todos os dias)
  const producaoByMachineOp = useMemo(() => {
    const map = {};
    producaoCombinada.forEach((r) => {
      const machineKey = normalizeMachine(r.maquina);
      if (!machineKey || !r.num_op) return;
      const key = `${machineKey}:${r.num_op}`;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [producaoCombinada]);

  // Mapa de OPs revisadas (DetalheRevisaoOP) por número de OP
  const revisaoMapByOp = useMemo(() => {
    const map = {};
    revisaoOPs.forEach((r) => {
      if (r.op && !map[String(r.op)]) map[String(r.op)] = r;
    });
    return map;
  }, [revisaoOPs]);

  // Conjunto de OPs programadas por máquina/dia: "maquina:iso:num_op"
  const programmedOpsMachineDay = useMemo(() => {
    const set = new Set();
    programacao.forEach((r) => {
      const iso = entregaToIso(r.entrega) || r.data;
      if (iso && r.maquina && r.num_op) set.add(`${r.maquina}:${iso}:${String(r.num_op)}`);
    });
    return set;
  }, [programacao]);

  // Agrupa programação por máquina e verifica se cada OP foi produzida NA MESMA MÁQUINA
  const byMachine = useMemo(() => {
    const map = {};
    MACHINES.forEach((m) => (map[m] = []));
    programacao.forEach((r) => {
      if (map[r.maquina]) {
        const entregaIso = entregaToIso(r.entrega);
        const produced = pickBestProd(producaoByMachineOp[`${r.maquina}:${r.num_op}`], entregaIso);
        const sister = sisterEstampa(r.maquina);
        const producedSister = sister ? pickBestProd(producaoByMachineOp[`${sister}:${r.num_op}`], entregaIso) : null;
        let dataProd = produced?.data || null;
        let metragemProd = produced?.metragem || null;
        let status = "A FAZER";
        if (produced) {
          if (dataProd && entregaIso) {
            if (dataProd > entregaIso) {
              status = "PRONTA EM ATRASO";
            } else if (dataProd < entregaIso) {
              status = "PRONTA / ADIANTADA";
            } else {
              status = "PRONTA";
            }
          } else {
            status = "PRONTA";
          }
        } else if (producedSister) {
          status = "FEITO NA OUTRA MÁQUINA";
          dataProd = producedSister.data || null;
          metragemProd = producedSister.metragem || null;
        } else if (r.maquina !== "Revisão" && revisaoMapByOp[String(r.num_op)]) {
          // OP aparece no detalhe da revisão → foi produzida e revisada
          status = "FEITO NA REVISÃO";
          dataProd = revisaoMapByOp[String(r.num_op)].data || null;
          metragemProd = revisaoMapByOp[String(r.num_op)].qtd_revisada || null;
        }
        map[r.maquina].push({
          ...r,
          status,
          dataProducao: dataProd,
          metragemProduzida: metragemProd,
        });
      }
    });
    return map;
  }, [programacao, producaoByMachineOp, revisaoMapByOp]);

  // OPs produzidas que NÃO estão programadas para a máquina naquele dia
  // → "FORA DA PROGRAMAÇÃO"
  const foraByMachine = useMemo(() => {
    const map = {};
    MACHINES.forEach((m) => (map[m] = []));
    const programmedOpsMachineDay = new Set();
    // Mapa: "machine:op" → lista de datas de entrega programadas (ISO)
    const programmedEntregasByOp = {};
    programacao.forEach((r) => {
      const iso = entregaToIso(r.entrega) || r.data;
      if (iso && r.maquina && r.num_op) {
        programmedOpsMachineDay.add(`${r.maquina}:${iso}:${String(r.num_op)}`);
      }
      if (r.maquina && r.num_op) {
        const key = `${r.maquina}:${String(r.num_op)}`;
        if (!programmedEntregasByOp[key]) programmedEntregasByOp[key] = [];
        if (iso) programmedEntregasByOp[key].push(iso);
      }
    });
    const added = new Set();
    producaoFiltrada.forEach((r) => {
      const machineKey = normalizeMachine(r.maquina);
      if (!machineKey || !r.num_op || !r.data) return;
      const isProgrammedForDay = programmedOpsMachineDay.has(
        `${machineKey}:${r.data}:${String(r.num_op)}`
      );
      // OP programada para outro dia: só deixa de ser FORA se houver entrega
      // programada >= data de produção (adiantada). Se a produção foi DEPOIS
      // de todas as entregas programadas, é produção extra → FORA.
      const entregas = programmedEntregasByOp[`${machineKey}:${String(r.num_op)}`] || [];
      const isAdiantada = entregas.some((iso) => iso >= r.data);
      if (!isProgrammedForDay && !isAdiantada) {
        const key = `${machineKey}:${r.num_op}`;
        if (!added.has(key)) {
          added.add(key);
          map[machineKey].push({
            id: `fora-${r.id}`,
            num_op: r.num_op,
            produto: r.descricao_produto,
            metragem: null,
            metragemProduzida: r.metragem,
            dataProducao: r.data,
            status: "FORA",
          });
        }
      }
    });
    return map;
  }, [programacao, producaoFiltrada]);

  const totals = useMemo(() => {
    const t = {};
    const hasDays = selectedDays.length > 0;
    MACHINES.forEach((m) => {
      const recs = (byMachine[m] || []).filter((r) => !hasDays || selectedDays.includes(entregaToIso(r.entrega) || r.dataProducao));
      const fora = foraByMachine[m] || [];
      const prontas = recs.filter((r) => isDoneStatus(r.status)).length;
      t[m] = {
        total: recs.length,
        prontas,
        aFazer: recs.length - prontas,
        fora: fora.length,
        aderencia: recs.length > 0 ? (prontas / recs.length) * 100 : 0,
      };
    });
    return t;
  }, [byMachine, foraByMachine, selectedDays]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <LightHeader icon={ListChecks} title="Aderência de Programação" subtitle="Comparativo entre OPs programadas e produzidas" className="mb-3">
          <div className="flex items-center gap-3">
            {(() => {
              const totalGeral = Object.values(totals).reduce((s, t) => s + t.total, 0);
              const prontasGeral = Object.values(totals).reduce((s, t) => s + t.prontas, 0);
              const aderenciaGeral = totalGeral > 0 ? (prontasGeral / totalGeral) * 100 : 0;
              return (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-90">Aderência Geral</span>
                  <span className="text-lg font-extrabold tabular-nums">{aderenciaGeral.toFixed(0)}%</span>
                </div>
              );
            })()}
            <DayFilter selectedDays={selectedDays} onSelect={setSelectedDays} />
            {selectedDays.length > 0 && (
              <Button variant="ghost" size="sm" className="h-9 text-slate-700 hover:bg-slate-100" onClick={() => setSelectedDays([])}>
                Limpar data
              </Button>
            )}
            <Button variant="default" size="sm" className="h-9 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm" onClick={() => setChartOpen(true)}>
              <LineChartIcon className="w-4 h-4" /> Gráfico
            </Button>
            <Button variant="default" size="sm" className="h-9 gap-1.5 bg-slate-900 text-white hover:bg-slate-800" onClick={() => setImportOpen(true)}>
              <UploadCloud className="w-4 h-4" /> Importar Programação
            </Button>
          </div>
        </LightHeader>

        {programacao.length === 0 && (
          <div className="text-center py-20">
            <ListChecks className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Nenhuma programação importada ainda.</p>
            <p className="text-slate-500 text-sm mt-1">Clique em "Importar Programação" para começar.</p>
          </div>
        )}

        {programacao.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
              {MACHINES.map((m, idx) => {
                const t = totals[m];
                const isActive = active === m;
                return (
                  <motion.div
                    key={m}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.05 }}
                    onClick={() => setActive(isActive ? null : m)}
                    className={`group relative rounded-2xl p-[1.5px] cursor-pointer transition-all duration-300 ${
                      isActive
                        ? "bg-slate-400 shadow-lg scale-[1.02]"
                        : "bg-slate-300 hover:bg-slate-400 hover:-translate-y-1 hover:shadow-md"
                    }`}
                  >
                    <div className="relative rounded-[14px] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-3 h-full overflow-hidden">
                      <div className="relative flex flex-col h-full">
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">{m}</h3>
                        <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-widest mt-0.5">Aderência</p>
                        <div className="flex items-end justify-between gap-2 mt-0.5">
                          <p className="text-2xl font-extrabold tabular-nums leading-none text-slate-900">
                            {t.total > 0 ? `${t.aderencia.toFixed(0)}%` : "—"}
                          </p>
                          <div className="flex flex-col gap-0.5 items-end">
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {t.prontas} prontas
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              {t.aFazer} a fazer
                            </span>
                            {t.fora > 0 && (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                {t.fora} fora prog.
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[10px] font-medium text-blue-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {t.total} OP(s) programada(s)
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {active && (
              <AderenciaRelatorio
                maquina={active}
                records={byMachine[active] || []}
                foraRecords={foraByMachine[active] || []}
                selectedDays={selectedDays}
              />
            )}
          </>
        )}
      </div>

      <ImportProgramacaoDialog open={importOpen} onOpenChange={setImportOpen} onImported={load} />
      <AderenciaChartDialog open={chartOpen} onOpenChange={setChartOpen} byMachine={byMachine} selectedDays={selectedDays} />
    </div>
  );
}

function AderenciaRelatorio({ maquina, records, foraRecords, selectedDays }) {
  const { toast } = useToast();
  const rootRef = useRef(null);
  const [saving, setSaving] = useState(false);

  const entregaToIso = (entrega) => {
    if (!entrega) return null;
    const parts = entrega.split("/");
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    return null;
  };

  const inSelectedDays = (row) => {
    if (!selectedDays || selectedDays.length === 0) return true;
    const iso = entregaToIso(row.entrega) || row.dataProducao || null;
    return iso ? selectedDays.includes(iso) : false;
  };

  const filteredRecords = useMemo(() => records.filter(inSelectedDays), [records, selectedDays]);
  const filteredFora = useMemo(() => foraRecords.filter(inSelectedDays), [foraRecords, selectedDays]);

  const prontas = filteredRecords.filter((r) => isDoneStatus(r.status)).length;
  const total = filteredRecords.length;
  const foraCount = filteredFora.length;
  const aderencia = total > 0 ? (prontas / total) * 100 : 0;

  const handleSave = async () => {
    // A data vem sempre da coluna Entrega dos registros importados
    const uniqueDates = [...new Set(
      [...records, ...foraRecords].map((r) => r.data).filter(Boolean)
    )];
    if (uniqueDates.length === 0) {
      toast({ title: "Sem data de entrega", description: "Importe a programação para obter a data de entrega.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const allRows = [...records, ...foraRecords].map((r) => ({
        num_op: r.num_op,
        produto: r.produto,
        metragem: r.metragem,
        metragem_produzida: r.metragemProduzida,
        data_producao: r.dataProducao,
        entrega: r.entrega,
        status: r.status,
      }));
      for (const data of uniqueDates) {
        const existing = await db.entities.AderenciaHistorico.filter({ data, maquina });
        const payload = {
          data,
          maquina,
          total_ops: total,
          prontas,
          a_fazer: total - prontas,
          fora: foraCount,
          aderencia,
          detalhes: JSON.stringify(allRows),
        };
        if (existing.length > 0) {
          await db.entities.AderenciaHistorico.update(existing[0].id, payload);
        } else {
          await db.entities.AderenciaHistorico.create(payload);
        }
      }

    } catch (e) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    const root = rootRef.current;
    if (!root) { window.print(); return; }
    await handleSave();
    const styleEl = document.createElement("style");
    styleEl.id = "aderencia-landscape-page";
    styleEl.textContent = "@page { size: A4 landscape; margin: 8mm; }";
    document.head.appendChild(styleEl);
    document.body.classList.add("printing-aderencia");
    await new Promise((res) => setTimeout(res, 300));
    const cleanup = () => {
      document.body.classList.remove("printing-aderencia");
      styleEl.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  const allRows = [...filteredRecords, ...filteredFora];

  const toDateKey = (entrega) => {
    if (!entrega) return "9999-99-99";
    const parts = entrega.split("/");
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    return entrega;
  };

  const grouped = useMemo(() => {
    const map = {};
    allRows.forEach((r) => {
      const key = r.entrega || "Sem data de entrega";
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return Object.keys(map)
      .sort((a, b) => toDateKey(a).localeCompare(toDateKey(b)))
      .map((k) => ({ entrega: k, rows: map[k] }));
  }, [allRows]);

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="aderencia-root rounded-2xl border border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm"
    >
      <div className="aderencia-header flex items-center justify-between mb-4 rounded-xl bg-slate-100 border border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Relatório — {maquina}</h3>
          <p className="text-xs text-slate-600">
            {total} OP(s) programada(s) • {prontas} produzida(s)
            {foraRecords.length > 0 && ` • ${foraRecords.length} fora da programação`}
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold tabular-nums text-sm">
              Aderência: {aderencia.toFixed(0)}%
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 print-hide">
          <Button variant="outline" size="sm" className="h-8 gap-1 bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1 bg-white text-slate-800 border-slate-300 hover:bg-slate-100" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-100">
            <tr className="text-left text-slate-700">
              <th className="px-3 py-2.5 font-medium whitespace-nowrap w-[10%]">Data Produção</th>
              <th className="px-3 py-2.5 font-medium whitespace-nowrap w-[8%]">Entrega</th>
              <th className="px-3 py-2.5 font-medium whitespace-nowrap w-[8%]">OP</th>
              <th className="px-3 py-2.5 font-medium whitespace-nowrap w-[35%]">Produto</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap w-[10%]">Metragem</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap w-[10%]">Mts Produzidos</th>
              <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap w-[14%]">Situação</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => {
              const prontasG = g.rows.filter((r) => r.status.startsWith("PRONTA")).length;
              return (
                <React.Fragment key={g.entrega}>
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td colSpan={7} className="px-3 py-2 text-blue-800 font-bold text-[12px] uppercase tracking-wide">
                      Entrega: {g.entrega} • {g.rows.length} OP(s) • {prontasG} pronta(s)
                    </td>
                  </tr>
                  {g.rows.map((r, idx) => {
                    const fora = r.status === "FORA";
                    return (
                      <tr key={r.id} className={`row-data border-t border-slate-200 text-slate-700 hover:bg-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-100 row-gray"}`}>
                        <td className="px-3 py-2 whitespace-nowrap tabular-nums text-[11px]">
                          {r.dataProducao ? r.dataProducao.split("-").reverse().join("/") : "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[11px]">
                          {r.entrega ? (
                            <span className="badge-entrega inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">{r.entrega}</span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center font-semibold text-slate-900">{r.num_op}</td>
                        <td className="px-3 py-2 max-w-[280px] truncate text-[12px] font-bold text-black" title={r.produto}>{r.produto || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.metragem != null ? r.metragem.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                          {r.metragemProduzida != null ? r.metragemProduzida.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.status === "PRONTA" && (
                            <span className="badge-pronta inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              PRONTA
                            </span>
                          )}
                          {r.status === "PRONTA EM ATRASO" && (
                            <span className="badge-atraso inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">
                              PRONTA EM ATRASO
                            </span>
                          )}
                          {r.status === "PRONTA / ADIANTADA" && (
                            <span className="badge-adiantada inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-800">
                              PRONTA / ADIANTADA
                            </span>
                          )}
                          {r.status === "FEITO NA OUTRA ESTAMPA" && (
                            <span className="badge-outra inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                              FEITO NA OUTRA ESTAMPA
                            </span>
                          )}
                          {r.status === "FEITO NA OUTRA MÁQUINA" && (
                            <span className="badge-outra inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                              FEITO NA OUTRA MÁQUINA
                            </span>
                          )}
                          {r.status === "FEITO NA REVISÃO" && (
                            <span className="badge-revisao inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800">
                              FEITO NA REVISÃO
                            </span>
                          )}
                          {fora && (
                            <span className="badge-fora inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              FORA DA PROGRAMAÇÃO
                            </span>
                          )}
                          {r.status === "A FAZER" && (
                            <span className="badge-afazer inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              A FAZER
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
            {allRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">Nenhuma OP programada para {maquina}.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}