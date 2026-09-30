import React from "react";
import { motion } from "framer-motion";

const MESES = [
  { label: "JAN", value: 1 }, { label: "FEV", value: 2 }, { label: "MAR", value: 3 },
  { label: "ABR", value: 4 }, { label: "MAI", value: 5 }, { label: "JUN", value: 6 },
  { label: "JUL", value: 7 }, { label: "AGO", value: 8 }, { label: "SET", value: 9 },
  { label: "OUT", value: 10 }, { label: "NOV", value: 11 }, { label: "DEZ", value: 12 },
];

export default function GastosMonthFilter({ selected, onChange }) {
  const toggle = (val) => {
    if (selected.includes(val)) {
      onChange(selected.filter((m) => m !== val));
    } else {
      onChange([...selected, val].sort((a, b) => a - b));
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {MESES.map((m) => {
        const active = selected.includes(m.value);
        return (
          <motion.button
            key={m.value}
            whileTap={{ scale: 0.94 }}
            onClick={() => toggle(m.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all ${
              active
                ? "bg-[#1e3a8a] text-white shadow-md shadow-blue-900/20"
                : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700"
            }`}
          >
            {m.label}
          </motion.button>
        );
      })}
    </div>
  );
}