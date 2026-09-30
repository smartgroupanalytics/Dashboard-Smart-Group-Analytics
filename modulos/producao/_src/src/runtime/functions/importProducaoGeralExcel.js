const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from '../server-shim.js';
import { normalize, parseNum, parseMes, MESES_LABELS } from '../shared/excelUtils.js';

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

    // Procura aba "PRODUÇÃO GERAL" (case-insensitive, sem acento)
    let sheetName = wb.SheetNames.find((n) => normalize(n) === 'producao geral');
    if (!sheetName) {
      sheetName = wb.SheetNames.find((n) => normalize(n).includes('producao geral'));
    }
    if (!sheetName) {
      return Response.json({ error: 'Aba "PRODUÇÃO GERAL" não encontrada no arquivo.' }, { status: 422 });
    }
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

    // Encontra linha de cabeçalho (com "mês")
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      if (row.some((c) => normalize(c).includes('mes'))) {
        headerIdx = i; break;
      }
    }
    if (headerIdx < 0) headerIdx = 0;

    const header = rows[headerIdx];

    // Mapeia colunas por cabeçalho
    const findCol = (...keys) => {
      for (let j = 0; j < header.length; j++) {
        const h = normalize(header[j]);
        if (!h) continue;
        for (const k of keys) {
          if (h === k || h.includes(k)) return j;
        }
      }
      return -1;
    };

    const colMes = findCol('mes');
    const colQtdPrev = findCol('quantidade prevista', 'qtd prevista', 'prevista');
    const colDias = findCol('dias uteis', 'dias');
    const colProdSmart = findCol('producao smart', 'producao');
    const colMediaDiaSmart = findCol('media dia smart');
    const colBenef = findCol('beneficiamento', 'stk');
    const colMediaDiaStk = findCol('media dia stk', 'media stk');
    const colTotal = findCol('total');
    const colMediaDiaGeral = findCol('media dia geral');
    const colMediaRealSmart = findCol('media realizada smart', 'media realizada');
    const colMediaDiariaRealStk = findCol('media diaria real stk', 'media diaria real');

    if (colMes < 0) {
      return Response.json({ error: 'Coluna "Mês" não encontrada na aba PRODUÇÃO GERAL.' }, { status: 422 });
    }

    const registros = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const mes = parseMes(row[colMes]);
      if (!mes) continue;

      const mes_label = MESES_LABELS[mes] || String(row[colMes] || '');

      registros.push({
        mes,
        mes_label,
        qtd_prevista: colQtdPrev >= 0 ? parseNum(row[colQtdPrev]) : 0,
        dias_uteis: colDias >= 0 ? parseNum(row[colDias]) : 0,
        producao_smart: colProdSmart >= 0 ? parseNum(row[colProdSmart]) : 0,
        media_dia_smart: colMediaDiaSmart >= 0 ? parseNum(row[colMediaDiaSmart]) : 0,
        beneficiamento: colBenef >= 0 ? parseNum(row[colBenef]) : 0,
        media_dia_stk: colMediaDiaStk >= 0 ? parseNum(row[colMediaDiaStk]) : 0,
        total: colTotal >= 0 ? parseNum(row[colTotal]) : 0,
        media_dia_geral: colMediaDiaGeral >= 0 ? parseNum(row[colMediaDiaGeral]) : 0,
        media_realizada_smart: colMediaRealSmart >= 0 ? parseNum(row[colMediaRealSmart]) : 0,
        media_diaria_real_stk: colMediaDiariaRealStk >= 0 ? parseNum(row[colMediaDiariaRealStk]) : 0,
      });
    }

    if (registros.length === 0) {
      return Response.json({ error: 'Nenhum dado válido encontrado na aba PRODUÇÃO GERAL.' }, { status: 422 });
    }

    const meses = registros.map((r) => r.mes).filter((v, i, a) => a.indexOf(v) === i);
    await db.asServiceRole.entities.ProducaoGeral.deleteMany({ mes: { $in: meses } });
    await db.asServiceRole.entities.ProducaoGeral.bulkCreate(registros);

    return Response.json({
      imported: registros.length,
      meses,
      registros,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}