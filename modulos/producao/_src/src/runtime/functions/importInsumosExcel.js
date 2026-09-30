const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from '../server-shim.js';
import { num, parseDate, formatDate, norm, findCol } from '../shared/excelUtils.js';

// Detecta a linha de cabeçalho procurando por "op" e "data" nas primeiras 15 linhas
function findHeaderRowInsumos(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const cells = row.map(c => norm(c));
    const hasOp = cells.some(c => c === 'op' || c === 'n op' || c === 'nop' || c === 'n op' || c === 'o p' || c === 'ordem' || c === 'ordem de producao');
    const hasData = cells.some(c => c === 'data' || c === 'data op' || c === 'dt' || c === 'data producao');
    if (hasOp && hasData) return i;
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
    if (!sheetName) {
      return Response.json({ error: 'Nenhuma aba encontrada no arquivo' }, { status: 422 });
    }

    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

    const debugSample = rows.slice(0, 20).map(r => Array.isArray(r) ? r.slice(0, 15) : r);

    // Detecta a linha de cabeçalho
    let headerIdx = findHeaderRowInsumos(rows);
    let headers = headerIdx >= 0 ? rows[headerIdx] : [];

    // Mapeia colunas pelo cabeçalho; fallback para posicao fixa se nao encontrar
    let colOp = findCol(headers, 'op', 'n op', 'nop', 'ordem');
    let colData = findCol(headers, 'data', 'dt');
    let colDescProduto = findCol(headers, 'descricao produto', 'desc produto', 'produto');
    let colDescInsumo = findCol(headers, 'descricao insumo', 'desc insumo', 'insumo');
    let colQtdePrev = findCol(headers, 'qtde prevista', 'qtd prevista', 'prevista', 'qtde prev');
    let colQtdeReal = findCol(headers, 'qtde realizada', 'qtd realizada', 'realizada', 'qtde real');
    let colValorPrev = findCol(headers, 'valor previsto', 'vlr previsto', 'previsto');
    let colValorReal = findCol(headers, 'valor realizado', 'vlr realizado', 'realizado');
    let colPrevisto = findCol(headers, 'previsto', 'previstos', 'nao previsto', 'não previsto', 'e previsto');
    let colDescNaoPrev = findCol(headers, 'desc nao previsto', 'descricao nao previsto', 'descrição não previsto', 'desc não previsto');
    let colQtdeNaoPrev = findCol(headers, 'qtde nao previsto', 'qtd nao previsto', 'qtde não previsto', 'qtd não previsto');
    let colValorRealNaoPrev = findCol(headers, 'valor realizado nao previsto', 'vlr realizado nao previsto', 'valor realizado não previsto', 'vlr realizado não previsto');

    // Fallback para posicoes fixas (A=OP, B=Data, E=DescProduto, H=DescInsumo, J/K/L/M, K=QtdeNaoPrev, X=Previsto, Y=DescNaoPrev)
    if (colOp < 0) colOp = 0;
    if (colData < 0) colData = 1;
    if (colDescProduto < 0) colDescProduto = 4;
    if (colDescInsumo < 0) colDescInsumo = 7;
    if (colQtdePrev < 0) colQtdePrev = 9;
    if (colQtdeReal < 0) colQtdeReal = 10;
    if (colValorPrev < 0) colValorPrev = 11;
    if (colValorReal < 0) colValorReal = 12;
    if (colPrevisto < 0) colPrevisto = 23;       // X
    if (colDescNaoPrev < 0) colDescNaoPrev = 24; // Y
    if (colQtdeNaoPrev < 0) colQtdeNaoPrev = 10;  // K
    if (colValorRealNaoPrev < 0) colValorRealNaoPrev = 20;  // U

    const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;
    const records = [];

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      const num_op = String(row[colOp] ?? '').trim();
      if (!num_op) continue;
      // Skip header rows repetidos
      const lower = num_op.toLowerCase();
      if (lower === 'op' || lower === 'nº op' || lower === 'n op' || lower === 'o.p.' || lower === 'op.') continue;
      // Skip linhas de anotação "Nro. Ordem Prod: INCLUI 7882 7607 ..."
      const numOpNorm = norm(num_op);
      if (numOpNorm.includes('nro ordem prod') || numOpNorm.includes('nro ordem') || numOpNorm.includes('inclui')) continue;
      const descProdNorm = norm(String(row[colDescProduto] ?? ''));
      if (descProdNorm.includes('nro ordem prod') || descProdNorm.includes('inclui')) continue;

      // Data sempre da coluna detectada (padrao B). Linhas com 00/00/0000 sao descartadas.
      const rawData = String(row[colData] ?? '').trim();
      if (rawData === '00/00/0000' || rawData === '00/00/00' || rawData === '0/0/0000' || rawData === '0/0/0') continue;

      const date = parseDate(row[colData]);

      const rec = {
        num_op,
        data: date ? formatDate(date) : null,
        mes: date ? date.getMonth() + 1 : null,
        ano: date ? date.getFullYear() : null,
        descricao_produto: String(row[colDescProduto] ?? '').trim(),
        descricao_insumo: String(row[colDescInsumo] ?? '').trim(),
        qtde_prevista: num(row[colQtdePrev]),
        qtde_realizada: num(row[colQtdeReal]),
        valor_previsto: num(row[colValorPrev]),
        valor_realizado: num(row[colValorReal]),
        previsto: String(row[colPrevisto] ?? '').trim(),
        descricao_nao_previsto: String(row[colDescNaoPrev] ?? '').trim(),
        qtde_nao_previsto: num(row[colQtdeNaoPrev]),
        valor_realizado_nao_previsto: num(row[colValorRealNaoPrev]),
      };
      records.push(rec);
    }

    if (records.length === 0) {
      return Response.json({
        imported: 0,
        debugSample,
        headerIdx,
        detectedCols: { colOp, colData, colDescProduto, colDescInsumo, colQtdePrev, colQtdeReal, colValorPrev, colValorReal, colPrevisto, colDescNaoPrev, colQtdeNaoPrev, colValorRealNaoPrev },
        headers: headers ? headers.map(h => String(h)) : null,
        sheetName
      });
    }

    return Response.json({ imported: records.length, sheetName, records });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}