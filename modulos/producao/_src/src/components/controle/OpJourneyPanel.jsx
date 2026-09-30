import React, { useMemo } from "react";
import { X, MapPin, Clock, Package, AlertTriangle, Cog } from "lucide-react";
import { tempoEsperadoHoras, tempoRealHoras } from "@/lib/controleSpeed";

function fmtHoras(v) {
  if (!v && v !== 0) return "00:00";
  const abs = Math.abs(v);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmtNum(n) {
  return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

export default function OpJourneyPanel({ op, records, onClose }) {
  // Agrupa por máquina
  const byMachine = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      if (!r.maquina) return;
      if (!map[r.maquina]) map[r.maquina] = [];
      map[r.maquina].push(r);
    });
    return Object.entries(map).sort((a, b) => {
      const aDate = a[1][0]?.data || "";
      const bDate = b[1][0]?.data || "";
      return aDate.localeCompare(bDate);
    });
  }, [records]);

  const totais = useMemo(() => {
    let tempo = 0;
    let metros = 0;
    let setups = 0;
    let paradas = 0;
    let retrabalhos = 0;
    records.forEach((r) => {
      tempo += r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
      metros += r.metragem || 0;
      setups += r.setup || 0;
      paradas += r.parada || 0;
      if (r.is_retrabalho) retrabalhos += 1;
    });
    return { tempo, metros, setups, paradas, retrabalhos };
  }, [records]);

  const datasUnicas = useMemo(() => {
    const set = new Set(records.map((r) => r.data).filter(Boolean));
    return [...set].sort();
  }, [records]);

  return (
    <div className="ce-op-journey">
      <div className="ce-op-journey-head">
        <div className="ce-op-journey-title">
          <div className="ce-op-journey-mark">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3>Trajeto da OP <span className="ce-op-journey-num">{op}</span></h3>
            <p>
              {byMachine.length} máquina(s) · {records.length} registro(s) ·{" "}
              {datasUnicas.length === 1
                ? fmtDate(datasUnicas[0])
                : `${fmtDate(datasUnicas[0])} → ${fmtDate(datasUnicas[datasUnicas.length - 1])}`}
            </p>
          </div>
        </div>
        <button className="ce-op-journey-close" onClick={onClose}>
          <X className="w-4 h-4" /> Fechar busca
        </button>
      </div>

      {/* Totais da OP */}
      <div className="ce-op-journey-totals">
        <div className="ce-op-journey-stat">
          <Clock className="w-4 h-4 text-cyan-600" />
          <div>
            <p>Tempo Total</p>
            <strong>{fmtHoras(totais.tempo)}</strong>
          </div>
        </div>
        <div className="ce-op-journey-stat">
          <Package className="w-4 h-4 text-emerald-600" />
          <div>
            <p>Metragem</p>
            <strong>{fmtNum(totais.metros)} m</strong>
          </div>
        </div>
        <div className="ce-op-journey-stat">
          <Cog className="w-4 h-4 text-blue-600" />
          <div>
            <p>Setup</p>
            <strong>{fmtNum(totais.setups)} min</strong>
          </div>
        </div>
        <div className="ce-op-journey-stat">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <div>
            <p>Parada</p>
            <strong>{fmtNum(totais.paradas)} min</strong>
          </div>
        </div>
        {totais.retrabalhos > 0 && (
          <div className="ce-op-journey-stat ce-op-journey-stat-retrab">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <div>
              <p>Retrabalhos</p>
              <strong>{totais.retrabalhos}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Lista de máquinas por onde passou */}
      <div className="ce-op-journey-machines">
        {byMachine.map(([maquina, recs]) => {
          const tempoMaq = recs.reduce((s, r) => s + (r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final)), 0);
          const metrosMaq = recs.reduce((s, r) => s + (r.metragem || 0), 0);
          const temRetrab = recs.some((r) => r.is_retrabalho);
          return (
            <div key={maquina} className="ce-op-journey-machine">
              <div className="ce-op-journey-machine-head">
                <div className="ce-op-journey-machine-name">
                  <Cog className="w-4 h-4" />
                  <span>{maquina}</span>
                  {temRetrab && <span className="ce-op-journey-badge">Retrabalho</span>}
                </div>
                <div className="ce-op-journey-machine-stats">
                  <span><Clock className="w-3 h-3" /> {fmtHoras(tempoMaq)}</span>
                  <span><Package className="w-3 h-3" /> {fmtNum(metrosMaq)} m</span>
                  <span className="ce-op-journey-count">{recs.length} reg.</span>
                </div>
              </div>
              <div className="ce-op-journey-records">
                {recs.map((r) => (
                  <div key={r.id} className="ce-op-journey-record">
                    <span className="ce-op-journey-date">{fmtDate(r.data)}</span>
                    <span className="ce-op-journey-prod" title={r.descricao_produto}>
                      {r.descricao_produto || "—"}
                    </span>
                    <span className="ce-op-journey-time">{fmtHoras(r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final))}</span>
                    <span className="ce-op-journey-meters">{fmtNum(r.metragem || 0)} m</span>
                    {r.is_retrabalho && <span className="ce-op-journey-tag">Retrab.</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}