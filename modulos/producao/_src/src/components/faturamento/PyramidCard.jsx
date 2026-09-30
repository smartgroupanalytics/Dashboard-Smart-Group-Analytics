import React from "react";
import { motion } from "framer-motion";

const CLIPS = [
  "polygon(28% 0, 72% 0, 78% 100%, 22% 100%)",
  "polygon(20% 0, 80% 0, 86% 100%, 14% 100%)",
  "polygon(12% 0, 88% 0, 100% 100%, 0 100%)",
];

export default function PyramidCard({ title, subtitle, color, levels, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex flex-col items-center"
    >
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mb-2">{subtitle}</p>}
      <div className="w-full max-w-[420px] flex flex-col gap-1.5">
        {levels.map((level, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-center"
            style={{
              clipPath: CLIPS[i],
              background: color,
              minHeight: i === 2 ? 100 : i === 1 ? 82 : 64,
              paddingTop: i === 0 ? 10 : 8,
              paddingBottom: i === 2 ? 14 : 8,
            }}
          >
            <div>
              <p className="text-[10px] text-white/75 uppercase font-medium tracking-wide">{level.label}</p>
              <p className="text-base font-bold text-white tabular-nums leading-tight">{level.value}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}