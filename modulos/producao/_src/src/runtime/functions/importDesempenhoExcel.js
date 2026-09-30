const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from '../server-shim.js';

// Mapeia o valor da coluna "Descrição" (coluna M) para a máquina do dashboard.
// SOLVENTE é verificado ANTES de UV.
function maquinaPorDescricao(desc) {
  const raw = String(desc ?? '').trim().toUpperCase();
  if (!raw) return null;
  const s = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const compact = s.replace(/\s+/g, '');
  if (s.includes('GRAVADORA')) return 'Gravadora';
  if (s.includes('ESTAMPA 1') || compact === 'ESTAMPA1') return 'Estampa 1';
  if (s.includes('ESTAMPA 2') || compact === 'ESTAMPA2') return 'Estampa 2';
  // SOLVENTE explícito primeiro (ex.: "DIGITAL SOLVENTE")
  if (s.includes('SOLVENTE')) return 'Digital Solvente';
  // UV explícito (ex.: "DIGITAL UV")
  if (s.includes('UV')) return 'Digital UV';
  if (compact.includes('GR1') || s.includes('GR 1') || s.includes('GR-1')) return 'GR2';
  if (compact.includes('GR2') || s.includes('GR 2') || s.includes('GR-2')) return 'GR2';
  if (s.includes('CALANDRA')) return 'GR2';
  if (s === 'JR' || s.includes('JR')) return 'JR';
  if (s.includes('RAMA')) return 'JR';
  if (s.includes('RECOBRIMENTO')) return 'JR';
  return null;
}

function num(v) {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseTempoHoras(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') {
    if (v > 24) return Math.round((v / 60) * 1000) / 1000;
    return v;
  }
  const s = String(v).trim();
  const m = s.match(/(\d+):(\d{1,2})/);
  if (m) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    return Math.round((h + min / 60) * 1000) / 1000;
  }
  const n = num(v);
  if (n > 24) return Math.round((n / 60) * 1000) / 1000;
  return n;
}

function parseDateCell(v) {
  if (v == null || v === '') return null;
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
    if (mes >= 1 && mes <= 12) return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }
  return null;
}

function extractDate(rows) {
  const re = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      const s = String(cell ?? '');
      if (/apont/i.test(s)) {
        const m = s.match(re);
        if (m) {
          const dia = Number(m[1]);
          const mes = Number(m[2]);
          const ano = Number(m[3]);
          if (mes >= 1 && mes <= 12) return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        }
      }
    }
  }
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      const m = String(cell ?? '').match(re);
      if (m) {
        const dia = Number(m[1]);
        const mes = Number(m[2]);
        const ano = Number(m[3]);
        if (mes >= 1 && mes <= 12) return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const joined = row.map((c) => String(c ?? '').toLowerCase()).join('|');
    if (/ord.*pro/.test(joined) || /ordem de produ/.test(joined) || /número da ordem/.test(joined)) return i;
  }
  return -1;
}

function colIndex(row, ...predicates) {
  for (let j = 0; j < row.length; j++) {
    const s = String(row[j] ?? '').toLowerCase().trim();
    if (predicates.some((p) => p(s))) return j;
  }
  return -1;
}

