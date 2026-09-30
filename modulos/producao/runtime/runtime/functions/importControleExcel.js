const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import { createClientFromRequest } from '../server-shim.js';
// Mapeamento de colunas (índice 0-based) conforme especificado pelo usuário:
// A=OP, D=Produto, F=Processo, H=Data, K=Metragem, Q=Hora Inicial, R=Hora Final, S=Tempo
const COL_OP = 0; // A
const COL_PRODUTO = 3; // D
const COL_PROCESSO = 5; // F
const COL_DATA = 7; // H
const COL_METRAGEM = 10; // K
const COL_HORA_INI = 16; // Q
const COL_HORA_FIN = 17; // R
const COL_TEMPO = 18; // S
function parseNum(v) {
    if (v == null || v === '')
        return 0;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
    return isNaN(n) ? 0 : n;
}
// Converte duração para HORAS (Excel datetime = fração de dia → v * 24)
function parseTempoHoras(v) {
    if (v == null || v === '')
        return 0;
    if (typeof v === 'number') {
        if (v === 0)
            return 0;
        if (v < 1)
            return Math.round(v * 24 * 1000) / 1000;
        if (v > 24)
            return Math.round((v / 60) * 1000) / 1000;
        return Math.round(v * 1000) / 1000;
    }
    const s = String(v).trim();
    const m = s.match(/(\d+):(\d{1,2})/);
    if (m) {
        const h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        return Math.round((h + min / 60) * 1000) / 1000;
    }
    const n = parseNum(v);
    if (n === 0)
        return 0;
    if (n < 1)
        return Math.round(n * 24 * 1000) / 1000;
    if (n > 24)
        return Math.round((n / 60) * 1000) / 1000;
    return n;
}
function parseDate(v) {
    if (v == null || v === '')
        return null;
    if (typeof v === 'number') {
        const d = new Date(Math.round((v - 25569) * 86400 * 1000));
        const y = d.getUTCFullYear();
        const mo = d.getUTCMonth() + 1;
        const da = d.getUTCDate();
        return `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
    }
    const s = String(v).trim();
    const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
        const dia = Number(m[1]);
        const mes = Number(m[2]);
        const ano = Number(m[3]);
        if (mes >= 1 && mes <= 12)
            return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }
    return null;
}
function parseHora(v) {
    if (v == null || v === '')
        return null;
    if (typeof v === 'number') {
        const totalMin = Math.round(v * 24 * 60);
        const h = Math.floor(totalMin / 60) % 24;
        const m = totalMin % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    const s = String(v).trim();
    const m = s.match(/(\d{1,2}):(\d{2})/);
    if (m)
        return `${String(m[1]).padStart(2, '0')}:${m[2]}`;
    return null;
}
function findHeaderRow(rows) {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const row = rows[i];
        if (!Array.isArray(row))
            continue;
        const joined = row.map((c) => String(c ?? '').toLowerCase()).join('|');
        if (/ord.*pro/.test(joined) || /n[úu]mero da ordem/.test(joined))
            return i;
    }
    return -1;
}
function extractDateFromHeader(rows) {
    const re = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
    for (const row of rows) {
        if (!Array.isArray(row))
            continue;
        for (const cell of row) {
            const s = String(cell ?? '');
            if (/apont/i.test(s)) {
                const m = s.match(re);
                if (m) {
                    const dia = Number(m[1]);
                    const mes = Number(m[2]);
                    const ano = Number(m[3]);
                    if (mes >= 1 && mes <= 12)
                        return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                }
            }
        }
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
        const maquina = body?.maquina;
        if (!file_url)
            return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });
        if (!maquina)
            return Response.json({ error: 'maquina é obrigatório' }, { status: 400 });
        const resp = await fetch(file_url);
        if (!resp.ok)
            return Response.json({ error: 'Falha ao baixar o arquivo' }, { status: 502 });
        const buf = await resp.arrayBuffer();
        const XLSX = await import('xlsx');
        const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
        const headerIdx = findHeaderRow(rows);
        if (headerIdx < 0)
            return Response.json({ error: 'Cabeçalho não encontrado no arquivo' }, { status: 422 });
        const fallbackDate = extractDateFromHeader(rows);
        const records = [];
        for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!Array.isArray(row))
                continue;
            const op = String(row[COL_OP] ?? '').trim();
            if (!op || /total/i.test(op))
                continue;
            // Exclui linhas com MISTURA na coluna F (processo)
            const processoRaw = String(row[COL_PROCESSO] ?? '').trim();
            const processoNorm = processoRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (/MISTURA/i.test(processoNorm))
                continue;
            const data = parseDate(row[COL_DATA]) || fallbackDate;
            const produto = String(row[COL_PRODUTO] ?? '').trim();
            const metragem = parseNum(row[COL_METRAGEM]);
            const hora_inicial = parseHora(row[COL_HORA_INI]);
            const hora_final = parseHora(row[COL_HORA_FIN]);
            const tempo = parseTempoHoras(row[COL_TEMPO]);
            const rec = {
                maquina,
                processo: processoRaw || undefined,
                num_op: op,
                descricao_produto: produto || undefined,
                metragem: metragem || undefined,
                hora_inicial: hora_inicial || undefined,
                hora_final: hora_final || undefined,
                data: data || undefined,
            };
            // Só inclui tempo se for maior que zero — evita anular o valor existente
            if (tempo > 0)
                rec.tempo = tempo;
            records.push(rec);
        }
        if (records.length === 0) {
            return Response.json({ error: 'Nenhum registro válido encontrado no arquivo' }, { status: 422 });
        }
        // JR: não busca registros existentes — apaga daquela máquina/data e cria novos.
        // Demais máquinas: upsert por (num_op + maquina + data), preservando setup/parada.
        let created = 0;
        let updated = 0;
        if (maquina === "JR") {
            const uniqueDates = [...new Set(records.map((r) => r.data).filter(Boolean))];
            for (const data of uniqueDates) {
                await db.asServiceRole.entities.ControleEficiencia.deleteMany({ maquina, data });
            }
            await db.asServiceRole.entities.ControleEficiencia.bulkCreate(records);
            created = records.length;
        }
        else {
            for (const rec of records) {
                const filter = { maquina };
                if (rec.num_op)
                    filter.num_op = rec.num_op;
                if (rec.data)
                    filter.data = rec.data;
                if (rec.processo)
                    filter.processo = rec.processo;
                const existing = await db.asServiceRole.entities.ControleEficiencia.filter(filter);
                if (existing.length > 0) {
                    // Atualiza mantendo setup/parada já importados
                    const { setup, parada, ...rest } = rec;
                    await db.asServiceRole.entities.ControleEficiencia.update(existing[0].id, rest);
                    updated++;
                }
                else {
                    await db.asServiceRole.entities.ControleEficiencia.create(rec);
                    created++;
                }
            }
        }
        return Response.json({ imported: created, updated, total: records.length, maquina });
    }
    catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
