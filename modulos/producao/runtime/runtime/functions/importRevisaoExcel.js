const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import { createClientFromRequest } from '../server-shim.js';
const MESES = {
    janeiro: 1, janeiro: 1, fevereiro: 2, fevereiro: 2, marco: 3, marco: 3, março: 3,
    abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
    jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};
function num(v) {
    if (v == null || v === '')
        return 0;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
    return isNaN(n) ? 0 : n;
}
function extractDate(rows) {
    const reDate = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
    for (const row of rows) {
        for (const cell of row) {
            const s = String(cell ?? '');
            if (/apont/i.test(s)) {
                const m = s.match(reDate);
                if (m) {
                    const dia = Number(m[1]);
                    const mes = Number(m[2]);
                    const ano = Number(m[3]);
                    if (mes >= 1 && mes <= 12)
                        return { mes, ano, dia };
                }
            }
        }
    }
    for (const row of rows) {
        for (const cell of row) {
            const s = String(cell ?? '');
            const m = s.match(reDate);
            if (m) {
                const mes = Number(m[2]);
                const ano = Number(m[3]);
                if (mes >= 1 && mes <= 12)
                    return { mes, ano, dia: Number(m[1]) };
            }
        }
    }
    return null;
}
function isDataCell(v) {
    return v != null && v !== '' && typeof v === 'number' && !isNaN(v);
}
function aggregate(rows) {
    const date = extractDate(rows);
    if (!date)
        return null;
    let revisado = 0;
    let refugado = 0;
    let ops = 0;
    const opRe = /Ordem de (Produção|Fabricação)/i;
    const totalRe = /^#total/i;
    const detalhes = [];
    let currentOP = null;
    let currentDesc = '';
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row))
            continue;
        const c0 = row[0];
        const c2 = row[2];
        const c3 = row[3];
        const s0 = String(c0 ?? '');
        if (opRe.test(s0)) {
            ops++;
            const m = s0.match(/(\d{4,})/);
            const opNum = m ? m[1] : s0.replace(/Ordem de (Produção|Fabricação)[:\s]*/i, '').trim();
            currentOP = opNum;
            // Produto e descrição estão na linha imediatamente abaixo da OP
            const nextRow = rows[i + 1];
            const descParts = Array.isArray(nextRow)
                ? nextRow.map((c) => String(c ?? '').trim()).filter((x) => x !== '')
                : [];
            currentDesc = descParts.join(' - ');
        }
        if (totalRe.test(s0.trim()) && isDataCell(c2)) {
            revisado += Number(c2);
            const ref = isDataCell(c3) ? Number(c3) : 0;
            if (ref)
                refugado += ref;
            if (currentOP) {
                detalhes.push({
                    op: String(currentOP),
                    descricao: currentDesc,
                    qtd_revisada: Math.round(Number(c2) * 100) / 100,
                    qtd_refugo: Math.round(ref * 100) / 100,
                });
                currentOP = null;
                currentDesc = '';
            }
        }
    }
    const data = `${date.ano}-${String(date.mes).padStart(2, '0')}-${String(date.dia).padStart(2, '0')}`;
    return {
        mes: date.mes,
        ano: date.ano,
        data,
        metros_jumpados: Math.round((revisado + refugado) * 100) / 100,
        metros_revisados: Math.round(revisado * 100) / 100,
        metros_1: Math.round((revisado - refugado) * 100) / 100,
        metros_quebra: Math.round(refugado * 100) / 100,
        ops_revisadas: ops,
        detalhes,
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
        if (record.ops_revisadas === 0 && record.metros_revisados === 0) {
            return Response.json({ error: 'Nenhum dado de produção encontrado no relatório.' }, { status: 422 });
        }
        await db.asServiceRole.entities.Revisao.deleteMany({ data: record.data });
        const created = await db.asServiceRole.entities.Revisao.bulkCreate([record]);
        // Detalhes por OP (substitui os existentes da mesma data)
        await db.asServiceRole.entities.DetalheRevisaoOP.deleteMany({ data: record.data });
        if (record.detalhes.length > 0) {
            const detalhesToCreate = record.detalhes.map((d) => ({ ...d, data: record.data }));
            await db.asServiceRole.entities.DetalheRevisaoOP.bulkCreate(detalhesToCreate);
        }
        return Response.json({ imported: created.length, registros: [record], detalhes: record.detalhes.length });
    }
    catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
