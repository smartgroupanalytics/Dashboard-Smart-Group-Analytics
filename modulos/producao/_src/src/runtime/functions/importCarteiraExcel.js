const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from '../server-shim.js';

function num(v) {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Extrai texto de motivo da coluna L (ignora datas e vazios)
function textoMotivo(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) return '';
  const s = String(v).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) return '';
  return s;
}

// Categorização: col A (TIPO: PD/LE) + col I (CLIENTE)
function categorize(tipo, cliente) {
  const t = String(tipo ?? '').trim().toUpperCase();
  const c = String(cliente ?? '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (t === 'PD') {
    if (c.includes('BEIRA RIO')) return 'Pedido Beira Rio';
    return 'Pedidos Outros';
  }
  if (t === 'LE') {
    if (c.includes('BEIRA RIO') || c.includes('COMITE')) return 'Estoque Beira Rio';
    if (c.includes('ESTOQUE STK')) return 'Estoque STK';
    return 'Estoque Outros';
  }
  return null;
}

// Cores indexadas padrão do Excel (amarelo/verde relevantes)
const INDEXED_YELLOW = new Set([5, 44, 13, 34, 35]);
const INDEXED_GREEN = new Set([3, 11, 14, 43, 10, 50, 51]);

// Mapa de cores de tema do Office (padrão)
const THEME_RGB = {
  0: [0xFF, 0xFF, 0xFF], 1: [0x00, 0x00, 0x00], 2: [0xE7, 0xE6, 0xE6],
  3: [0x44, 0x54, 0x5A], 4: [0x44, 0x72, 0xC4], 5: [0xED, 0x7D, 0x31],
  6: [0xA5, 0xA5, 0xA5], 7: [0xFF, 0xC0, 0x00], 8: [0x5B, 0x9B, 0xD5],
  9: [0x70, 0xAD, 0x47], 10: [0xFF, 0xC0, 0x00], 11: [0x5B, 0x9B, 0xD5],
  12: [0x70, 0xAD, 0x47],
};

function hexChannel(rgb) {
  if (!rgb) return '';
  const s = String(rgb).toUpperCase();
  return s.length === 8 ? s.slice(2) : s;
}

