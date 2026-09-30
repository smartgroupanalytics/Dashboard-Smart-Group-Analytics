import React from "react";
import { Factory, Layers, Gauge, TrendingUp } from "lucide-react";

const DEFAULT_ROWS = [
  { bg: "#e53935", dark: "#c62828", label: "PRODUÇÃO SMART", icon: Factory, field: "producaoSmart" },
  { bg: "#00acc1", dark: "#0097a7", label: "BENEFICIAMENTO", icon: Layers, field: "beneficiamento" },
  { bg: "#fb8c00", dark: "#ef6c00", label: "STK", icon: Gauge, field: "mediaDiaStk" },
];

function fmt(v) {
  return (v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

// Gera o path de uma engrenagem com N dentes.
function gearPath(cx, cy, rTip, rRoot, teeth) {
  const step = (Math.PI * 2) / teeth;
  const tipFrac = 0.40;
  const transFrac = 0.07;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const base = i * step - Math.PI / 2;
    const a1 = base;
    const a2 = base + step * transFrac;
    const a3 = base + step * (transFrac + tipFrac);
    const a4 = base + step * (transFrac + tipFrac + transFrac);
    const p = (ang, r) => [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
    const [x1, y1] = p(a1, rRoot);
    const [x2, y2] = p(a2, rTip);
    const [x3, y3] = p(a3, rTip);
    const [x4, y4] = p(a4, rRoot);
    d += i === 0 ? `M ${x1} ${y1} ` : `L ${x1} ${y1} `;
    d += `L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} `;
  }
  return d + "Z";
}

export default function CircularInfografico({
  producaoSmart,
  beneficiamento,
  mediaDiaStk,
  rows,
  values,
  subtitle = "business infographic",
}) {
  // Modo configurável (rows + values) ou modo legado (3 barras fixas)
  const useRows = rows && values;
  const ROWS = useRows ? rows : DEFAULT_ROWS;
  const vals = useRows
    ? values
    : [producaoSmart, beneficiamento, mediaDiaStk];

  const total = vals.reduce((s, v) => s + (v || 0), 0) || 1;

  // Dimensões da engrenagem SVG
  const G = 220;
  const gcx = G / 2;
  const gcy = G / 2;
  const gTip = 100;
  const gRoot = 82;
  const teeth = 12;
  const gearD = gearPath(gcx, gcy, gTip, gRoot, teeth);

  // C-shape (ferradura branca) com gap na base
  const ringR = 34;
  const C = 2 * Math.PI * ringR;
  const gap = 70;
  const dashOffset = -(C / 4 - gap / 2);

  const segCount = ROWS.length;
  const segH = G / segCount;

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{ background: "radial-gradient(circle at 40% 40%, #f7f7f7, #e6e6e6)" }}
    >
      <p className="text-center text-[11px] font-semibold tracking-widest text-slate-500 uppercase pt-3">
        {subtitle}
      </p>
      <div className="flex items-stretch gap-0 px-4 pb-5 pt-2">
        {/* Barras chevron */}
        <div className="flex-1 flex flex-col justify-center gap-3 pr-10">
          {ROWS.map((r, i) => {
            const Icon = r.icon;
            return (
              <div
                key={i}
                className="relative h-[74px] flex items-center"
                style={{ filter: "drop-shadow(0 5px 5px rgba(0,0,0,0.22))" }}
              >
                <div
                  className="w-full h-full flex items-center gap-3 pl-11 pr-5 text-white"
                  style={{
                    background: `linear-gradient(90deg, ${r.dark}, ${r.bg})`,
                    clipPath: "polygon(26px 0, 100% 0, 100% 100%, 26px 100%, 0 50%)",
                  }}
                >
                  <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold uppercase tracking-wide leading-tight">
                      {r.label}
                    </p>
                    <p className="text-[22px] font-extrabold leading-tight opacity-95 tabular-nums">
                      {fmt(vals[i])} m
                    </p>
                  </div>
                  <span className="ml-auto text-4xl font-extrabold leading-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Engrenagem sobreposta à direita */}
        <div className="relative w-[150px] shrink-0 flex items-center justify-center -ml-6">
          <svg viewBox={`0 0 ${G} ${G}`} className="w-[150px]" style={{ overflow: "visible", filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.18))" }}>
            <defs>
              <clipPath id="gearClip">
                <path d={gearD} />
              </clipPath>
            </defs>

            {/* Fatias coloridas horizontais recortadas na forma da engrenagem */}
            <g clipPath="url(#gearClip)">
              {ROWS.map((r, i) => (
                <rect
                  key={i}
                  x={0}
                  y={segH * i}
                  width={G}
                  height={segH + 1}
                  fill={r.bg}
                />
              ))}
              {/* sombra nas junções das fatias */}
              {ROWS.slice(0, -1).map((r, i) => (
                <rect
                  key={`sh-${i}`}
                  x={0}
                  y={segH * (i + 1) - 3}
                  width={G}
                  height={6}
                  fill="#000"
                  opacity={0.18}
                />
              ))}
            </g>

            {/* Contorno da engrenagem */}
            <path d={gearD} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={1.5} />

            {/* Círculo central branco */}
            <circle cx={gcx} cy={gcy} r={46} fill="#fff" />
            <circle cx={gcx} cy={gcy} r={46} fill="none" stroke="#eee" strokeWidth={1} />

            {/* Ferradura branca (C) com gap na base */}
            <circle
              cx={gcx}
              cy={gcy}
              r={ringR}
              fill="none"
              stroke="#fff"
              strokeWidth={9}
              strokeLinecap="round"
              strokeDasharray={`${C - gap} ${gap}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(0 ${gcx} ${gcy})`}
            />
            {/* Triângulo apontando para baixo na base */}
            <polygon
              points={`${gcx - 7},${gcy + 30} ${gcx + 7},${gcy + 30} ${gcx},${gcy + 44}`}
              fill="#fff"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}