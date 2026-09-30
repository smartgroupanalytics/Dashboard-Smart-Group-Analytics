const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from '../server-shim.js';

function num(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const s = String(v).trim();
  if (s === '' || s === '#REF!' || /^#/.test(s)) return null;
  // Se tem vírgula → formato brasileiro (ponto=milhar, vírgula=decimal)
  // Se só tem ponto → pode ser decimal (8.84) ou milhar (1.234)
  // Heurística: se tem vírgula, trata como BR; senão, tenta direto
  let clean;
  if (s.includes(',')) {
    clean = s.replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
  } else {
    clean = s.replace(/[^\d.\-]/g, '');
  }
  const n = Number(clean);
  return isNaN(n) ? null : n;
}

const MES_MAP = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, '11': 11, '12': 12,
  '01': 1, '02': 2, '03': 3, '04': 4, '05': 5, '06': 6, '07': 7, '08': 8, '09': 9,
};

function parseMes(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    if (v >= 1 && v <= 12) return Math.round(v);
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.getMonth() + 1;
    return null;
  }
  const s = String(v).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.º°]/g, '').replace(/\s+/g, ' ');
  if (MES_MAP[s] != null) return MES_MAP[s];
  // tenta interpretar como data
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.getMonth() + 1;
  // correspondência parcial
  for (const [key, val] of Object.entries(MES_MAP)) {
    if (s.includes(key) || key.includes(s)) return val;
  }
  return null;
}

// Lê o valor de uma célula diretamente do objeto da planilha (mais robusto que sheet_to_json)
// Retorna o valor numérico ou string, priorizando: .v (valor cru), .w (texto formatado)
function getCell(sheet, addr) {
  const cell = sheet[addr];
  if (!cell) return null;
  // Para fórmulas, .v é o resultado cacheado; se ausente, cai para .w
  if (cell.v != null && cell.v !== '') return cell.v;
  if (cell.w != null && cell.w !== '') return cell.w;
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
    const sheetName =
      wb.SheetNames.find((n) => n.trim().toLowerCase() === 'dados') ||
      wb.SheetNames.find((n) => /dados/i.test(n)) ||
      wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];

    // Estrutura confirmada:
    // Coluna C = mês | Coluna G = metros de quebra | Coluna J = qtde ops
    // 2025: linhas 2-13 | 2026: linhas 14-25
    const perdaByMes = {};
    const debug = [];

    const readRange = (rowStart, rowEnd, yearKey) => {
      for (let row = rowStart; row <= rowEnd; row++) {
        const mesRaw = getCell(sheet, `C${row}`);
        const gRaw = getCell(sheet, `G${row}`);
        const jRaw = getCell(sheet, `J${row}`);
        const mes = parseMes(mesRaw);
        const g = num(gRaw);
        const j = num(jRaw);
        debug.push({ row, year: yearKey, mesRaw, gRaw, jRaw, mes, g, j });
        if (mes == null) continue;
        if (g == null || j == null || j === 0) continue;
        const perda = Math.round((g / j) * 100) / 100;
        if (!perdaByMes[mes]) perdaByMes[mes] = {};
        perdaByMes[mes][yearKey] = perda;
      }
    };

    readRange(2, 13, 'perda_2025');
    readRange(14, 25, 'perda_2026');

    const meses = Object.keys(perdaByMes).map(Number).sort((a, b) => a - b);
    if (meses.length === 0) {
      return Response.json({ error: 'Nenhum valor encontrado na aba DADOS (colunas C, G e J).', debug }, { status: 422 });
    }

    await db.asServiceRole.entities.PerdaOpMensal.deleteMany({});
    const records = meses.map((mes) => ({
      mes,
      perda_2025: perdaByMes[mes].perda_2025 ?? null,
      perda_2026: perdaByMes[mes].perda_2026 ?? null,
    }));
    const created = await db.asServiceRole.entities.PerdaOpMensal.bulkCreate(records);

    return Response.json({ imported: created.length, meses, debug });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}