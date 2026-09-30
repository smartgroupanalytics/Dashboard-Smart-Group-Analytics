const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import { createClientFromRequest } from '../server-shim.js';
function num(v) {
    if (v == null || v === '')
        return 0;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
    return isNaN(n) ? 0 : n;
}
function normalizeMachine(maquina) {
    const s = String(maquina ?? '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (s === 'GR 2' || s === 'GR2' || s === 'GR')
        return 'GR2';
    if (s === 'GRAVADORA')
        return 'Gravadora';
    if (s === 'JR')
        return 'JR';
    if (s === 'ESTAMPA 1' || s === 'ESTAMPA1')
        return 'Estampa 1';
    if (s === 'ESTAMPA 2' || s === 'ESTAMPA2')
        return 'Estampa 2';
    if (s === 'DIGITAL SOLV' || s === 'DIGITAL SOLVENTE')
        return 'Digital Solvente';
    if (s === 'DIGITAL UV')
        return 'Digital UV';
    return String(maquina ?? '').trim();
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
        // Lê a primeira aba
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
        if (rows.length < 2) {
            return Response.json({ error: 'Planilha vazia ou sem dados' }, { status: 422 });
        }
        // Cabeçalho na primeira linha
        const header = rows[0].map((c) => String(c ?? '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
        // Encontra colunas por nome do cabeçalho
        const colMaq = header.findIndex((h) => h === 'RESOURCENAME');
        const colProd = header.findIndex((h) => h === 'PRODUCTIONTIME');
        const colSetup = header.findIndex((h) => h === 'SETUP');
        const colData = header.findIndex((h) => h === 'DELIVERYDATE');
        const colMetragem = header.findIndex((h) => h === 'QUANTITY');
        const colOp = header.findIndex((h) => h === 'PRODUCTIONORDERNAME');
        if (colMaq < 0) {
            return Response.json({
                error: 'Coluna "ResourceName" (máquina) não encontrada. Cabeçalhos: ' + header.join(', ')
            }, { status: 422 });
        }
        // Agrupa por máquina
        const maquinasMap = new Map();
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!Array.isArray(row))
                continue;
            const maquinaRaw = row[colMaq];
            const maquina = String(maquinaRaw ?? '').trim();
            if (!maquina)
                continue;
            const key = normalizeMachine(maquina);
            if (!maquinasMap.has(key)) {
                maquinasMap.set(key, {
                    maquina: key,
                    rotatividade: 0,
                    tempo_setup: 0,
                    tempo_producao: 0,
                    dias_necessarios: 0,
                    num_op: 0,
                    _datas: new Set(),
                    _ops: new Set(),
                });
            }
            const m = maquinasMap.get(key);
            m.tempo_producao += colProd >= 0 ? num(row[colProd]) : 0;
            m.tempo_setup += colSetup >= 0 ? num(row[colSetup]) : 0;
            m.rotatividade += colMetragem >= 0 ? num(row[colMetragem]) : 0;
            if (colData >= 0 && row[colData])
                m._datas.add(String(row[colData]).trim());
            if (colOp >= 0 && row[colOp])
                m._ops.add(String(row[colOp]).trim());
        }
        // Finaliza agregação
        const records = Array.from(maquinasMap.values()).map((m) => {
            m.dias_necessarios = m._datas.size;
            m.num_op = m._ops.size;
            delete m._datas;
            delete m._ops;
            return m;
        });
        if (records.length === 0) {
            return Response.json({ error: 'Nenhum registro válido encontrado' }, { status: 422 });
        }
        // Apaga registros existentes e cria novos
        await db.asServiceRole.entities.CargaMaquina.deleteMany({});
        await db.asServiceRole.entities.CargaMaquina.bulkCreate(records);
        return Response.json({ imported: records.length, registros: records });
    }
    catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
