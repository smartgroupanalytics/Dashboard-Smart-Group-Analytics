const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from '../server-shim.js';

function num(v) {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Encontra a linha de cabeçalho procurando por "Produto" ou "Código"
function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      const s = String(cell ?? '').toLowerCase().trim();
      if (s === 'produto' || /^cod/i.test(s) || /c[óo]digo/i.test(s)) return i;
    }
  }
  return -1;
}

// Extrai data do texto "Dt.apont: XX/XX/XXXX"
function extractDate(rows) {
  const re = /dt\.?\s*apont[^:]*:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i;
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
    const dataImport = body?.data;
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

    // Layout fixo: A=código, B=descrição, C=OP, E=metragem
    const colCod = 0;
    const colDesc = 1;
    const colOp = 2;
    const colMetros = 4;

    // Data: usa a do seletor, senão extrai do "Dt.apont", senão hoje
    const extractedDate = extractDate(rows);
    const hoje = new Date();
    const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const data = dataImport || extractedDate || hojeIso;
    const parts = data.split('-');
    const ano = Number(parts[0]);
    const mes = Number(parts[1]);

    const registros = [];
    if (headerIdx >= 0) {
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;
        const codCell = String(row[colCod] ?? '').trim();
        if (!codCell) continue;
        if (/total/i.test(codCell)) continue;
        const desc = colDesc >= 0 ? String(row[colDesc] ?? '').trim() : '';
        const metros = colMetros >= 0 ? num(row[colMetros]) : 0;
        const op = colOp >= 0 ? String(row[colOp] ?? '').trim() : '';
        registros.push({
          codigo_produto: codCell,
          descricao_produto: desc,
          num_op: op,
          metragem: metros,
          data,
          mes,
          ano,
        });
      }
    }

    if (registros.length === 0) {
      return Response.json({ error: 'Nenhum dado encontrado na planilha.', headerIdx, colCod, colDesc, colMetros, colOp }, { status: 422 });
    }

    // Substitui registros da data
    await db.asServiceRole.entities.RecorrenciaPedido.deleteMany({ data });
    await db.asServiceRole.entities.RecorrenciaPedido.bulkCreate(registros);

    return Response.json({
      imported: registros.length,
      data,
      headerIdx,
      colCod, colDesc, colMetros, colOp,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}