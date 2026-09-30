const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from '../server-shim.js';

function num(v) {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function txt(v) {
  return String(v ?? '').trim();
}

function isNumber(v) {
  if (v == null || v === '') return false;
  return !isNaN(num(v)) && num(v) !== 0 ? true : (v === 0 || v === '0');
}

// Conta quantas colunas (a partir de startCol) têm conteúdo não-vazio
function countFilled(row, startCol, maxCol) {
  if (!Array.isArray(row)) return 0;
  let count = 0;
  for (let c = startCol; c <= maxCol; c++) {
    if (txt(row[c])) count++;
  }
  return count;
}

// Conta quantas colunas têm texto (não número)
function countText(row, startCol, maxCol) {
  if (!Array.isArray(row)) return 0;
  let count = 0;
  for (let c = startCol; c <= maxCol; c++) {
    const val = txt(row[c]);
    if (val && isNaN(Number(val))) count++;
  }
  return count;
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

    let sheetName = wb.SheetNames.find(n => {
      const upper = n.trim().toUpperCase();
      return upper === 'GERAL' || upper.includes('GERAL');
    });
    if (!sheetName) {
      sheetName = wb.SheetNames[0];
    }
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

    const debugRows = [];

    // Layout fixo da aba GERAL:
    // - Parâmetros: coluna B (nome) + coluna C (valor), linhas 5 a 11 (índices 4 a 10)
    // - Carga de Máquina: colunas B a F, linhas 13 a 17 (índices 12 a 16)
    //   - Linha 13 (índice 12): cabeçalho — B = rótulo, C-F = nomes das máquinas
    //   - Linhas 14-17 (índices 13-16): parâmetros — B = nome do parâmetro, C-F = valores por máquina

    // Faixas configuráveis (1-indexed no body, convertidas para 0-indexed)
    const PARAM_START = (Number(body?.param_start) || 2) - 1;
    const PARAM_END = (Number(body?.param_end) || 7) - 1;
    const CARGA_HEADER = (Number(body?.carga_header) || 9) - 1;
    const CARGA_START = (Number(body?.carga_start) || 10) - 1;
    const CARGA_END = (Number(body?.carga_end) || 13) - 1;
    const CARGA_MAX_COL = 4;  // coluna E (índice 4)

    // Parâmetros gerais (col A = nome índice 0, col B = valor índice 1)
    const geral = [];
    for (let i = PARAM_START; i <= PARAM_END; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const parametro = txt(row[0]);
      if (!parametro) continue;
      const upper = parametro.toUpperCase();
      if (upper === 'PARÂMETRO' || upper === 'PARAMETRO') continue;
      const valC = row[1];
      if (valC === '' || valC == null) continue;
      geral.push({ parametro, valor: num(valC) });
    }

    // Carga de Máquina — col A (índice 0) = rótulo, col B-E (índices 1-4) = máquinas
    const headerRow = rows[CARGA_HEADER];
    const maquinasColunas = [];
    if (Array.isArray(headerRow)) {
      for (let c = 1; c <= CARGA_MAX_COL; c++) {
        const name = txt(headerRow[c]);
        if (name) maquinasColunas.push(name);
      }
    }

    const maquinas = { colunas: maquinasColunas, linhas: [] };
    const numMaq = maquinasColunas.length;
    for (let i = CARGA_START; i <= CARGA_END; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const parametro = txt(row[0]);
      if (!parametro) continue;
      const upper = parametro.toUpperCase();
      if (upper === 'PARÂMETRO' || upper === 'PARAMETRO' || upper.includes('TOTAL')) continue;
      if (numMaq === 0 || countFilled(row, 1, numMaq) === 0) continue;
      const valores = [];
      for (let c = 1; c <= numMaq; c++) {
        valores.push(num(row[c]));
      }
      maquinas.linhas.push({ parametro, valores });
    }

    // Debug: primeiras 25 linhas com até 8 colunas
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) { debugRows.push({ idx: i, empty: true }); continue; }
      const cells = [];
      for (let c = 0; c <= 7; c++) cells.push(row[c]);
      debugRows.push({ idx: i, cells });
    }

    return Response.json({
      geral,
      parametros: geral,
      maquinas,
      debug: { headerIdx: CARGA_HEADER, numMaquinas: maquinasColunas.length, sheetName, totalRows: rows.length, debugRows }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}