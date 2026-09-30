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
    if (v instanceof Date) {
        return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
    }
    if (typeof v === 'number') {
        const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }
    const s = String(v).split(' ')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(s))
        return s;
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
        if (!file_url)
            return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });
        const resp = await fetch(file_url);
        if (!resp.ok)
            return Response.json({ error: 'Falha ao baixar o arquivo' }, { status: 502 });
        const buf = await resp.arrayBuffer();
        const XLSX = await import('xlsx');
        const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
        const sheetName = wb.SheetNames.find(n => {
            const norm = String(n).toUpperCase().replace(/\s+/g, '');
            return norm === 'DRE-DADOS' || norm === 'DREDADOS';
        });
        if (!sheetName)
            return Response.json({ error: 'Planilha "DRE -Dados" não encontrada.' }, { status: 422 });
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
        // Colunas: A=DATA(0), B=MÁQUINA(1), L=UTILIZAÇÃO(11), M=PRODUTIVIDADE(12),
        // N=EFICIÊNCIA PRODUÇÃO(13), O=EFICIÊNCIA SETUP(14), Q=MÁQUINA INOPERANTE(16)
        const records = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!Array.isArray(row))
                continue;
            const maquina = String(row[1] ?? '').trim();
            if (!maquina)
                continue;
            const data = parseDate(row[0]);
            if (!data)
                continue;
            records.push({
                data,
                maquina,
                col_c: num(row[2]),
                col_d: num(row[3]),
                col_e: num(row[4]),
                col_j: num(row[9]),
                col_k: num(row[10]),
                utilizacao: num(row[11]),
                produtividade: num(row[12]),
                eficiencia_producao: num(row[13]),
                eficiencia_setup: num(row[14]),
                maquina_inoperante: num(row[16]),
            });
        }
        if (records.length === 0) {
            return Response.json({ error: 'Nenhum dado encontrado na planilha.' }, { status: 422 });
        }
        await db.asServiceRole.entities.ProdutividadeDiaria.deleteMany({});
        const created = await db.asServiceRole.entities.ProdutividadeDiaria.bulkCreate(records);
        return Response.json({ imported: created.length });
    }
    catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
