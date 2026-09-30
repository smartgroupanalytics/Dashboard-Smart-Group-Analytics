const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from '../server-shim.js';

// Normaliza string para comparacao (sem acentos, lowercase)
function norm(v) {
  return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function parseNum(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const s = String(v).replace(/\s/g, '');
  // Trata formato brasileiro: 1.234.567,89 => 1234567.89
  // e formato americano: 1,234,567.89 => 1234567.89
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) {
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  if (/^\d{1,3}(,\d{3})+\.\d+$/.test(s)) {
    const n = Number(s.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
  // Caso geral: remove separadores de milhar e converte vírgula decimal
  const cleaned = s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

const MESES_NOMES = {
  janeiro: 1, fevereiro: 2, marco: 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, set: 9, out: 10, nov: 11, dez: 12,
};

function parseMes(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    if (v >= 1 && v <= 12) return Math.round(v);
    return null;
  }
  const s = String(v).trim();
  // Número direto
  const n = parseInt(s.replace(/\D/g, ''), 10);
  if (n >= 1 && n <= 12) return n;
  // Nome do mês
  const key = norm(s);
  if (MESES_NOMES[key]) return MESES_NOMES[key];
  return null;
}

// Mapeamento: chave normalizada -> nome do campo na entidade
const FIELD_ALIASES = {
  mes: ['mes', 'meses', 'month'],
  faturamento_smart_group: ['faturamento smart group', 'fat smart group', 'smart group', 'fat sg'],
  metros_smart_group: ['metros smart group', 'metragem smart group', 'metros sg', 'm2 sg', 'm2 smart group'],
  faturamento_stk: ['faturamento stk', 'fat stk', 'stk'],
  metros_stk: ['metros stk', 'metragem stk', 'm2 stk'],
  faturamento_previsto_2026: ['faturamento previsto 2026', 'previsto 2026', 'orcado 2026', 'faturamento orcado'],
  faturamento_2025: ['faturamento 2025', 'fat 2025', '2025'],
  metros_2025: ['metros 2025', 'metragem 2025', 'm2 2025'],
  preco_medio_orcado: ['preco medio orcado', 'preco orcado', 'pm orcado', 'preco medio previsto'],
  preco_medio_realizado: ['preco medio realizado', 'preco realizado', 'pm realizado'],
};

function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const joined = norm(row.map((c) => c ?? '').join(' '));
    if (/mes/.test(joined) || /month/.test(joined)) return i;
  }
  return -1;
}

function buildColumnMap(headerRow) {
  const map = {};
  for (let c = 0; c < headerRow.length; c++) {
    const h = norm(headerRow[c]);
    if (!h) continue;
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (map[field] !== undefined) continue;
      if (aliases.some((a) => h === a || h.includes(a) || a.includes(h))) {
        map[field] = c;
      }
    }
  }
  return map;
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
    // Procura a aba "faturamento smt-3" (case-insensitive, sem acentos)
    const sheetName = wb.SheetNames.find((n) => norm(n) === 'faturamento smt-3') || wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

    const headerIdx = findHeaderRow(rows);
    const colMap = headerIdx >= 0 ? buildColumnMap(rows[headerIdx]) : {};

    // Fallback de posições fixas (apenas para colunas não detectadas via cabeçalho)
    // Layout padrão da aba "faturamento smt-3":
    // A = Mês | C = Fat. Smart | D = Fat. STK | E = Metros Smart | F = Metros STK
    // G = Fat. Previsto 2026 | H = Fat. 2025 | I = Preço Médio Orçado | J = Preço Médio Realizado
    const FIXED_COLS = {
      mes: 0,
      faturamento_smart_group: 2,
      metros_smart_group: 4,
      faturamento_stk: 3,
      metros_stk: 5,
      faturamento_previsto_2026: 6,
      faturamento_2025: 7,
      preco_medio_orcado: 8,
      preco_medio_realizado: 9,
    };
    for (const [field, col] of Object.entries(FIXED_COLS)) {
      if (colMap[field] === undefined) colMap[field] = col;
    }

    const records = [];
    const startRow = headerIdx >= 0 ? headerIdx + 1 : 1;
    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      const mes = parseMes(row[colMap.mes]);
      if (!mes) continue; // pula linhas sem mês válido (totais, vazias)

      const rec = { mes };
      const fields = [
        'faturamento_smart_group', 'metros_smart_group',
        'faturamento_stk', 'metros_stk',
        'faturamento_previsto_2026', 'faturamento_2025', 'metros_2025',
        'preco_medio_orcado', 'preco_medio_realizado',
      ];
      for (const f of fields) {
        if (colMap[f] !== undefined) {
          rec[f] = parseNum(row[colMap[f]]);
        }
      }
      // ano: se houver coluna "ano" usa ela, senão default 2026
      const headerRow = headerIdx >= 0 ? rows[headerIdx] : [];
      const anoCol = headerRow.findIndex((c) => norm(c) === 'ano');
      rec.ano = anoCol >= 0 ? (parseNum(row[anoCol]) || 2026) : 2026;

      records.push(rec);
    }

    if (records.length === 0) {
      const sample = rows.slice(0, 5).map(r => Array.isArray(r) ? r.slice(0, 12) : r);
      return Response.json({ error: 'Nenhum registro válido encontrado no arquivo', debugSample: sample, totalRows: rows.length, sheetName }, { status: 422 });
    }

    // Substitui registros dos meses importados
    const meses = [...new Set(records.map((r) => r.mes))];
    for (const mes of meses) {
      const existing = await db.asServiceRole.entities.Faturamento.filter({ mes });
      for (const e of existing) {
        await db.asServiceRole.entities.Faturamento.delete(e.id);
      }
    }
    const created = await db.asServiceRole.entities.Faturamento.bulkCreate(records);

    return Response.json({ imported: created.length, total: records.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}