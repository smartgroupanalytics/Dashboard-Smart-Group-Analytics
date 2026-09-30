const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from '../server-shim.js';

function num(v) {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Coluna A tem o número do mês (1-12), coluna B tem a abreviação ("ABR", "MAI").
// Converte para "YYYY-MM-01" usando o ano atual.
const MESES_ABBR = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

function parseMes(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) {
    const m = v.getMonth() + 1;
    if (m >= 1 && m <= 12) return `${v.getFullYear()}-${String(m).padStart(2, '0')}-01`;
  }
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d]/g, ''));
  if (!isNaN(n) && n >= 1 && n <= 12) {
    const ano = new Date().getFullYear();
    return `${ano}-${String(n).padStart(2, '0')}-01`;
  }
  // Tenta abreviação de mês em português (ex: "ABR", "MAI")
  const abbr = String(v).trim().toLowerCase().substring(0, 3);
  if (MESES_ABBR[abbr]) {
    const ano = new Date().getFullYear();
    return `${ano}-${String(MESES_ABBR[abbr]).padStart(2, '0')}-01`;
  }
  return null;
}

// Colunas: A=DATA(0)
// Ocioso: C=JR(2), D=Gravadora(3), E=Estampa1(4), F=Estampa2(5), G=GR2(6), H=GR3(7), I=Digital Solvente(8), J=Digital UV(9)
// Disponível: L=JR(11), M=Gravadora(12), N=Estampa1(13), O=Estampa2(14), P=GR2(15), Q=GR3(16), R=Digital Solvente(17), S=Digital UV(18)
const MAQUINAS = [
  { nome: "JR", ocioso: 2, disp: 10 },
  { nome: "Gravadora", ocioso: 3, disp: 11 },
  { nome: "Estampa 1", ocioso: 4, disp: 12 },
  { nome: "Estampa 2", ocioso: 5, disp: 13 },
  { nome: "GR 2", ocioso: 6, disp: 14 },
  { nome: "GR 3", ocioso: 7, disp: 15 },
  { nome: "Digital Solvente", ocioso: 8, disp: 16 },
  { nome: "Digital UV", ocioso: 9, disp: 17 },
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

    const normalizeName = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').trim();
    const sheetName = wb.SheetNames.find(n => {
      const norm = normalizeName(n);
      return norm.includes('tempoocioso') || norm.includes('ocioso');
    }) || (wb.SheetNames.length >= 17 ? wb.SheetNames[16] : null);
    if (!sheetName) return Response.json({ error: `Aba não encontrada. Total de abas: ${wb.SheetNames.length}. Abas: ${wb.SheetNames.join(', ')}` }, { status: 422 });

    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

    const records = [];
    let rowsWithDates = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const data = parseMes(row[0]) || parseMes(row[1]);
      if (!data) continue;
      rowsWithDates++;

      for (const mq of MAQUINAS) {
        const ocioso = num(row[mq.ocioso]);
        const disp = num(row[mq.disp]);
        // pula linha apenas se ambos forem zero
        if (ocioso === 0 && disp === 0) continue;
        records.push({
          data,
          maquina: mq.nome,
          tempo_ocioso: ocioso,
          tempo_disponivel: disp,
        });
      }
    }

    if (records.length === 0) {
      const sample = rows.slice(0, 10).map(r => Array.isArray(r) ? r.slice(0, 20) : r);
      return Response.json({ imported: 0, debugSample: sample, debugRowsWithDates: rowsWithDates, totalRows: rows.length, sheetName });
    }

    await db.asServiceRole.entities.TempoOcioso.deleteMany({});
    const created = await db.asServiceRole.entities.TempoOcioso.bulkCreate(records);

    const sample = rows.slice(0, 10).map(r => Array.isArray(r) ? r.slice(0, 20) : r);
    return Response.json({ imported: created.length, debugSample: sample, debugRowsWithDates: rowsWithDates, totalRows: rows.length, sheetName });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}