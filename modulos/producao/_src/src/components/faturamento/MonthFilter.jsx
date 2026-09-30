import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar, Check } from "lucide-react";
import { MESES } from "@/lib/format";

export default function MonthFilter({ selectedMeses, onSelect, triggerClassName }) {
  const [open, setOpen] = useState(false);
  const count = selectedMeses.length;
  const summary =
    count === 0
      ? "Nenhum mês"
      : count === 1
        ? MESES.find((m) => m.value === selectedMeses[0])?.label
        : `${count} meses selecionados`;

  const toggle = (v) => {
    if (selectedMeses.includes(v)) {
      onSelect(selectedMeses.filter((x) => x !== v));
    } else {
      onSelect([...selectedMeses, v].sort((a, b) => a - b));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 h-9 ${triggerClassName || "bg-white text-slate-800 hover:bg-white"}`}
        >
          <Calendar className="w-4 h-4" />
          <span className="max-w-[160px] truncate">{summary}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-medium text-muted-foreground">Meses</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] px-2"
              onClick={() => onSelect(MESES.map((m) => m.value))}
            >
              Todos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] px-2"
              onClick={() => onSelect([])}
            >
              Limpar
            </Button>
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {MESES.map((m) => {
            const checked = selectedMeses.includes(m.value);
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => toggle(m.value)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent text-sm"
              >
                <span
                  className={`flex items-center justify-center w-4 h-4 rounded border ${
                    checked ? "bg-primary border-primary" : "border-input"
                  }`}
                >
                  {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                </span>
                {m.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}