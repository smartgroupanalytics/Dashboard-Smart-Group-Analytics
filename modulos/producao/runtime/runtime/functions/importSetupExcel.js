const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import { createClientFromRequest } from '../server-shim.js';
// Mapeia "Descrição recurso ativo" (coluna O) para a máquina do dashboard.
// SOLVENTE é verificado ANTES de UV para não corresponder errado.
function maquinaPorNome(nome) {
    const raw = String(nome ?? '').trim().toUpperCase();
    if (!raw)
        return null;
    const s = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const compact = s.replace(/\s+/g, '');
    if (s.includes('GRAVADORA'))
        return 'Gravadora';
    if (s.includes('ESTAMPA 1') || compact === 'ESTAMPA1')
        return 'Estampa 1';
    if (s.includes('ESTAMPA 2') || compact === 'ESTAMPA2')
        return 'Estampa 2';
    // SOLVENTE explícito primeiro (ex.: "DIGITAL SOLVENTE")
    if (s.includes('SOLVENTE'))
        return 'Digital Solvente';
    // UV explícito (ex.: "DIGITAL UV")
    if (s.includes('UV'))
        return 'Digital UV';
    const grNorm = compact.replace(/[^A-Z0-9]/g, '');
    if (s.includes('GR/SM') || /^GR[\s\-\.\/]*0?\d?$/.test(raw) || grNorm === 'GR1' || grNorm === 'GR01' || grNorm === 'GR2' || grNorm === 'GR02' || grNorm === 'GRSM' || grNorm === 'GRSM1' || grNorm === 'GRSM2' || s.includes('GR 1') || s.includes('GR-1') || s.includes('GR 2') || s.includes('GR-2') || s.includes('GR 02') || s.includes('GR SM'))
        return 'GR2';
    if (s.includes('CALANDRA'))
        return 'GR2';
    if (s === 'JR' || s.includes('JR'))
        return 'JR';
    if (s.includes('RAMA'))
        return 'JR';
    if (s.includes('RECOBRIMENTO'))
        return 'JR';
    return null;
}
// "0000:47" -> 47 min -> 0.783h ; "0001:23" -> 1h23 -> 1.383h
function parseDuracao(v) {
    if (v == null || v === '')
        return 0;
    if (typeof v === 'number') {
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
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    if (isNaN(n))
        return 0;
    if (n > 24)
        return Math.round((n / 60) * 1000) / 1000;
    return Math.round(n * 1000) / 1000;
}
function parseDateCell(v) {
    if (v == null || v === '')
        return null;
    if (typeof v === 'number') {
        if (v === 0)
            return null;
        const intPart = Math.floor(v);
        if (intPart <= 1)
            return null;
        const ms = Math.round((intPart - 25569) * 86400 * 1000);
        const d = new Date(ms);
        const y = d.getUTCFullYear();
        const mo = d.getUTCMonth() + 1;
        const da = d.getUTCDate();
        return `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
    }
    const s = String(v).trim();
    const m1 = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m1)
        return `${m1[3]}-${m1[2]}-${m1[1]}`;
    const m2 = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m2)
        return `${m2[1]}-${m2[2]}-${m2[3]}`;
    return null;
}
// "420 m", "420 mt", "420 mts", "420" -> 420
function parseMetragem(v) {
    if (v == null || v === '')
        return 0;
    if (typeof v === 'number')
        return v;
    const s = String(v).trim().replace(',', '.');
    const m = s.match(/(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : 0;
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
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
        let headerIdx = -1;
        for (let i = 0; i < Math.min(rows.length, 30); i++) {
            const row = rows[i];
            if (!Array.isArray(row))
                continue;
            const joined = row.map((c) => String(c ?? '').toLowerCase()).join('|');
            if (joined.includes('duracao') || joined.includes('recurso ativo') || joined.includes('op')) {
                headerIdx = i;
                break;
            }
        }
        if (headerIdx < 0)
            headerIdx = 0;
        // COLUNAS MESTRES:
        // G (6) = Máquina | L (11) = Duração | K (10) = Hora Final (fonte da data)
        // M (12) = Descrição/Motivo | P (15) = Metragem
        const colRecurso = 6;
        const colDuracao = 11;
        const colData = 10;
        const colRetrab = 12;
        const colMetragem = 15;
        const porMaquina = {};
        const emptyRecursoDates = new Set();
        for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!Array.isArray(row))
                continue;
            const recurso = String(row[colRecurso] ?? '').trim();
            if (!recurso) {
                const data = parseDateCell(row[colData]);
                if (!data)
                    continue;
                emptyRecursoDates.add(data);
                continue;
            }
            const maq = maquinaPorNome(recurso);
            if (!maq)
                continue;
            const data = parseDateCell(row[colData]);
            if (!data)
                continue;
            const dur = parseDuracao(row[colDuracao]);
            if (!dur)
                continue;
            const descr = String(row[colRetrab] ?? '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (descr.includes('REFEICAO'))
                continue;
            const isMaterialProduzido = descr.includes('MATERIAL PRODUZIDO');
            const isRetrabalho = descr.includes('RETRABALHO');
            const isAmostraLab = descr.includes('AMOSTRA') && descr.includes('LAB');
            const isSetup = descr.includes('SETUP') || descr.includes('PREPARACAO') || descr.includes('TROCA');
            const isFaltaOp = descr.includes('FALTA DE OP') || descr.includes('FALTA DE PEDIDO') || descr.includes('FALTA PEDIDO');
            const key = `${data}|${maq}`;
            if (!porMaquina[key])
                porMaquina[key] = { data, maquina: maq, tempo_parado: 0, setup: 0, amostras: 0, retrabalho: 0, tempo_ocioso: 0, tempo_produzido: 0, metros_realizados: 0 };
            // MATERIAL PRODUZIDO -> tempo_produzido (coluna L) + metros (coluna P). Não conta como setup/parada/retrabalho/amostras/ocioso.
            if (isMaterialProduzido) {
                porMaquina[key].tempo_produzido = (porMaquina[key].tempo_produzido || 0) + dur;
                porMaquina[key].metros_realizados = (porMaquina[key].metros_realizados || 0) + parseMetragem(row[colMetragem]);
            }
            else if (isFaltaOp) {
                porMaquina[key].tempo_ocioso = (porMaquina[key].tempo_ocioso || 0) + dur;
            }
            else if (isAmostraLab) {
                porMaquina[key].amostras = (porMaquina[key].amostras || 0) + dur;
            }
            else if (isRetrabalho) {
                porMaquina[key].retrabalho = (porMaquina[key].retrabalho || 0) + dur;
            }
            else if (isSetup) {
                porMaquina[key].setup = (porMaquina[key].setup || 0) + dur;
            }
            else {
                porMaquina[key].tempo_parado += dur;
            }
        }
        const MAQUINAS = ['JR', 'Gravadora', 'Estampa 1', 'Estampa 2', 'Digital Solvente', 'Digital UV', 'GR2'];
        const tempoOciosoPadrao = (maq) => maq === 'Estampa 1' ? 1.533 : 8.8;
        const datasImportadas = Array.from(new Set(Object.values(porMaquina).map((r) => r.data)));
        const existingMap = {};
        for (const data of datasImportadas) {
            const existing = await db.asServiceRole.entities.DesempenhoMaquina.filter({ data });
            for (const r of existing) {
                existingMap[`${r.data}|${r.maquina}`] = r;
            }
        }
        const hasProdOrSetup = (data, maq) => {
            const key = `${data}|${maq}`;
            if (porMaquina[key] && ((porMaquina[key].setup || 0) > 0))
                return true;
            const ex = existingMap[key];
            if (ex && ((ex.tempo_produzido || 0) > 0 || (ex.setup || 0) > 0))
                return true;
            return false;
        };
        const agoraSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const aplicarComplemento = (agoraSP.getHours() + agoraSP.getMinutes() / 60) >= 17;
        for (const data of datasImportadas) {
            if (aplicarComplemento && emptyRecursoDates.has(data)) {
                const key = `${data}|Digital Solvente`;
                if (!porMaquina[key])
                    porMaquina[key] = { data, maquina: 'Digital Solvente', tempo_parado: 0, setup: 0, amostras: 0, retrabalho: 0, tempo_ocioso: 0 };
                if (!hasProdOrSetup(data, 'Digital Solvente')) {
                    porMaquina[key].tempo_ocioso = (porMaquina[key].tempo_ocioso || 0) + 8.8;
                }
                else {
                    porMaquina[key].tempo_ocioso = 0;
                }
            }
            if (aplicarComplemento) {
                for (const maq of MAQUINAS) {
                    const key = `${data}|${maq}`;
                    if (!porMaquina[key]) {
                        if (hasProdOrSetup(data, maq)) {
                            porMaquina[key] = { data, maquina: maq, tempo_parado: 0, tempo_ocioso: 0, setup: 0, amostras: 0, retrabalho: 0 };
                        }
                        else {
                            porMaquina[key] = { data, maquina: maq, tempo_parado: 0, tempo_ocioso: tempoOciosoPadrao(maq), setup: 0, amostras: 0, retrabalho: 0 };
                        }
                    }
                }
            }
        }
        const registros = Object.values(porMaquina).map((r) => ({
            ...r,
            tempo_parado: Math.round((r.tempo_parado || 0) * 1000) / 1000,
            setup: Math.round((r.setup || 0) * 1000) / 1000,
            amostras: Math.round((r.amostras || 0) * 1000) / 1000,
            retrabalho: Math.round((r.retrabalho || 0) * 1000) / 1000,
            tempo_ocioso: Math.round((r.tempo_ocioso || 0) * 1000) / 1000,
            tempo_produzido: Math.round((r.tempo_produzido || 0) * 1000) / 1000,
            metros_realizados: Math.round((r.metros_realizados || 0) * 100) / 100,
        }));
        if (registros.length === 0) {
            return Response.json({ error: 'Nenhum dado de setup/parada encontrado.' }, { status: 422 });
        }
        let imported = 0;
        for (const r of registros) {
            const existing = await db.asServiceRole.entities.DesempenhoMaquina.filter({ data: r.data, maquina: r.maquina });
            const hasMatProd = (r.tempo_produzido || 0) > 0 || (r.metros_realizados || 0) > 0;
            if (existing.length) {
                const updateData = {
                    tempo_parado: r.tempo_parado,
                    setup: r.setup || 0,
                    amostras: r.amostras || 0,
                    retrabalho: r.retrabalho || 0,
                    tempo_ocioso: r.tempo_ocioso || 0,
                };
                if (hasMatProd) {
                    updateData.tempo_produzido = Math.round((((existing[0].tempo_produzido || 0) + r.tempo_produzido) || 0) * 1000) / 1000;
                    updateData.metros_realizados = Math.round((((existing[0].metros_realizados || 0) + r.metros_realizados) || 0) * 100) / 100;
                }
                await db.asServiceRole.entities.DesempenhoMaquina.update(existing[0].id, updateData);
            }
            else {
                await db.asServiceRole.entities.DesempenhoMaquina.create({
                    data: r.data,
                    maquina: r.maquina,
                    tempo_parado: r.tempo_parado,
                    tempo_ocioso: r.tempo_ocioso || 0,
                    setup: r.setup || 0,
                    amostras: r.amostras || 0,
                    retrabalho: r.retrabalho || 0,
                    tempo_produzido: r.tempo_produzido || 0,
                    metros_realizados: r.metros_realizados || 0,
                    num_ops: 0,
                });
            }
            imported++;
        }
        return Response.json({
            imported,
            datas: registros.map((r) => r.data).filter((v, i, a) => a.indexOf(v) === i).sort(),
            registros,
        });
    }
    catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
