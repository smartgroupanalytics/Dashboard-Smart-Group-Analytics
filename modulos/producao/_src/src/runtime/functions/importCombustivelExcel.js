const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from '../server-shim.js';
import { normalize, parseNum, parseMes } from '../shared/excelUtils.js';

// Colunas fixas (0-indexed) da aba "dados"
// E=4, I=8 (metros), Q=16 (valor orcado), R=17 (valor gás), S=18 (kg orcado), T=19 (kg gás), Y=24 (preço médio)
const COL = {
  col_e: 4,         // E - valor coluna E
  metros: 8,        // I - metros produzidos
  valor_orcado: 16, // Q - valor do gás previsto
  valor: 17,        // R - valor do gás
  kg_orcado: 18,    // S - kg de gás previsto
  kg: 19,           // T - kg de gás consumido
  preco: 24,        // Y - preço médio
};

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

    // Procura aba "dados" (case-insensitive), senão usa a primeira
    let sheetName = wb.SheetNames.find((n) => normalize(n) === 'dados');
    if (!sheetName) {
      sheetName = wb.SheetNames.find((n) => normalize(n).includes('dados'));
    }
    if (!sheetName) {
      return Response.json({ error: 'Aba "dados" não encontrada no arquivo.' }, { status: 422 });
    }
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

    // Encontra linha de cabeçalho (com "mês")
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      if (row.some((c) => normalize(c).includes('mes') || normalize(c) === 'mes')) {
        headerIdx = i; break;
      }
    }
    if (headerIdx < 0) headerIdx = 0;

    // Encontra coluna do mês no cabeçalho
    const header = rows[headerIdx];
    let mesCol = -1;
    for (let j = 0; j < header.length; j++) {
      if (normalize(header[j]).includes('mes')) { mesCol = j; break; }
    }
    if (mesCol < 0) mesCol = 0; // fallback: primeira coluna

    // Linhas 2-13 (após cabeçalho) = 2025, linhas 14-25 = 2026
    const registros = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const mes = parseMes(row[mesCol]);
      if (!mes) continue;

      const dataRowIdx = i - (headerIdx + 1); // 0-based
      const ano = dataRowIdx < 12 ? 2025 : 2026;

      const metros = parseNum(row[COL.metros]);
      const valor = parseNum(row[COL.valor]);
      const kg = parseNum(row[COL.kg]);
      const preco = parseNum(row[COL.preco]);
      const colE = parseNum(row[COL.col_e]);

      if (ano === 2025) {
        registros.push({
          mes, ano: 2025,
          metros_produzidos: metros,
          valor_2025: valor,
          kg_2025: kg,
          preco_medio_2025: preco,
          col_e: colE,
        });
      } else {
        const valorOrcado = parseNum(row[COL.valor_orcado]);
        const kgOrcado = parseNum(row[COL.kg_orcado]);
        registros.push({
          mes, ano: 2026,
          metros_produzidos: metros,
          valor_2026: valor,
          kg_2026: kg,
          preco_medio_2026: preco,
          valor_orcado: valorOrcado,
          kg_orcado: kgOrcado,
          col_e: colE,
        });
      }
    }

    if (registros.length === 0) {
      return Response.json({ error: 'Nenhum dado válido encontrado no arquivo.' }, { status: 422 });
    }

    const meses = registros.map((r) => r.mes).filter((v, i, a) => a.indexOf(v) === i);
    await db.asServiceRole.entities.CombustivelProducao.deleteMany({ mes: { $in: meses }, ano: { $in: [2025, 2026] } });

    await db.asServiceRole.entities.CombustivelProducao.bulkCreate(registros);

    return Response.json({
      imported: registros.length,
      meses,
      registros,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}