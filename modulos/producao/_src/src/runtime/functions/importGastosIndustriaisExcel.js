const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from '../server-shim.js';
import { normalize, parseNum, parseMes, MESES_LABELS } from '../shared/excelUtils.js';

const SHEETS = [
  { name: 'FOLHA INDUSTRIA', categoria: 'folha_industrial' },
  { name: 'MANUTENCAO', categoria: 'manutencao' },
  { name: 'RESIDUOS E REJEITOS', categoria: 'residuos_rejeitos' },
];

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

    const registros = [];
    const categoriasEncontradas = [];

    for (const sheetConfig of SHEETS) {
      const target = normalize(sheetConfig.name);
      let sheetName = wb.SheetNames.find((n) => normalize(n) === target);
      if (!sheetName) {
        sheetName = wb.SheetNames.find((n) => normalize(n).includes(target.split(' ')[0]));
      }
      if (!sheetName) continue;
      categoriasEncontradas.push(sheetConfig.categoria);

      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

      let headerIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;
        if (row.some((c) => normalize(c).includes('mes'))) {
          headerIdx = i; break;
        }
      }
      if (headerIdx < 0) headerIdx = 0;

      const header = rows[headerIdx];
      let mesCol = -1, orcadoCol = -1, val2025Col = -1, val2026Col = -1;
      for (let j = 0; j < header.length; j++) {
        const h = normalize(header[j]);
        if (h.includes('mes') && mesCol < 0) mesCol = j;
        if (h.includes('orcado') && orcadoCol < 0) orcadoCol = j;
        if (h.includes('2025') && val2025Col < 0) val2025Col = j;
        if (h.includes('2026') && val2026Col < 0) val2026Col = j;
      }
      if (mesCol < 0) mesCol = 1;

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;
        const mes = parseMes(row[mesCol]);
        if (!mes) continue;

        registros.push({
          categoria: sheetConfig.categoria,
          mes,
          mes_label: MESES_LABELS[mes],
          orcado: orcadoCol >= 0 ? parseNum(row[orcadoCol]) : 0,
          valor_2025: val2025Col >= 0 ? parseNum(row[val2025Col]) : 0,
          valor_2026: val2026Col >= 0 ? parseNum(row[val2026Col]) : 0,
        });
      }
    }

    if (registros.length === 0) {
      return Response.json({ error: 'Nenhum dado válido encontrado nas abas FOLHA INDUSTRIA, Manutenção ou Resíduos e Rejeitos.' }, { status: 422 });
    }

    await db.asServiceRole.entities.GastosIndustriais.deleteMany({ categoria: { $in: categoriasEncontradas } });
    await db.asServiceRole.entities.GastosIndustriais.bulkCreate(registros);

    return Response.json({ imported: registros.length, categorias: categoriasEncontradas, registros });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}