export default async function(req) {
  try {
    createClientFromRequest(req);
    const user = await db.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const file_url = body?.file_url;
    if (!file_url) return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });

    const resp = await fetch(file_url);
    if (!resp.ok) return Response.json({ error: 'Falha ao baixar o arquivo' }, { status: 502 });
    const buf = await resp.arrayBuffer();

    const XLSX = await import('xlsx');
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

    const headerIdx = findHeaderRow(rows);

    let colOP = -1, colTempo = -1, colMetros = -1, colDesc = -1, colDate = -1;
    if (headerIdx >= 0) {
      const h = rows[headerIdx];
      colOP = colIndex(h, (s) => /ord.*pro/.test(s) || /ordem de produ/.test(s) || /n[úu]mero da ordem/.test(s) || /^op$/.test(s) || /n[ºo].*op/.test(s));
      colMetros = colIndex(h, (s) => /qtd.*aprov/.test(s) || /qtd\.?aprov/.test(s) || /metro/.test(s) || /realizado/.test(s));
      colDate = colIndex(h, (s) => /dt.*inic.*produ/.test(s) || /in[ií]c.*produ/.test(s) || /data.*produ/.test(s));
    }
    // COLUNAS MESTRES:
    // M (12) = Máquina | L (11) = Tempo produzido | F (5) = Descrição operação (MISTURA -> ignorar)
    colDesc = 12;
    colTempo = 11;
    const colMistura = 5;
    if (colOP < 0) colOP = 1;
    if (colMetros < 0) colMetros = 7;
    if (colDate < 0) colDate = 9;

    const fallbackDate = colDate < 0 ? extractDate(rows) : null;

    const porMaquina = {};
    const add = (data, maq, op, metros, tempo) => {
      const key = `${data}|${maq}`;
      if (!porMaquina[key]) porMaquina[key] = { data, maquina: maq, num_ops: 0, metros_realizados: 0, tempo_produzido: 0 };
      porMaquina[key].num_ops += op ? 1 : 0;
      porMaquina[key].metros_realizados += metros;
      porMaquina[key].tempo_produzido += tempo;
    };

    if (headerIdx >= 0) {
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;
        const opCell = row[colOP];
        const tempoCell = row[colTempo];
        const metrosCell = row[colMetros];
        const descCell = row[colDesc];
        const dateCell = colDate >= 0 ? row[colDate] : null;

        const opStr = String(opCell ?? '').trim();
        if (!opStr) continue;
        if (/total/i.test(opStr)) continue;

        const misturaCell = colMistura >= 0 ? row[colMistura] : null;
        if (misturaCell && /MISTURA/i.test(String(misturaCell).normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) continue;

        const maq = maquinaPorDescricao(descCell);
        if (!maq) continue;

        const data = parseDateCell(dateCell) || fallbackDate;
        if (!data) continue;

        const tempoHoras = parseTempoHoras(tempoCell);
        if (tempoHoras <= 0.017) continue;

        add(data, maq, num(opCell), num(metrosCell), tempoHoras);
      }
    }

    const registros = Object.values(porMaquina).map((r) => ({
      ...r,
      num_ops: Math.round(r.num_ops),
      metros_realizados: Math.round(r.metros_realizados * 100) / 100,
      tempo_produzido: Math.round(r.tempo_produzido * 1000) / 1000,
    }));

    if (registros.length === 0) {
      return Response.json({ error: 'Nenhum dado de produção encontrado no relatório.', headerIdx, colOP, colTempo, colMetros, colDesc, colDate }, { status: 422 });
    }

    const TEMPO_DIA = 8.8;
    const agoraSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const aplicarComplemento = (agoraSP.getHours() + agoraSP.getMinutes() / 60) >= 17;
    let imported = 0;
    for (const r of registros) {
      const existing = await db.asServiceRole.entities.DesempenhoMaquina.filter({ data: r.data, maquina: r.maquina });
      if (existing.length) {
        const updateData = {
          tempo_produzido: r.tempo_produzido,
          num_ops: r.num_ops,
          metros_realizados: r.metros_realizados,
        };
        let ociosoFinal = existing[0].tempo_ocioso || 0;
        if (r.tempo_produzido > 0 && Math.abs(ociosoFinal - TEMPO_DIA) < 0.01) {
          updateData.tempo_ocioso = 0;
          ociosoFinal = 0;
        }
        await db.asServiceRole.entities.DesempenhoMaquina.update(existing[0].id, updateData);
      } else {
        await db.asServiceRole.entities.DesempenhoMaquina.create({
          data: r.data,
          maquina: r.maquina,
          tempo_produzido: r.tempo_produzido,
          num_ops: r.num_ops,
          metros_realizados: r.metros_realizados,
          tempo_parado: 0,
          setup: 0,
          amostras: 0,
          retrabalho: 0,
        });
      }
      imported++;
    }

    return Response.json({
      imported,
      datas: registros.map((r) => r.data).filter((v, i, a) => a.indexOf(v) === i).sort(),
      headerIdx,
      colOP, colTempo, colMetros, colDesc, colDate,
      registros,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}