const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import { createClientFromRequest } from '../server-shim.js';
function num(v) {
    if (v == null || v === '')
        return 0;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
    return isNaN(n) ? 0 : n;
}
function parseDate(v) {
    if (v == null || v === '')
        return null;
    if (typeof v === 'number') {
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const d = new Date(epoch.getTime() + v * 24 * 60 * 60 * 1000);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }
    const s = String(v).trim();
    const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
        const dd = String(m[1]).padStart(2, '0');
        const mm = String(m[2]).padStart(2, '0');
        return `${m[3]}-${mm}-${dd}`;
    }
    return null;
}
function classify(raw) {
    const s = String(raw ?? '').trim().toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (s.includes('VENDA'))
        return 'VENDA';
    if (s.includes('BENEFICIAMENTO') || s.includes('BENEF'))
        return 'BENEFICIAMENTO';
    if (s.includes('ESTOQUE') || s.includes('ESTOQ'))
        return 'ESTOQUE';
    return 'ESTOQUE'; // default
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
        // Encontra a linha de cabeçalho
        let headerIdx = -1;
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const row = Array.isArray(rows[i]) ? rows[i] : [];
            for (let c = 0; c < Math.min(row.length, 5); c++) {
                const s = String(row[c] ?? '').toLowerCase();
                if (s.includes('ordem') && (s.includes('produ') || s.includes('numero'))) {
                    headerIdx = i;
                    break;
                }
            }
            if (headerIdx >= 0)
                break;
        }
        if (headerIdx < 0)
            headerIdx = 3;
        // Extrai registros
        const records = [];
        const dates = new Set();
        for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = Array.isArray(rows[i]) ? rows[i] : [];
            const op = String(row[0] ?? '').trim();
            const data = parseDate(row[7]);
            const qtd = num(row[10]);
            const classificacao = classify(row[15]);
            if (!op || op === '' || qtd === 0)
                continue;
            if (/total/i.test(op))
                continue;
            if (!data)
                continue;
            records.push({ op, data, qtd_revisada: Math.round(qtd * 100) / 100, classificacao });
            dates.add(data);
        }
        if (records.length === 0) {
            return Response.json({ error: 'Nenhum registro válido encontrado. Verifique as colunas A (OP), H (Data), K (Qtd.aprovada) e P (Tipo de produção).' }, { status: 422 });
        }
        // Remove registros existentes das mesmas datas e recria
        for (const d of dates) {
            await db.asServiceRole.entities.PedidoRevisao.deleteMany({ data: d });
        }
        await db.asServiceRole.entities.PedidoRevisao.bulkCreate(records);
        // Distribuição por classificação
        const dist = {};
        for (const r of records) {
            dist[r.classificacao] = (dist[r.classificacao] || 0) + 1;
        }
        return Response.json({
            imported: records.length,
            dates: Array.from(dates).sort(),
            distribution: dist,
        });
    }
    catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
