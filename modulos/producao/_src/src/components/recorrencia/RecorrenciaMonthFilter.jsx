import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, ArrowRight, X } from "lucide-react";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function isoOf(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function diasUteisMes(y, m) {
  const days = [];
  const dim = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= dim; d++) {
    const dt = new Date(y, m, d);
    const dow = dt.getDay();
    if (dow !== 0 && dow !== 6) days.push(isoOf(y, m, d));
  }
  return days;
}

export default function RecorrenciaMonthFilter({ selectedDays, onSelect, triggerClassName }) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const count = selectedDays.length;
  const summary =
    count === 0
      ? "Nenhuma data"
      : count === 1
        ? selectedDays[0].split("-").reverse().join("/")
        : `${count} datas`;

  const addMonth = () => {
    const uteis = diasUteisMes(view.y, view.m);
    const merged = [...selectedDays];
    uteis.forEach((iso) => { if (!merged.includes(iso)) merged.push(iso); });
    onSelect(merged.sort());
  };

  const remove = (iso) => onSelect(selectedDays.filter((x) => x !== iso));

  const prev = () => setView((v) => {
    const m = v.m - 1;
    return m < 0 ? { y: v.y - 1, m: 11 } : { ...v, m };
  });
  const next = () => setView((v) => {
    const m = v.m + 1;
    return m > 11 ? { y: v.y + 1, m: 0 } : { ...v, m };
  });

  const uteisCount = diasUteisMes(view.y, view.m).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 h-9 ${triggerClassName || "bg-white text-slate-800 hover:bg-white"}`}
        >
          <Calendar className="w-4 h-4" />
          <span className="max-w-[180px] truncate">{summary}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-bold text-slate-900">{MESES[view.m]} {view.y}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={next}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button
          onClick={addMonth}
          className="w-full gap-2 bg-[#00798C] text-white hover:bg-[#006674] mb-2"
        >
          Selecionar dias úteis deste mês
          <ArrowRight className="w-4 h-4" />
        </Button>
        <p className="text-[11px] text-slate-500 text-center mb-3">
          {uteisCount} dias úteis • adiciona à seleção atual
        </p>

        {count > 0 && (
          <>
            <div className="flex items-center justify-between mb-1.5 pt-2 border-t border-border">
              <span className="text-[11px] font-semibold text-slate-600">
                {count} data{count > 1 ? "s" : ""} selecionada{count > 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-rose-600 hover:text-rose-700"
                onClick={() => onSelect([])}
              >
                Limpar tudo
              </Button>
            </div>
            <div className="max-h-40 overflow-y-auto flex flex-wrap gap-1">
              {selectedDays.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => remove(d)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 text-[11px] text-slate-700"
                >
                  {d.split("-").reverse().join("/")}
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              ))}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}