const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import { createClientFromRequest } from '../server-shim.js';
function num(v) {
    if (v == null || v === '')
        return 0;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
    return isNaN(n) ? 0 : n;
}
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
        const sheetName = wb.SheetNames.find(n => String(n).toUpperCase().trim() === 'ROTATIVIDADE');
        if (!sheetName)
            return Response.json({ error: 'Planilha "ROTATIVIDADE" não encontrada.' }, { status: 422 });
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
        const records = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!Array.isArray(row))
                continue;
            const mesNum = num(row[0]);
            if (mesNum < 1 || mesNum > 12)
                continue;
            const record = {
                mes: mesNum,
                rotatividade_2025: num(row[2]),
                rotatividade_2026: num(row[3]),
                produzido_2025: num(row[4]),
                produzido_2026: num(row[5]),
                revisado_2025: num(row[6]),
                revisado_2026: num(row[7]),
            };
            if (record.rotatividade_2025 || record.rotatividade_2026 || record.produzido_2025 || record.produzido_2026 || record.revisado_2025 || record.revisado_2026) {
                records.push(record);
            }
        }
        if (records.length === 0) {
            return Response.json({ error: 'Nenhum dado encontrado na planilha ROTATIVIDADE.' }, { status: 422 });
        }
        await db.asServiceRole.entities.RotatividadeMensal.deleteMany({});
        const created = await db.asServiceRole.entities.RotatividadeMensal.bulkCreate(records);
        return Response.json({ imported: created.length, registros: records });
    }
    catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
