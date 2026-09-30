import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Save, Trash2, Loader2 } from "lucide-react";
export default function SaveDayDialog({ open, onOpenChange }) {
    const [selectedDate, setSelectedDate] = useState("");
    const [savedDates, setSavedDates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const loadDates = async () => {
        try {
            const data = await db.entities.InsumosDataSalva.list("-data", 200);
            setSavedDates(data);
        }
        catch (e) {
            // ignore
        }
    };
    useEffect(() => {
        if (open) {
            loadDates();
        }
    }, [open]);
    const handleSave = async () => {
        if (!selectedDate)
            return;
        setLoading(true);
        try {
            const exists = savedDates.some((d) => d.data === selectedDate);
            if (!exists) {
                await db.entities.InsumosDataSalva.create({ data: selectedDate });
            }
            await loadDates();
            setSelectedDate("");
        }
        catch (e) {
            // ignore
        }
        finally {
            setLoading(false);
        }
    };
    const handleDelete = async (id) => {
        setDeletingId(id);
        try {
            await db.entities.InsumosDataSalva.delete(id);
            await loadDates();
        }
        finally {
            setDeletingId(null);
        }
    };
    const formatDate = (d) => {
        try {
            return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
        }
        catch {
            return d;
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "w-5 h-5 text-blue-600" }), "Salvar Dia"] }) }), _jsxs("div", { className: "space-y-4 py-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("label", { className: "text-sm font-medium text-slate-700", children: "Selecione o dia" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "date", value: selectedDate, onChange: (e) => setSelectedDate(e.target.value), className: "flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm" }), _jsxs(Button, { onClick: handleSave, disabled: !selectedDate || loading, className: "gap-1.5", children: [loading ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsx(Save, { className: "w-4 h-4" }), "Salvar"] })] })] }), savedDates.length > 0 && (_jsxs("div", { className: "space-y-1.5", children: [_jsxs("p", { className: "text-sm font-medium text-slate-700", children: ["Dias salvos (", savedDates.length, ")"] }), _jsx("div", { className: "max-h-48 overflow-y-auto space-y-1", children: savedDates.map((d) => (_jsxs("div", { className: "flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100", children: [_jsx("span", { className: "text-sm text-slate-700 font-medium", children: formatDate(d.data) }), _jsx("button", { onClick: () => handleDelete(d.id), disabled: deletingId === d.id, className: "text-rose-500 hover:text-rose-700 transition-colors disabled:opacity-50", children: deletingId === d.id ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsx(Trash2, { className: "w-4 h-4" }) })] }, d.id))) })] }))] }), _jsx(DialogFooter, { children: _jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Fechar" }) })] }) }));
}
