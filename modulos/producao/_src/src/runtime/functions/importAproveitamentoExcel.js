const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from '../server-shim.js';
import { num, parseDate, formatDate, norm, findHeaderRow, findCol } from '../shared/excelUtils.js';

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
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

    let headerIdx = findHeaderRow(rows);
    let headers = headerIdx >= 0 ? rows[headerIdx] : [];

    let colOp = findCol(headers, 'op', 'n op', 'nop', 'ordem');
    let colData = findCol(headers, 'data', 'dt');
    let colDesc = findCol(headers, 'descricao', 'produto', 'desc');
    let colTempoPrev = findCol(headers, 'tempo previsto', 'tempo prev');
    let colTempoReal = findCol(headers, 'tempo realizado', 'tempo real');
    let colSetupPrev = findCol(headers, 'setup previsto', 'setup prev');
    let colSetupReal = findCol(headers, 'setup realizado', 'setup real');
    let colConsPrev = findCol(headers, 'consumo previsto', 'consumo prev', 'valor previsto', 'vlr previsto');
    let colConsReal = findCol(headers, 'consumo realizado', 'consumo real', 'valor realizado', 'vlr realizado');
    let colQuebra = findCol(headers, 'quebra', '% quebra', 'perda');
    let colRetrabalho = findCol(headers, 'retrabalho', 'retrab');

    if (colOp < 0) colOp = 0;
    if (colData < 0) colData = 1;
    if (colDesc < 0) colDesc = 2;
    if (colTempoPrev < 0) colTempoPrev = 3;
    if (colTempoReal < 0) colTempoReal = 4;
    if (colSetupPrev < 0) colSetupPrev = 5;
    if (colSetupReal < 0) colSetupReal = 6;
    if (colConsPrev < 0) colConsPrev = 7;
    if (colConsReal < 0) colConsReal = 8;
    if (colQuebra < 0) colQuebra = 9;
    if (colRetrabalho < 0) colRetrabalho = 10;

    const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;
    const records = [];

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const num_op = String(row[colOp] ?? '').trim();
      if (!num_op) continue;
      const lower = num_op.toLowerCase();
      if (lower === 'op' || lower === 'n op' || lower === 'ordem') continue;

      const retrabalhoMetros = num(row[colRetrabalho]);
      const date = parseDate(row[colData]);

      records.push({
        num_op,
        data: date ? formatDate(date) : null,
        descricao_produto: String(row[colDesc] ?? '').trim(),
        tempo_previsto: num(row[colTempoPrev]),
        tempo_realizado: num(row[colTempoReal]),
        setup_previsto: num(row[colSetupPrev]),
        setup_realizado: num(row[colSetupReal]),
        consumo_previsto: num(row[colConsPrev]),
        consumo_realizado: num(row[colConsReal]),
        quebra_pct: num(row[colQuebra]),
        tem_retrabalho: retrabalhoMetros > 0,
        retrabalho_metros: retrabalhoMetros,
      });
    }

    if (records.length === 0) {
      return Response.json({
        imported: 0,
        headerIdx,
        detectedCols: { colOp, colData, colDesc, colTempoPrev, colTempoReal, colSetupPrev, colSetupReal, colConsPrev, colConsReal, colQuebra, colRetrabalho },
        headers: headers ? headers.map(h => String(h)) : null,
      });
    }

    return Response.json({ imported: records.length, records });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}