function applyTint(rgb, tint) {
  if (!tint || tint === 0) return rgb;
  const [r, g, b] = rgb;
  if (tint < 0) {
    const f = 1 + tint;
    return [Math.round(r * f), Math.round(g * f), Math.round(b * f)];
  }
  return [
    Math.round(r + (255 - r) * tint),
    Math.round(g + (255 - g) * tint),
    Math.round(b + (255 - b) * tint),
  ];
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

// Resolve RGB de fgColor (rgb, indexed, ou theme)
function resolveRgb(fg) {
  if (!fg) return null;
  if (fg.rgb && fg.rgb !== '00000000') {
    const hex = hexChannel(fg.rgb);
    if (!hex || hex.length < 6) return null;
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  if (fg.indexed != null) {
    const idxMap = {
      5: [0xFF, 0xFF, 0x00], 13: [0xFF, 0xFF, 0x00], 34: [0xFF, 0xFF, 0x00], 35: [0xFF, 0xFF, 0x00],
      3: [0x00, 0xFF, 0x00], 11: [0x00, 0xB0, 0x50], 14: [0x92, 0xD0, 0x50],
      43: [0x92, 0xD0, 0x50], 10: [0x00, 0x80, 0x00], 50: [0x00, 0xFF, 0x80], 51: [0x00, 0xCC, 0x66],
    };
    if (idxMap[fg.indexed]) return idxMap[fg.indexed];
  }
  if (fg.theme != null && THEME_RGB[fg.theme]) {
    return applyTint(THEME_RGB[fg.theme], fg.tint || 0);
  }
  return null;
}

// Classifica a cor de fundo da célula: 'green' | 'yellow' | null
function colorClass(cell) {
  if (!cell || !cell.s || !cell.s.fill) return null;
  const fill = cell.s.fill;
  if (fill.patternType && fill.patternType !== 'solid') return null;
  const fg = fill.fgColor;
  if (!fg) return null;

  // Tenta RGB direto primeiro (mais preciso)
  if (fg.rgb && fg.rgb !== '00000000') {
    const hex = hexChannel(fg.rgb);
    if (hex && hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const [h, s, l] = rgbToHsl(r, g, b);
      if (s >= 0.1 && l > 0.05 && l < 0.95) {
        if (h >= 35 && h <= 75) return 'yellow';
        if (h >= 75 && h <= 170) return 'green';
      }
      // Fallback RGB bruto
      if (r >= 200 && g >= 180 && b <= 120) return 'yellow';
      if (g >= 120 && r <= 200 && b <= 200 && g > r && g > b) return 'green';
      return null;
    }
  }

  // Cor indexada
  if (fg.indexed != null) {
    if (INDEXED_YELLOW.has(fg.indexed)) return 'yellow';
    if (INDEXED_GREEN.has(fg.indexed)) return 'green';
    // Tenta resolver via mapa estendido
    const rgb = resolveRgb(fg);
    if (rgb) {
      const [h, s, l] = rgbToHsl(...rgb);
      if (s >= 0.1 && l > 0.05 && l < 0.95) {
        if (h >= 35 && h <= 75) return 'yellow';
        if (h >= 75 && h <= 170) return 'green';
      }
    }
    return null;
  }

  // Theme color
  if (fg.theme != null) {
    const rgb = resolveRgb(fg);
    if (rgb) {
      const [h, s, l] = rgbToHsl(...rgb);
      if (s >= 0.08 && l > 0.05 && l < 0.95) {
        if (h >= 35 && h <= 75) return 'yellow';
        if (h >= 75 && h <= 170) return 'green';
      }
    }
    return null;
  }

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

    // Faixas de linhas opcionais (1-indexed): [inicio, fim]
    const semanaAtualRows = Array.isArray(body?.semana_atual_rows) ? body.semana_atual_rows : null;
    const faltaProgramarRows = Array.isArray(body?.falta_programar_rows) ? body.falta_programar_rows : null;

    const resp = await fetch(file_url);
    if (!resp.ok) return Response.json({ error: 'Falha ao baixar o arquivo' }, { status: 502 });
    const buf = await resp.arrayBuffer();

    const XLSX = await import('xlsx');
    // cellStyles: true para ler a cor de preenchimento das células
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellStyles: true });

    // Procura aba do mês mais recente; fallback primeira aba
    const monthPriority = ['SETEMBRO', 'AGOSTO', 'JULHO', 'JUNHO', 'MAIO'];
    let sheetName = monthPriority.map((m) => wb.SheetNames.find((n) => n.trim().toUpperCase() === m)).find(Boolean);
    if (!sheetName) sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return Response.json({ error: 'Nenhuma aba encontrada na planilha.' }, { status: 422 });
    }
    const sheet = wb.Sheets[sheetName];

    // Colunas: A=0 (TIPO), G=6 (CÓDIGO), H=7 (DESCRIÇÃO), I=8 (CLIENTE), J=9 (QTD), L=11 (MOTIVO)
    const colTipo = 0;
    const colCod = 6;
    const colDesc = 7;
    const colCliente = 8;
    const colQtd = 9;
    const colMotivo = 11;

    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    const cats = {
      'Pedido Beira Rio': 0,
      'Pedidos Outros': 0,
      'Estoque Beira Rio': 0,
      'Estoque STK': 0,
      'Estoque Outros': 0,
    };
    const catsFalta = {
      'Pedido Beira Rio': 0,
      'Pedidos Outros': 0,
      'Estoque Beira Rio': 0,
      'Estoque STK': 0,
      'Estoque Outros': 0,
    };

    const itensProgramar = [];
    let greenRows = 0;
    let yellowRows = 0;
    let coloredButUncategorized = 0;
    let uncategorizedSamples = [];

    // Percorre todas as linhas classificando pela cor da célula na coluna A
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cellTipo = sheet[XLSX.utils.encode_cell({ r, c: colTipo })];
      if (!cellTipo) continue;

      const excelRow = r + 1;
      const inSemanaAtual = semanaAtualRows && excelRow >= semanaAtualRows[0] && excelRow <= semanaAtualRows[1];
      const inFaltaProgramar = faltaProgramarRows
        ? (excelRow >= faltaProgramarRows[0] && excelRow <= faltaProgramarRows[1])
        : (semanaAtualRows ? !inSemanaAtual : false);

      let color = null;
      if (inSemanaAtual) {
        color = 'green';
      } else if (inFaltaProgramar) {
        color = 'yellow';
      } else if (!semanaAtualRows && !faltaProgramarRows) {
        color = colorClass(cellTipo);
      }

      if (!color) continue; // linha sem cor/fora das faixas — ignora

      const tipo = cellTipo.v;
      // Cliente (col I) pode estar em outra célula
      const cellCliente = sheet[XLSX.utils.encode_cell({ r, c: colCliente })];
      const cellQtd = sheet[XLSX.utils.encode_cell({ r, c: colQtd })];
      const cellCod = sheet[XLSX.utils.encode_cell({ r, c: colCod })];
      const cellDesc = sheet[XLSX.utils.encode_cell({ r, c: colDesc })];
      const cellMotivo = sheet[XLSX.utils.encode_cell({ r, c: colMotivo })];

      const cat = categorize(tipo, cellCliente?.v);
      if (!cat) {
        coloredButUncategorized++;
        if (uncategorizedSamples.length < 5) {
          uncategorizedSamples.push({ row: r + 1, tipo: String(tipo ?? '').slice(0, 10), cliente: String(cellCliente?.v ?? '').slice(0, 20) });
        }
        continue; // não é PD/LE — ignora mesmo se colorida
      }

      const metros = num(cellQtd?.v);

      if (color === 'green') {
        greenRows++;
        cats[cat] += metros;
      } else if (color === 'yellow') {
        yellowRows++;
        catsFalta[cat] += metros;
        const motivo = textoMotivo(cellMotivo?.v);
        if (motivo) {
          itensProgramar.push({
            semana_label: 'Semana Atual',
            produto: String(cellCod?.v ?? '').trim(),
            descricao: String(cellDesc?.v ?? '').trim(),
            metragem: metros,
            motivo,
          });
        }
      }
    }

    if (greenRows === 0 && yellowRows === 0) {
      // Diagnóstico: amostra cores encontradas na coluna A
      const sampleFills = [];
      let cellsWithFill = 0;
      for (let r = range.s.r; r <= Math.min(range.s.r + 60, range.e.r); r++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c: colTipo })];
        if (cell && cell.s && cell.s.fill && cell.s.fill.fgColor) {
          cellsWithFill++;
          if (sampleFills.length < 8) {
            const fg = cell.s.fill.fgColor;
            sampleFills.push({
              row: r + 1,
              value: String(cell.v ?? '').slice(0, 20),
              patternType: cell.s.fill.patternType ?? null,
              rgb: fg.rgb ?? null,
              indexed: fg.indexed ?? null,
              theme: fg.theme ?? null,
              tint: fg.tint ?? null,
            });
          }
        }
      }
      return Response.json({
        error: `Nenhuma linha VERDE ou AMARELO encontrada. ${cellsWithFill} célula(s) com preenchimento na coluna A. ${coloredButUncategorized} linha(s) colorida(s) rejeitada(s) (não são PD/LE). Verifique se as cores são verde/amarelo sólido e se a coluna A contém PD ou LE. Amostra cores: ${JSON.stringify(sampleFills)} | Amostra rejeitadas: ${JSON.stringify(uncategorizedSamples)}`,
        diagnostic: { sheetName, cellsWithFill, sampleFills, coloredButUncategorized, uncategorizedSamples },
      }, { status: 422 });
    }

    const totalCarteira = Object.values(cats).reduce((s, v) => s + v, 0);
    const faltaTotal = Object.values(catsFalta).reduce((s, v) => s + v, 0);

    const carteiraRecord = {
      semana_label: 'Semana Atual',
      ordem: 0,
      total_carteira: totalCarteira,
      pedido_beira_rio: cats['Pedido Beira Rio'],
      pedidos_outros: cats['Pedidos Outros'],
      estoque_beira_rio: cats['Estoque Beira Rio'],
      estoque_stk: cats['Estoque STK'],
      estoque_outros: cats['Estoque Outros'],
      falta_programar_total: faltaTotal,
    };

    const ordemCats = ['Pedido Beira Rio', 'Pedidos Outros', 'Estoque Beira Rio', 'Estoque STK', 'Estoque Outros'];
    const faltaItems = [];
    let ordem = 0;
    for (const cat of ordemCats) {
      if (catsFalta[cat] > 0) {
        faltaItems.push({
          semana_label: 'Semana Atual',
          ordem,
          categoria: cat,
          metros: catsFalta[cat],
        });
        ordem++;
      }
    }

    await db.asServiceRole.entities.CarteiraPedido.deleteMany({});
    await db.asServiceRole.entities.FaltaProgramarItem.deleteMany({});
    await db.asServiceRole.entities.ItemProgramar.deleteMany({});
    await db.asServiceRole.entities.CarteiraPedido.create(carteiraRecord);
    if (faltaItems.length > 0) {
      await db.asServiceRole.entities.FaltaProgramarItem.bulkCreate(faltaItems);
    }
    if (itensProgramar.length > 0) {
      await db.asServiceRole.entities.ItemProgramar.bulkCreate(itensProgramar);
    }

    return Response.json({
      imported: 1,
      carteira: carteiraRecord,
      faltaItems: faltaItems.length,
      itensProgramar: itensProgramar.length,
      greenRows,
      yellowRows,
      cats,
      catsFalta,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}