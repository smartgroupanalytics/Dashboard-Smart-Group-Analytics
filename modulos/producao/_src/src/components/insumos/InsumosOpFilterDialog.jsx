import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, Eraser } from "lucide-react";

export default function InsumosOpFilterDialog({ open, onOpenChange, currentFilter, onApply }) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (open) setText(currentFilter || "");
  }, [open, currentFilter]);

  const handleApply = () => {
    onApply(text);
    onOpenChange(false);
  };

  const handleClear = () => {
    setText("");
    onApply("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Filtrar OPs
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 -mt-1">
          Cole ou digite os números das OPs, <strong>um embaixo da outra</strong>:
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Ex.:\n12345\n12346\n12347"}
          rows={10}
          autoFocus
          className="w-full rounded-lg border border-slate-300 p-3 text-sm font-mono resize-y focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
        />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClear}>
            <Eraser className="w-4 h-4" /> Limpar
          </Button>
          <Button onClick={handleApply}>
            <Search className="w-4 h-4" /> Procurar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}