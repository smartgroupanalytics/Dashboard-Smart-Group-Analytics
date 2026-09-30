const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import { createClientFromRequest } from '../server-shim.js';
// Mapeia "Descrição recurso ativo" (coluna O) para a máquina do dashboard
function maquinaPorNome(nome) {
    const raw = String(nome ?? '').trim().toUpperCase();
    if (!raw)
        return null;
    const s = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const compact = s.replace(/\s+/g, '');
    if (s.includes('GRAVADORA'))
        return 'Gravadora';
    const estampaNorm = compact.replace(/[^A-Z0-9]/g, '');
    if (estampaNorm === 'ESTAMPA1' || estampaNorm === 'ESTAMPA01' || s.includes('ESTAMPA 1') || s.includes('ESTAMPA 01') || s.includes('ESTAMPA-1'))
        return 'Estampa 1';
    if (estampaNorm === 'ESTAMPA2' || estampaNorm === 'ESTAMPA02' || s.includes('ESTAMPA 2') || s.includes('ESTAMPA 02') || s.includes('ESTAMPA-2'))
        return 'Estampa 2';
    if (s.includes('SOLVENTE'))
        return 'Digital Solvente';
    if (s.includes('DIGITAL UV') || s.includes('UV'))
        return 'Digital UV';
    if (s.includes('IMPRESS') && s.includes('DIGITAL'))
        return 'Digital UV';
    const grNorm = compact.replace(/[^A-Z0-9]/g, '');
    if (s.includes('GR/SM') || /^GR[\s\-\.\/]*0?\d?$/.test(raw) || grNorm === 'GR1' || grNorm === 'GR01' || grNorm === 'GR2' || grNorm === 'GR02' || grNorm === 'GRSM2' || grNorm === 'GRSM1' || s.includes('GR 1') || s.includes('GR-1') || s.includes('GR 2') || s.includes('GR-2') || s.includes('GR 02'))
        return 'GR2';
    if (s === 'JR' || s.includes('JR'))
        return 'JR';
    if (s.includes('RAMA'))
        return 'JR';
    if (s.includes('RECOBRIMENTO'))
        return 'JR';
    if (s.includes('TUMBLER'))
        return 'Tumbler';
    return null;
}
// Converte valor da coluna L (tempo) para MINUTOS
// Formato "H:MM" (ex: "0:12" = 12 min, "1:30" = 90 min) ou fração de dia do Excel
function parseTempoMinutos(v) {
    if (v == null || v === '')
        return 0;
    if (typeof v === 'number') {
        if (v === 0)
            return 0;
        // Fração de dia (Excel) → minutos = v * 24 * 60
        if (v < 1)
            return Math.round(v * 24 * 60 * 1000) / 1000;
        // Número > 1 = minutos direto
        return Math.round(v * 1000) / 1000;
    }
    const s = String(v).trim();
    // String "H:MM" ou "HH:MM" → minutos = h*60 + min
    const m = s.match(/(\d+):(\d{1,2})/);
    if (m) {
        const h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        return Math.round((h * 60 + min) * 1000) / 1000;
    }
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    if (isNaN(n) || n === 0)
        return 0;
    return n;
}
// Extrai "HH:MM" de um valor de hora (coluna J ou K)
// Aceita "11:57", "11:57:00", "20/08/2026 11:57:00", ou serial Excel
function parseHora(v) {
    if (v == null || v === '')
        return '';
    if (typeof v === 'number') {
        if (v === 0)
            return '';
        // Fração de dia → minutos do dia
        if (v < 1) {
            const totalMin = Math.round(v * 24 * 60);
            const h = Math.floor(totalMin / 60) % 24;
            const m = totalMin % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        return '';
    }
    const s = String(v).trim();
    // "11:57" ou "11:57:00" ou "20/08/2026 11:57:00"
    const m = s.match(/(\d{1,2}):(\d{2})/);
    if (m)
        return `${m[1].padStart(2, '0')}:${m[2]}`;
    return '';
}
// Extrai data (YYYY-MM-DD) de um valor que pode conter datetime
// Ex: "20/08/2026 12:09:00", "20/08/2026", serial Excel
function parseDataFromValue(v) {
    if (v == null || v === '')
        return '';
    if (typeof v === 'number') {
        if (v === 0)
            return '';
        // Serial Excel (dias desde 1899-12-30) — só a parte inteira é a data
        const intPart = Math.floor(v);
        if (intPart <= 1)
            return '';
        const ms = Math.round((intPart - 25569) * 86400 * 1000);
        const date = new Date(ms);
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const s = String(v).trim();
    // "20/08/2026 12:09:00" → "2026-08-20"
    const m1 = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m1)
        return `${m1[3]}-${m1[2]}-${m1[1]}`;
    // "2026-08-20" ou "2026-08-20 12:09:00"
    const m2 = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m2)
        return `${m2[1]}-${m2[2]}-${m2[3]}`;
    return '';
}
// "420 m", "420 mt", "420 mts", "420" -> 420 (metros)
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
        // Localiza a linha de cabeçalho
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
        // Colunas fixas:
        // E (4) = Processo | G (6) = Máquina | M (12) = Descrição/Motivo | Q (16) = OP
        // P (15) = Metros | J (9) = Hora Inicial | K (10) = Hora Final | L (11) = Tempo (duração)
        const colProcesso = 4;
        const colRecurso = 6;
        const colDescr = 12;
        const colOp = 16;
        const colMetros = 15;
        const colHoraIni = 9; // J
        const colHoraFim = 10; // K
        const colTempo = 11; // L
        const colDescrProduto = 19; // T — descrição do produto (retrabalho)
        // Agrega por (OP, máquina): setup vs parada vs material produzido
        const porOp = {};
        const diag = { unmapped: [], emptyOp: [], noData: [], matProdRows: [] };
        for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!Array.isArray(row))
                continue;
            const recurso = String(row[colRecurso] ?? '').trim();
            const op = String(row[colOp] ?? '').trim();
            if (!recurso || !op || /total/i.test(op)) {
                if (recurso || op)
                    diag.emptyOp.push({ linha: i + 1, recurso, op });
                continue;
            }
            // Descrição (coluna M) — lida antes do mapeamento da máquina
            const descr = String(row[colDescr] ?? '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (descr.includes('REFEICAO'))
                continue;
            // Retrabalho: marca o registro mas não conta o tempo como produzido
            const isRetrabalho = descr.includes('RETRABALHO') || descr.includes('RETRAB') || descr.includes('RE TRABALHO');
            const isSetup = descr.includes('SETUP') || descr.includes('PREPARACAO') || descr.includes('TROCA');
            // "MATERIAL PRODUZIDO" ou "MAQUINA PRODUZINDO" (coluna M) -> produção.
            // A máquina vem da coluna G.
            const isMaterialProduzido = descr.includes('MATERIAL PRODUZIDO') || descr.includes('MAQUINA PRODUZINDO');
            // Metros da coluna P (apenas para material produzido)
            const metros = isMaterialProduzido ? parseMetragem(row[colMetros]) : 0;
            let maq = maquinaPorNome(recurso);
            if (!maq) {
                // INCLUIR EM TODAS AS MÁQUINAS: se for MATERIAL PRODUZIDO com metragem,
                // usa o nome da coluna G normalizado como máquina (fallback) em vez de pular.
                if (isMaterialProduzido && metros > 0) {
                    maq = recurso.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
                }
                else {
                    diag.unmapped.push({ linha: i + 1, recurso, op });
                    continue;
                }
            }
            // Tempo (duração) da coluna L em minutos
            const durMin = parseTempoMinutos(row[colTempo]);
            // Hora inicial (J) e hora final (K) como "HH:MM"
            const horaIni = parseHora(row[colHoraIni]);
            const horaFim = parseHora(row[colHoraFim]);
            // Data extraída de K (ou J) se contiver datetime
            let data = parseDataFromValue(row[colHoraFim]);
            if (!data)
                data = parseDataFromValue(row[colHoraIni]);
            // Pula linhas sem duração, EXCETO material produzido com metragem (captura os metros mesmo sem tempo)
            if (!durMin && !(isMaterialProduzido && metros > 0)) {
                diag.noData.push({ linha: i + 1, recurso, op, descr: descr.slice(0, 40), durMin, metros });
                continue;
            }
            if (isMaterialProduzido)
                diag.matProdRows.push({ linha: i + 1, maquina: maq, op, metros, durMin });
            // Processo da coluna E
            const processo = String(row[colProcesso] ?? '').trim() || '';
            // Descrição do produto da coluna T (para retrabalho)
            const descrProdutoRetrabalho = isRetrabalho ? String(row[colDescrProduto] ?? '').trim() : '';
            const key = `${op}|${maq}|${processo}`;
            if (!porOp[key])
                porOp[key] = {
                    op, maquina: maq, setup: 0, parada: 0, tempo_produzido: 0, metros: 0,
                    processo: '', data: '', hora_inicial: '', hora_final: '',
                    hadSetup: false, hadParada: false, hadMatProd: false, is_retrabalho: false,
                    descr_produto_retrab: '',
                };
            if (isRetrabalho) {
                porOp[key].is_retrabalho = true;
                if (descrProdutoRetrabalho)
                    porOp[key].descr_produto_retrab = descrProdutoRetrabalho;
            }
            if (isMaterialProduzido) {
                // Tempo em horas = minutos / 60 — retrabalho não conta como tempo produzido
                if (!isRetrabalho)
                    porOp[key].tempo_produzido += durMin / 60;
                porOp[key].metros += metros;
                if (processo)
                    porOp[key].processo = processo;
                if (data)
                    porOp[key].data = data;
                if (horaIni)
                    porOp[key].hora_inicial = horaIni;
                if (horaFim)
                    porOp[key].hora_final = horaFim;
                porOp[key].hadMatProd = true;
            }
            else if (isSetup) {
                porOp[key].setup += durMin;
                porOp[key].hadSetup = true;
                if (data && !porOp[key].data)
                    porOp[key].data = data;
                if (horaIni && !porOp[key].hora_inicial)
                    porOp[key].hora_inicial = horaIni;
                if (horaFim && !porOp[key].hora_final)
                    porOp[key].hora_final = horaFim;
            }
            else {
                porOp[key].parada += durMin;
                porOp[key].hadParada = true;
                if (data && !porOp[key].data)
                    porOp[key].data = data;
                if (horaIni && !porOp[key].hora_inicial)
                    porOp[key].hora_inicial = horaIni;
                if (horaFim && !porOp[key].hora_final)
                    porOp[key].hora_final = horaFim;
            }
        }
        const registros = Object.values(porOp).map((r) => ({
            ...r,
            setup: Math.round(r.setup * 1000) / 1000,
            parada: Math.round(r.parada * 1000) / 1000,
            tempo_produzido: Math.round((r.tempo_produzido || 0) * 1000) / 1000,
            metros: Math.round((r.metros || 0) * 100) / 100,
            data: r.data || '',
            is_retrabalho: r.is_retrabalho || false,
        }));
        if (registros.length === 0) {
            return Response.json({ error: 'Nenhum dado de setup/parada por OP encontrado.' }, { status: 422 });
        }
        // Busca descrição de produto e data em outros registros para as OPs com material produzido
        const opsWithMatProd = [...new Set(registros.filter((r) => r.hadMatProd).map((r) => r.op))];
        const descricaoByOp = {};
        const dataByOp = {};
        if (opsWithMatProd.length > 0) {
            const all = await db.asServiceRole.entities.ControleEficiencia.list('-created_date', 5000);
            for (const rec of all) {
                if (rec.num_op) {
                    if (rec.descricao_produto && !descricaoByOp[rec.num_op]) {
                        descricaoByOp[rec.num_op] = rec.descricao_produto;
                    }
                    if (rec.data && !dataByOp[rec.num_op]) {
                        dataByOp[rec.num_op] = rec.data;
                    }
                }
            }
        }
        // Atualiza os registros existentes do ControleEficiencia (match por num_op + maquina)
        let updated = 0;
        let notFound = 0;
        let created = 0;
        for (const r of registros) {
            const existingFilter = { num_op: r.op, maquina: r.maquina };
            if (r.processo)
                existingFilter.processo = r.processo;
            const existing = await db.asServiceRole.entities.ControleEficiencia.filter(existingFilter);
            if (existing.length) {
                for (const rec of existing) {
                    const updateData = {};
                    // Só sobrescreve setup/parada se houver registros deles no arquivo
                    if (r.hadSetup)
                        updateData.setup = r.setup;
                    if (r.hadParada)
                        updateData.parada = r.parada;
                    if (r.hadMatProd) {
                        updateData.tempo = r.tempo_produzido;
                        updateData.metragem = r.metros;
                        updateData.is_retrabalho = r.is_retrabalho;
                        if (r.processo)
                            updateData.processo = r.processo;
                        if (r.hora_inicial)
                            updateData.hora_inicial = r.hora_inicial;
                        if (r.hora_final)
                            updateData.hora_final = r.hora_final;
                    }
                    // Descrição do produto do retrabalho (coluna T) — salva mesmo sem material produzido
                    if (r.is_retrabalho && r.descr_produto_retrab)
                        updateData.descricao_produto = r.descr_produto_retrab;
                    else if (r.hadMatProd && descricaoByOp[r.op])
                        updateData.descricao_produto = descricaoByOp[r.op];
                    // Data: prioridade da coluna K, senão de outros registros
                    const dataFinal = r.data || dataByOp[r.op] || '';
                    if (dataFinal)
                        updateData.data = dataFinal;
                    await db.asServiceRole.entities.ControleEficiencia.update(rec.id, updateData);
                }
                updated++;
            }
            else {
                // Setup/parada sem registro existente: cria o registro com os dados disponíveis
                await db.asServiceRole.entities.ControleEficiencia.create({
                    num_op: r.op,
                    maquina: r.maquina,
                    tempo: r.tempo_produzido || 0,
                    metragem: r.metros || 0,
                    descricao_produto: (r.is_retrabalho && r.descr_produto_retrab) ? r.descr_produto_retrab : (descricaoByOp[r.op] || ''),
                    data: r.data || dataByOp[r.op] || '',
                    processo: r.processo || '',
                    hora_inicial: r.hora_inicial || '',
                    hora_final: r.hora_final || '',
                    setup: r.hadSetup ? r.setup : 0,
                    parada: r.hadParada ? r.parada : 0,
                    is_retrabalho: r.is_retrabalho || false,
                });
                created++;
            }
        }
        return Response.json({
            updated,
            created,
            notFound,
            total: registros.length,
            registros,
            diag,
        });
    }
    catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
