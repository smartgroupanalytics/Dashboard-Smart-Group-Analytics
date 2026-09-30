const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from '../server-shim.js';

// Estrutura da aba "Aderencia":
// Linha 1 (índice 0) = nomes das máquinas (Gravadora, JR, estampa 1, estampa 2, GR)
// Linha 2 (índice 1) = sub-cabeçalhos: OP, Produto, Metragem, Entrega, Situação
// Linha 3+ (índice 2+) = dados das OPs
// Cada bloco de máquina tem 6 colunas (5 dados + 1 gap):
//   Gravadora:  A(0)=OP, B(1)=Produto, C(2)=Metragem, D(3)=Entrega, E(4)=Situação
//   JR:          G(6)=OP, H(7)=Produto, I(8)=Metragem, J(9)=Entrega, K(10)=Situação
//   Estampa 1:  M(12)=OP, N(13)=Produto, O(14)=Metragem, P(15)=Entrega, Q(16)=Situação
//   Estampa 2:  S(18)=OP, T(19)=Produto, U(20)=Metragem, V(21)=Entrega, W(22)=Situação
//   GR:         Y(24)=OP, Z(25)=Produto, AA(26)=Metragem, AB(27)=Entrega, AC(28)=Situação
//   Revisão:    AE(30)=OP, AF(31)=Produto, AG(32)=Metragem, AH(33)=Entrega, AI(34)=Situação
const MACHINE_BLOCKS = [
  { maquina: "Gravadora",  opCol: 0,  prodCol: 1,  metCol: 2,  entCol: 3,  sitCol: 4 },
  { maquina: "JR",         opCol: 6,  prodCol: 7,  metCol: 8,  entCol: 9,  sitCol: 10 },
  { maquina: "Estampa 1", opCol: 12, prodCol: 13, metCol: 14, entCol: 15, sitCol: 16 },
  { maquina: "Estampa 2", opCol: 18, prodCol: 19, metCol: 20, entCol: 21, sitCol: 22 },
  { maquina: "GR",         opCol: 24, prodCol: 25, metCol: 26, entCol: 27, sitCol: 28 },
  { maquina: "Revisão",    opCol: 30, prodCol: 31, metCol: 32, entCol: 33, sitCol: 34 },
];

function parseNum(v) {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number'
    ? v
    : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Converte o valor da coluna Entrega (serial Excel, Date ou string dd/mm) em ISO YYYY-MM-DD
function entregaToISO(val) {
  if (val == null || val === '') return null;
  if (val instanceof Date) {
    const yyyy = val.getUTCFullYear();
    const mm = String(val.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(val.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const num = Number(val);
  if (!isNaN(num) && num > 30000) {
    const ms = Math.round((num - 25569) * 86400000);
    const date = new Date(ms);
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const s = String(val).trim();
  // Formato ISO "YYYY-MM-DD" ou "YYYY-MM-DD HH:MM:SS"
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // Formato BR "dd/mm/yyyy" ou "dd/mm/yy"
  const parts = s.split('/');
  if (parts.length >= 2) {
    const dd = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const yyyy = parts[2]
      ? (parts[2].length === 2 ? `20${parts[2]}` : parts[2])
      : String(new Date().getFullYear());
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

function isoToBR(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function isoToSerial(iso) {
  if (!iso) return null;
  const ms = new Date(iso + "T00:00:00Z").getTime();
  return String(Math.round(ms / 86400000 + 25569));
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

    // Procura a aba "Aderencia" (case-insensitive, com ou sem espaços)
    const sheetName = wb.SheetNames.find(n => n.trim().toLowerCase() === 'aderencia');
    if (!sheetName) {
      return Response.json({ error: `Aba "Aderencia" não encontrada. Abas disponíveis: ${wb.SheetNames.join(', ')}` }, { status: 422 });
    }
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

    if (rows.length < 3) {
      return Response.json({ error: 'Planilha vazia ou sem dados na aba Aderencia' }, { status: 422 });
    }

    // Detecta dinamicamente as colunas de cada bloco a partir da linha de sub-cabeçalhos (linha 1).
    // Sempre busca a coluna "Entrega" pelo texto do cabeçalho, garantindo que a data seja lida
    // da coluna correta mesmo que a ordem das colunas mude na planilha.
    const headerRow = rows[1] || [];
    const blocks = MACHINE_BLOCKS.map((block) => {
      const cols = { ...block };
      // Varre as 5 colunas do bloco (opCol .. opCol+4) procurando pelos sub-cabeçalhos
      for (let c = block.opCol; c <= block.opCol + 4; c++) {
        const h = String(headerRow[c] ?? '').trim().toLowerCase();
        if (!h) continue;
        if (h === 'op' || h === 'o.p' || h === 'o.p.') cols.opCol = c;
        else if (h === 'produto') cols.prodCol = c;
        else if (h === 'metragem' || h === 'metro' || h === 'metros') cols.metCol = c;
        else if (h === 'entrega') cols.entCol = c;
        else if (h === 'situação' || h === 'situacao' || h === 'sit') cols.sitCol = c;
      }
      return cols;
    });

    const records = [];
    // Linha 0 = nomes das máquinas, Linha 1 = sub-cabeçalhos, Linha 2+ = dados
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      for (const block of blocks) {
        const op = String(row[block.opCol] ?? '').trim();
        if (!op || op.toLowerCase() === 'total') continue;

        const produto = String(row[block.prodCol] ?? '').trim();
        const metragem = parseNum(row[block.metCol]);
        const entregaRaw = row[block.entCol];
        const isoDate = entregaToISO(entregaRaw);
        const entrega = isoToBR(isoDate) || String(entregaRaw ?? '').trim();
        const situacao = String(row[block.sitCol] ?? '').trim();

        records.push({
          maquina: block.maquina,
          num_op: op,
          produto: produto || undefined,
          metragem: metragem || undefined,
          entrega: entrega || undefined,
          data: isoDate || undefined,
          situacao: situacao || undefined,
        });
      }
    }

    if (records.length === 0) {
      return Response.json({ error: 'Nenhum registro válido encontrado na aba Aderencia' }, { status: 422 });
    }

    // Apaga apenas registros da(s) data(s) de entrega que estão sendo importadas agora,
    // preservando dias anteriores já gravados no banco.
    const uniqueDates = [...new Set(records.map(r => r.data).filter(Boolean))];
    const uniqueSerials = uniqueDates.map(isoToSerial).filter(Boolean);
    if (uniqueDates.length > 0) {
      await db.asServiceRole.entities.ProgramacaoOP.deleteMany({ data: { $in: uniqueDates } });
    }
    // Limpa também registros antigos no formato serial (ex: "46247") da mesma data
    if (uniqueSerials.length > 0) {
      await db.asServiceRole.entities.ProgramacaoOP.deleteMany({ entrega: { $in: uniqueSerials } });
    }
    await db.asServiceRole.entities.ProgramacaoOP.bulkCreate(records);

    const porMaquina = {};
    records.forEach(r => { porMaquina[r.maquina] = (porMaquina[r.maquina] || 0) + 1; });

    // Diagnóstico: datas encontradas e amostra de registros sem data
    const datasEncontradas = [...new Set(records.map(r => r.data).filter(Boolean))].sort();
    const semData = records.filter(r => !r.data).slice(0, 5).map(r => ({
      maquina: r.maquina, num_op: r.num_op, entrega_raw: r.entrega,
    }));

    return Response.json({
      imported: records.length,
      total: records.length,
      porMaquina,
      datasEncontradas,
      semData,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}