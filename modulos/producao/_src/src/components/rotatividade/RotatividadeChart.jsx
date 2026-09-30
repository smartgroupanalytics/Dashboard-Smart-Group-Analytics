import React from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

const Dot = ({ color }) => (props) => {
  const { cx, cy } = props;
  return (
    <svg x={cx - 5} y={cy - 5} width={10} height={10} overflow="visible">
      <rect x={0} y={0} width={10} height={10} transform="rotate(45 5 5)" fill={color} stroke="#fff" strokeWidth={1.5} rx={1} />
    </svg>
  );
};

const PctLabel = ({ x, y, value, color, isTop }) => {
  const text = `${Number(value).toFixed(1).replace(".", ",")}%`;
  return (
    <g>
      <circle cx={x} cy={y} r={5} fill={color} stroke="#fff" strokeWidth={1} />
      <text x={x} y={isTop ? y - 12 : y + 22} fill={color} fontSize={18} fontWeight={800} textAnchor="middle">
        {text}
      </text>
    </g>
  );
};

export default function RotatividadeChart({ data }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="rounded-xl bg-gradient-to-br from-white via-slate-50 to-slate-100 border border-slate-300 shadow-sm p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1 h-5 rounded-full bg-blue-500" />
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Evolução da Rotatividade (%)
        </h3>
      </div>
      <div className="w-full h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 24, right: 16, bottom: 8, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.1)" />
            <XAxis
              dataKey="mes"
              tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }}
              axisLine={{ stroke: "rgba(15,23,42,0.2)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#475569", fontSize: 11 }}
              axisLine={{ stroke: "rgba(15,23,42,0.2)" }}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              domain={[0, "auto"]}
            />
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                color: "#0f172a",
              }}
              labelStyle={{ color: "#1e40af", fontWeight: 700 }}
              formatter={(v) => `${Number(v).toFixed(1).replace(".", ",")}%`}
            />
            <Line
              type="monotone"
              dataKey="rot2025"
              name="Ano 2025"
              stroke="#1d4ed8"
              strokeWidth={2.5}
              dot={<Dot color="#1d4ed8" />}
              activeDot={{ r: 6 }}
            >
              <LabelList
                dataKey="rot2025"
                position="top"
                offset={10}
                fill="#1d4ed8"
                fontSize={18}
                fontWeight={800}
                formatter={(v) => `${Number(v).toFixed(1).replace(".", ",")}%`}
                content={(props) => {
                  const row = data[props.index] || {};
                  const v2025 = Number(row.rot2025 ?? 0);
                  const v2026 = Number(row.rot2026 ?? 0);
                  return <PctLabel {...props} color="#1d4ed8" isTop={v2025 >= v2026} />;
                }}
              />
            </Line>
            <Line
              type="monotone"
              dataKey="rot2026"
              name="Ano 2026"
              stroke="#047857"
              strokeWidth={3}
              dot={<Dot color="#047857" />}
              activeDot={{ r: 6 }}
            >
              <LabelList
                dataKey="rot2026"
                position="bottom"
                offset={8}
                fill="#047857"
                fontSize={18}
                fontWeight={800}
                formatter={(v) => `${Number(v).toFixed(1).replace(".", ",")}%`}
                content={(props) => {
                  const row = data[props.index] || {};
                  const v2025 = Number(row.rot2025 ?? 0);
                  const v2026 = Number(row.rot2026 ?? 0);
                  return <PctLabel {...props} color="#047857" isTop={v2026 > v2025} />;
                }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rotate-45 bg-blue-500" />
          <span className="text-xs text-slate-600 font-medium">ANO 2025</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-600 font-medium">ANO 2026</span>
        </div>
      </div>
    </motion.div>
  );
}