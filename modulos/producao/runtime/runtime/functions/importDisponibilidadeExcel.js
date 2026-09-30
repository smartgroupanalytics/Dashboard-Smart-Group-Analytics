const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import { createClientFromRequest } from '../server-shim.js';
function num(v) {
    if (v == null || v === '')
        return 0;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
    return isNaN(n) ? 0 : n;
}
const MESES_ABBR = {
    jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
    jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};
function parseMes(v) {
    if (v == null || v === '')
        return null;
    if (v instanceof Date) {
        const m = v.getMonth() + 1;
        if (m >= 1 && m <= 12)
            return m;
    }
    const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d]/g, ''));
    if (!isNaN(n) && n >= 1 && n <= 12)
        return n;
    const abbr = String(v).trim().toLowerCase().substring(0, 3);
    if (MESES_ABBR[abbr])
        return MESES_ABBR[abbr];
    return null;
}
function normalizeName(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').trim();
}
// Coluna B (1) = Mês
// C (2) = Produzindo, D (3) = Setup, E (4) = Parada de Máq.
// F (5) = Amostras, G (6) = Retrabalho, H (7) = Ociosa
export default async function (req) {
    try {
        createClientFromRequest(req);
        const user = await db.auth.me();
        if (!user)
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const body = await req.json();
        const file_url = body?.file_url;
        if (!file_url)
            return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });
        const resp = await fetch(file_url);
        if (!resp.ok)
            return Response.json({ error: 'Falha ao baixar o arquivo' }, { status: 502 });
        const buf = await resp.arrayBuffer();
        const XLSX = await import('xlsx');
        const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
        const sheetName = wb.SheetNames.find(n => {
            const norm = normalizeName(n);
            return norm.includes('disponibilidade') || norm.includes('disponivel');
        });
        if (!sheetName) {
            return Response.json({ error: `Aba "Disponibilidade" não encontrada. Abas disponíveis: ${wb.SheetNames.join(', ')}` }, { status: 422 });
        }
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
        const ano = new Date().getFullYear();
        const records = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!Array.isArray(row))
                continue;
            const mes = parseMes(row[1]); // coluna B
            if (!mes)
                continue;
            // Colunas: C=PRODUZINDO, D=SETUP, E=PARADA, F=RETRAB, G=AMOSTRA, H=OCIOSA
            // Valores vêm em formato decimal (0-1); converte para percentual (0-100)
            const rec = {
                mes,
                ano,
                produzindo: num(row[2]) * 100, // C
                setup: num(row[3]) * 100, // D
                parada_maq: num(row[4]) * 100, // E
                retrabalho: num(row[5]) * 100, // F
                amostras: num(row[6]) * 100, // G
                ociosa: num(row[7]) * 100, // H
            };
            records.push(rec);
        }
        if (records.length === 0) {
            const sample = rows.slice(0, 10).map(r => Array.isArray(r) ? r.slice(0, 10) : r);
            return Response.json({ imported: 0, debugSample: sample, sheetName });
        }
        // Upsert por mês: remove registros existentes dos meses importados e recria
        const mesesImportados = [...new Set(records.map(r => r.mes))];
        for (const m of mesesImportados) {
            await db.asServiceRole.entities.Disponibilidade.deleteMany({ mes: m, ano });
        }
        const created = await db.asServiceRole.entities.Disponibilidade.bulkCreate(records);
        return Response.json({ imported: created.length, meses: mesesImportados, sheetName });
    }
    catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
