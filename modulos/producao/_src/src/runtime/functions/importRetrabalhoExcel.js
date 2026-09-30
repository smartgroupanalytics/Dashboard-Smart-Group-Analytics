const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from '../server-shim.js';

function num(v) {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseDate(v) {
  if (!v && v !== 0) return null;
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof v === 'number') {
    // Excel serial date (days since 1899-12-30)
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const dt = new Date(epoch.getTime() + v * 86400000);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
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
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });

    const sheetName = wb.SheetNames.find((n) => /analise.*retrabalho/i.test(String(n).trim()));
    if (!sheetName) return Response.json({ error: 'Planilha "ANALISE RETRABALHO" não encontrada.' }, { status: 422 });

    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const hasData = row.some((c) => /^DATA$/i.test(String(c ?? '').trim()));
      const hasRetrabalho = row.some((c) => /RETRABALHO/i.test(String(c ?? '').trim()));
      if (hasData && hasRetrabalho) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return Response.json({ error: 'Cabeçalho não encontrado na planilha "ANALISE RETRABALHO".' }, { status: 422 });

    const cm = {};
    rows[headerIdx].forEach((c, idx) => {
      const s = String(c ?? '').trim().toUpperCase();
      if (/^DATA$/.test(s)) cm.data = idx;
      else if (/^OP$/.test(s)) cm.op = idx;
      else if (/^PRODUTO$/.test(s)) cm.produto = idx;
      else if (/DESCRI.*O DO RETRABALHO/.test(s)) cm.descricao = idx;
      else if (/^METROS$/.test(s)) cm.metros = idx;
      else if (/M.*QUINA/.test(s)) cm.maquina = idx;
      else if (/METROS PRODUZIDOS DIA|METROS PRODUZIDOS/.test(s)) cm.metros_dia = idx;
    });

    if (cm.data == null || cm.op == null) {
      return Response.json({ error: 'Colunas DATA e OP não encontradas.' }, { status: 422 });
    }

    const records = [];
    const datesSet = new Set();
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const opRaw = String(row[cm.op] ?? '').trim();
      if (!opRaw || /^total/i.test(opRaw)) continue;
      const data = parseDate(row[cm.data]);
      if (!data) continue;
      datesSet.add(data);
      records.push({
        data,
        op: opRaw,
        produto: cm.produto != null ? String(row[cm.produto] ?? '').trim() : '',
        descricao_retrabalho: cm.descricao != null ? String(row[cm.descricao] ?? '').trim() : '',
        metros: cm.metros != null ? num(row[cm.metros]) : 0,
        maquina: cm.maquina != null ? String(row[cm.maquina] ?? '').trim() : '',
        metros_produzidos_dia: cm.metros_dia != null ? num(row[cm.metros_dia]) : 0,
      });
    }

    if (records.length === 0) {
      return Response.json({ error: 'Nenhum registro encontrado na planilha.' }, { status: 422 });
    }

    for (const data of datesSet) {
      await db.asServiceRole.entities.RetrabalhoAnalise.deleteMany({ data });
    }
    const created = await db.asServiceRole.entities.RetrabalhoAnalise.bulkCreate(records);

    return Response.json({ imported: created.length, registros: records.length, dates: Array.from(datesSet).sort() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}