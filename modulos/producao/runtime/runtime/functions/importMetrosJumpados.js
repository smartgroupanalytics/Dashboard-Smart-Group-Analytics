const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import { createClientFromRequest } from '../server-shim.js';
function num(v) {
    if (v == null || v === '')
        return 0;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
    return isNaN(n) ? 0 : n;
}
// Extrai a data de apontamento do cabeçalho (linha "C.custo: ...; Dt.apont: dd/mm/yyyy;")
function extractDate(rows) {
    const reDate = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
    for (const row of rows) {
        if (!Array.isArray(row))
            continue;
        for (const cell of row) {
            const s = String(cell ?? '');
            if (/apont/i.test(s)) {
                const m = s.match(reDate);
                if (m) {
                    const dia = Number(m[1]);
                    const mes = Number(m[2]);
                    const ano = Number(m[3]);
                    if (mes >= 1 && mes <= 12)
                        return { dia, mes, ano };
                }
            }
        }
    }
    // Fallback: primeira data válida
    for (const row of rows) {
        if (!Array.isArray(row))
            continue;
        for (const cell of row) {
            const s = String(cell ?? '');
            const m = s.match(reDate);
            if (m) {
                const mes = Number(m[2]);
                const ano = Number(m[3]);
                if (mes >= 1 && mes <= 12)
                    return { dia: Number(m[1]), mes, ano };
            }
        }
    }
    return null;
}
function aggregate(rows) {
    const date = extractDate(rows);
    if (!date)
        return null;
    // Coluna K = índice 10
    const METERS_COL = 10;
    let total = 0;
    let ops = 0;
    let headerFound = false;
    const opHeaderRe = /n[úu]mero da ordem|ordem de (produ[çc][ãa]o|fabrica[çc][ãa]o)/i;
    const totalRe = /^#total/i;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row))
            continue;
        const s0 = String(row[0] ?? '').trim();
        // Marca que encontramos o cabeçalho de colunas
        if (opHeaderRe.test(s0)) {
            headerFound = true;
            continue;
        }
        // Pula linhas de total para não contar duplicado
        if (totalRe.test(s0))
            continue;
        // Só conta linhas de dados após o cabeçalho
        if (!headerFound)
            continue;
        // OP na coluna A deve ser numérica
        const opVal = row[0];
        if (opVal == null || opVal === '')
            continue;
        const opNum = typeof opVal === 'number' ? opVal : Number(String(opVal).replace(/[^\d]/g, ''));
        if (isNaN(opNum) || opNum === 0)
            continue;
        // Metragem na coluna K
        const meters = num(row[METERS_COL]);
        if (meters > 0) {
            total += meters;
            ops++;
        }
    }
    const data = `${date.ano}-${String(date.mes).padStart(2, '0')}-${String(date.dia).padStart(2, '0')}`;
    return {
        data,
        mes: date.mes,
        ano: date.ano,
        metros_jumpados: Math.round(total * 100) / 100,
        ops,
    };
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
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
        const record = aggregate(rows);
        if (!record) {
            return Response.json({ error: 'Não foi possível identificar uma data de apontamento no relatório.' }, { status: 422 });
        }
        if (record.ops === 0 || record.metros_jumpados === 0) {
            return Response.json({ error: 'Nenhum valor de metragem encontrado na coluna K do relatório.' }, { status: 422 });
        }
        // Remove registro existente da mesma data e recria
        await db.asServiceRole.entities.EntradaMaterial.deleteMany({ data: record.data });
        const created = await db.asServiceRole.entities.EntradaMaterial.bulkCreate([record]);
        return Response.json({ imported: created.length, registros: [record] });
    }
    catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
