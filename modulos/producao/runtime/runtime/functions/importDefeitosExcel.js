const db = globalThis.__SMART_PRODUCAO_DB__;
import { createClientFromRequest } from '../server-shim.js';
function norm(v) {
    return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function num(v) {
    if (v == null || v === '')
        return 0;
    if (typeof v === 'number')
        return v;
    const s = String(v).trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
}
function dateIso(v) {
    if (v instanceof Date && !isNaN(v))
        return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
    if (typeof v === 'number' && v > 20000 && v < 80000) {
        const d = new Date(Math.round((v - 25569) * 86400 * 1000));
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }
    const s = String(v ?? '');
    let m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
        let y = +m[3];
        if (y < 100)
            y += 2000;
        return `${y}-${String(+m[2]).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`;
    }
    m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m)
        return `${m[1]}-${String(+m[2]).padStart(2, '0')}-${String(+m[3]).padStart(2, '0')}`;
    return null;
}
function findHeader(rows) {
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
        const hs = (rows[i] || []).map(norm);
        const score = hs.filter(h => /\bop\b|ordem|produto|defeito|refug|aprov|data/.test(h)).length;
        if (score >= 3)
            return i;
    }
    return -1;
}
function col(headers, patterns) {
    const hs = headers.map(norm);
    for (const p of patterns) {
        const i = hs.findIndex(h => p.test(h));
        if (i >= 0)
            return i;
    }
    return -1;
}
function defectParts(v) {
    const s = String(v ?? '').trim();
    const m = s.match(/(-?\d+(?:[.,]\d+)?)\s*(?:m|mt|mts|metros?)?/i);
    const metros = m ? num(m[1]) : 0;
    const defeito = s.replace(m?.[0] || '', '').replace(/^\s*[-–—:;]+|[-–—:;]+\s*$/g, '').trim() || s;
    return { defeito, metros_defeito: metros };
}
export default async function (req) {
    try {
        createClientFromRequest(req);
        const user = await db.auth.me();
        if (!user)
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const { file_url } = await req.json();
        if (!file_url)
            return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });
        const resp = await fetch(file_url);
        if (!resp.ok)
            return Response.json({ error: 'Falha ao ler o arquivo' }, { status: 502 });
        const XLSX = await import('xlsx');
        const wb = XLSX.read(new Uint8Array(await resp.arrayBuffer()), { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
        const hi = findHeader(rows);
        if (hi < 0)
            return Response.json({ error: 'Cabeçalho do relatório de defeitos não identificado.' }, { status: 422 });
        const h = rows[hi] || [];
        const cData = col(h, [/^data$/, /apont/]);
        const cOp = col(h, [/^op$/, /ordem.*produ/, /ordem.*fabric/]);
        const cProd = col(h, [/^produto$/, /codigo.*produto/, /^cod\.?/]);
        const cDesc = col(h, [/descri/]);
        const cQtdOp = col(h, [/qtd.*op/, /quant.*op/, /quantidade/]);
        const cAprov = col(h, [/qtd.*aprov/, /aprovada/, /metragem.*aprov/]);
        const cRef = col(h, [/qtd.*refug/, /refug/, /defeito/]);
        const records = [];
        let fallbackDate = null;
        for (let r = 0; r < hi; r++)
            for (const cell of rows[r] || [])
                fallbackDate || (fallbackDate = dateIso(cell));
        for (let i = hi + 1; i < rows.length; i++) {
            const row = rows[i] || [];
            const op = String(cOp >= 0 ? row[cOp] : '').trim();
            if (!op)
                continue;
            const data = (cData >= 0 ? dateIso(row[cData]) : null) || fallbackDate;
            if (!data)
                continue;
            const rawDef = cRef >= 0 ? row[cRef] : '';
            const dp = defectParts(rawDef);
            const qtdRef = cRef >= 0 ? num(rawDef) : 0;
            records.push({ data, op, produto: cProd >= 0 ? String(row[cProd] ?? '').trim() : '', descricao: cDesc >= 0 ? String(row[cDesc] ?? '').trim() : '', defeito: dp.defeito, metros_defeito: dp.metros_defeito || qtdRef, metragem: cAprov >= 0 ? num(row[cAprov]) : 0, qtd_op: cQtdOp >= 0 ? num(row[cQtdOp]) : 0, qtd_refug: qtdRef });
        }
        if (!records.length)
            return Response.json({ error: 'Nenhum registro de defeito encontrado no relatório.' }, { status: 422 });
        const dates = [...new Set(records.map(r => r.data))];
        for (const data of dates)
            await db.asServiceRole.entities.DefeitoProducao.deleteMany({ data });
        const created = await db.asServiceRole.entities.DefeitoProducao.bulkCreate(records);
        return Response.json({ imported: created.length, data: dates.length === 1 ? dates[0] : `${dates[0]} a ${dates[dates.length - 1]}`, registros: records });
    }
    catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
