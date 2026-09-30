import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mesLabel } from "@/lib/format";
const FIELDS = [
    { key: "faturamento_smart_group", label: "Faturamento Smart Group (R$)" },
    { key: "metros_smart_group", label: "Metros Smart Group (m²)" },
    { key: "faturamento_stk", label: "Faturamento STK (R$)" },
    { key: "metros_stk", label: "Metros STK (m²)" },
    { key: "faturamento_previsto_2026", label: "Faturamento Previsto 2026 (R$)" },
    { key: "faturamento_2025", label: "Faturamento 2025 (R$)" },
    { key: "preco_medio_orcado", label: "Preço Médio Orçado (R$/m²)" },
    { key: "preco_medio_realizado", label: "Preço Médio Realizado (R$/m²)" },
];
export default function EditFaturamentoDialog({ open, onOpenChange, record, onSaved }) {
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (record)
            setForm({ ...record });
    }, [record]);
    const handleChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value === "" ? 0 : parseFloat(value) }));
    };
    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {};
            FIELDS.forEach((f) => {
                payload[f.key] = form[f.key] || 0;
            });
            await db.entities.Faturamento.update(form.id, payload);
            await onSaved();
            onOpenChange(false);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-2xl max-h-[90vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["Editar Faturamento \u2014 ", mesLabel(form.mes), " ", form.ano || ""] }) }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 py-2", children: FIELDS.map((f) => (_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: f.label }), _jsx(Input, { type: "number", step: "0.01", value: form[f.key] ?? "", onChange: (e) => handleChange(f.key, e.target.value) })] }, f.key))) }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancelar" }), _jsx(Button, { onClick: handleSave, disabled: saving, children: saving ? "Salvando..." : "Salvar" })] })] }) }));
}
