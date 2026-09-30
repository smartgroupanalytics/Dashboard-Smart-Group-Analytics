const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import { createClientFromRequest } from '../server-shim.js';
function num(v) {
    if (v == null || v === '')
        return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
    return isNaN(n) ? null : n;
}
const MESES = {
    jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
    janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8,
    setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, '11': 11, '12': 12,
    '01': 1, '02': 2, '03': 3, '04': 4, '05': 5, '06': 6, '07': 7, '08': 8, '09': 9,
};
function parseMes(v) {
    if (v == null || v === '')
        return null;
    if (typeof v === 'number') {
        if (v >= 1 && v <= 12)
            return Math.round(v);
        // pode ser data serial do Excel
        const d = new Date(Math.round((v - 25569) * 86400 * 1000));
        if (!isNaN(d.getTime()))
            return d.getMonth() + 1;
        return null;
    }
    const s = String(v).trim().toLowerCase().replace(/[.º°]/g, '');
    if (MESES[s] != null)
        return MESES[s];
    // tenta interpretar como data
    const d = new Date(v);
    if (!isNaN(d.getTime()))
        return d.getMonth() + 1;
    // correspondência parcial
    for (const k in MESES) {
        if (s.startsWith(k) || k.startsWith(s))
            return MESES[k];
    }
    return null;
}
export default async function (req) {
    try {
        createClientFromRequest(req);
        const user = await db.auth.me();
        if (!user)
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const body = await req.json();
        const file_url = body?.file_url;
        const ano = Number(body?.ano) || 2026;
        if (!file_url)
            return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });
        if (![2025, 2026].includes(ano))
            return Response.json({ error: 'ano inválido (use 2025 ou 2026)' }, { status: 400 });
        const resp = await fetch(file_url);
        if (!resp.ok)
            return Response.json({ error: 'Falha ao baixar o arquivo' }, { status: 502 });
        const buf = await resp.arrayBuffer();
        const XLSX = await import('xlsx');
        const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
        const sheetName = wb.SheetNames.find((n) => /DADOS/i.test(n)) || wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
        // coluna B (índice 1) = ano, coluna C (índice 2) = mês,
        // coluna G (índice 6) = Metros de Quebra (numerador), coluna J (índice 9) = Qtde Ops (denominador)
        const field = ano === 2025 ? 'perda_2025' : 'perda_2026';
        const gField = ano === 2025 ? 'g_2025' : 'g_2026';
        const jField = ano === 2025 ? 'j_2025' : 'j_2026';
        // 2025 = linhas 2-13 (índices 1-12), 2026 = linhas 14-25 (índices 13-24)
        const rowStart = ano === 2025 ? 1 : 13;
        const rowEnd = ano === 2025 ? 13 : 25;
        const monthVals = {};
        for (let i = rowStart; i < rowEnd && i < rows.length; i++) {
            const row = rows[i];
            if (!Array.isArray(row))
                continue;
            const mes = parseMes(row[2]); // mês na coluna C
            if (mes == null)
                continue;
            const g = num(row[6]); // Metros de Quebra (coluna G)
            const j = num(row[9]); // Qtde Ops (coluna J)
            // perda = coluna G / coluna J (mesma linha); sem fallback
            if (g == null || j == null || j === 0)
                continue;
            const val = g / j;
            monthVals[mes] = { val, g, j };
        }
        const mesesImportados = Object.keys(monthVals).map(Number);
        if (mesesImportados.length === 0) {
            return Response.json({ error: 'Nenhum valor válido encontrado. Verifique o mês na coluna B e os valores nas colunas G (numerador) e J (denominador).' }, { status: 422 });
        }
        const existing = await db.asServiceRole.entities.PerdaOpMensal.list();
        const byMes = {};
        for (const r of existing) {
            if (r.mes)
                byMes[r.mes] = r;
        }
        const toUpdate = [];
        const toCreate = [];
        for (const mes of mesesImportados) {
            const { val, g, j } = monthVals[mes];
            const rec = byMes[mes];
            if (rec)
                toUpdate.push({ id: rec.id, [field]: val, [gField]: g, [jField]: j });
            else
                toCreate.push({ mes, [field]: val, [gField]: g, [jField]: j });
        }
        if (toUpdate.length)
            await db.asServiceRole.entities.PerdaOpMensal.bulkUpdate(toUpdate);
        if (toCreate.length)
            await db.asServiceRole.entities.PerdaOpMensal.bulkCreate(toCreate);
        return Response.json({ ano, imported: mesesImportados.length, meses: mesesImportados.sort((a, b) => a - b) });
    }
    catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
