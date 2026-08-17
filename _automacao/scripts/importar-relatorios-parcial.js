/* global process */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

/*
 * ============================================================
 * ANÁLISE INTEGRADA COMERCIAL
 * PASSO 2 — IMPORTADOR ÚNICO DOS 9 RELATÓRIOS
 * ============================================================
 *
 * ESTE SCRIPT NÃO ALTERA O MÓDULO COMPRAS E SUPRIMENTOS.
 *
 * Também NÃO substitui ainda os arquivos usados pelo dashboard.
 * Ele grava tudo numa área isolada:
 *
 * public/data/importacao-comercial/
 *
 * Isso permite validar a importação antes de ligá-la ao dashboard.
 * ============================================================
 */

const inputArg =
  process.argv[2] ||
  './_automacao/entrada-relatorios';

const inputDir =
  path.resolve(inputArg);

const projectRoot =
  path.resolve(
    process.argv[3] ||
    process.cwd()
  );

const appDataRoot =
  path.join(
    projectRoot,
    'modulos',
    'analise-comercial',
    'app',
    'data'
  );

const outputRoot =
  path.join(
    appDataRoot,
    'importacao-comercial'
  );

const tempRoot =
  path.join(
    projectRoot,
    '_automacao',
    '.importacao-comercial-temp'
  );

const backupRoot =
  path.join(
    projectRoot,
    '_automacao',
    'backups-importacao-comercial'
  );

const gmailStatusPath =
  path.resolve(
    process.argv[4] ||
    path.join(
      inputDir,
      'status-gmail.json'
    )
  );

const updateStatusPath =
  path.join(
    appDataRoot,
    'status-atualizacao-comercial.json'
  );

const versionPath =
  path.join(
    appDataRoot,
    '_version.json'
  );

const REPORTS = {
  ESTOQUE: {
    destination:
      'stk/estoque.json',

    required: [
      'Produto',
      'Desc.completa',
      'Qtd.física',
      'Grupo',
    ],
  },

  COMPRAS: {
    destination:
      'stk/compras.json',

    required: [
      'Produto',
      'Desc.completa',
      'Qtd.aberto',
      'Grupo',
    ],
  },

  CONSUMO: {
    destination:
      'stk/consumo.json',

    required: [
      'Cód.prod',
      'Desc.completa',
      'Qtd.movimentada',
      'Dt.movto',
      'Grupo',
    ],
  },

  OP: {
    destination:
      'stk/op.json',

    required: [
      'Produto',
      'Desc.completa',
      'Qtd.produzir',
      'Grupo',
    ],
  },

  VENDAS: {
    destination:
      'stk/vendas.json',

    required: [
      'Dt.faturam',
      'Produto',
      'Desc.completa',
      'Qtd.faturada',
      'Grupo',
    ],
  },

  PEDIDOS_EM_ABERTO: {
    /*
     * O relatório de pedidos é mantido em COMUM
     * neste passo.
     *
     * No Passo 3 cada produto será classificado
     * definitivamente como STK ou BEIRA RIO
     * usando o cadastro/código do produto.
     *
     * Isso evita classificar um pedido errado
     * apenas pela descrição.
     */
    destination:
      'comum/pedidos_abertos.json',

    required: [
      'Pedido',
      'Produto',
      'Desc.completa',
      'Qtd.solic.item',
      'Valor Fat+Valor IPI+Valor Frete',
      'Descr.Pos.item',
      'Cliente',
      'Razão social',
    ],
  },

  ESTOQUEBR: {
    destination:
      'beira-rio/estoque.json',

    required: [
      'Produto',
      'Desc.completa',
      'Grupo',
      'Qtd.física',
    ],
  },

  OPBR: {
    destination:
      'beira-rio/op.json',

    required: [
      'Produto',
      'Desc.completa',
      'Grupo',
      'Qtd.produzir',
    ],
  },

  VENDASBR: {
    destination:
      'beira-rio/vendas.json',

    required: [
      'Dt.faturam',
      'Produto',
      'Desc.completa',
      'Grupo',
      'Cliente',
      'Qtd.faturada',
    ],
  },
};

const REPORT_FILES = {
  ESTOQUE:
    'ESTOQUE.xlsx',
  COMPRAS:
    'COMPRAS.xlsx',
  CONSUMO:
    'CONSUMO.xlsx',
  OP:
    'OP.xlsx',
  VENDAS:
    'VENDAS.xlsx',
  PEDIDOS_EM_ABERTO:
    'PEDIDOS EM ABERTO.xlsx',
  ESTOQUEBR:
    'ESTOQUEBR.xlsx',
  OPBR:
    'OPBR.xlsx',
  VENDASBR:
    'VENDASBR.xlsx',
};

function text(value) {
  return String(
    value ?? ''
  ).trim();
}

function normalizeText(value) {
  return text(value)
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function number(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0;
  }

  if (
    typeof value === 'number'
  ) {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  let normalized =
    String(value)
      .trim()
      .replace(/\s/g, '');

  if (
    normalized.includes(',') &&
    normalized.includes('.')
  ) {
    normalized =
      normalized
        .replace(/\./g, '')
        .replace(',', '.');
  } else if (
    normalized.includes(',')
  ) {
    normalized =
      normalized.replace(',', '.');
  }

  const result =
    Number(normalized);

  return Number.isFinite(result)
    ? result
    : 0;
}

function code(value) {
  /*
   * O código é armazenado como texto.
   * Assim não perdemos zeros à esquerda
   * caso algum cadastro futuro utilize.
   */
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  if (
    typeof value === 'number' &&
    Number.isInteger(value)
  ) {
    return String(value);
  }

  return text(value);
}

function isoDate(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    const yyyy =
      value.getFullYear();

    const mm =
      String(
        value.getMonth() + 1
      ).padStart(2, '0');

    const dd =
      String(
        value.getDate()
      ).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  /*
   * Excel serial date.
   * Base usada pelo Excel para planilhas Windows:
   * 1899-12-30.
   */
  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 20000 &&
    value < 100000
  ) {
    const epoch =
      Date.UTC(
        1899,
        11,
        30
      );

    const date =
      new Date(
        epoch +
        Math.round(value) *
          86400000
      );

    return date
      .toISOString()
      .slice(0, 10);
  }

  const raw =
    text(value);

  /*
   * Caso já venha YYYY-MM-DD.
   */
  if (
    /^\d{4}-\d{2}-\d{2}/.test(
      raw
    )
  ) {
    return raw.slice(0, 10);
  }

  /*
   * Caso venha DD/MM/YYYY.
   */
  const br =
    raw.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );

  if (br) {
    const dd =
      br[1].padStart(2, '0');

    const mm =
      br[2].padStart(2, '0');

    return `${br[3]}-${mm}-${dd}`;
  }

  return raw || null;
}

function normalizeFileName(
  fileName
) {
  return normalizeText(
    fileName
      .replace(/\.XLSX$/i, '')
      .replace(
        /\s*\(\d+\)\s*$/i,
        ''
      )
  )
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function reportTypeFromName(
  fileName
) {
  const normalized =
    normalizeFileName(
      fileName
    );

  const aliases = {
    ESTOQUE:
      'ESTOQUE',

    COMPRAS:
      'COMPRAS',

    CONSUMO:
      'CONSUMO',

    OP:
      'OP',

    VENDAS:
      'VENDAS',

    PEDIDOS_EM_ABERTO:
      'PEDIDOS_EM_ABERTO',

    ESTOQUEBR:
      'ESTOQUEBR',

    ESTOQUE_BR:
      'ESTOQUEBR',

    OPBR:
      'OPBR',

    OP_BR:
      'OPBR',

    VENDASBR:
      'VENDASBR',

    VENDAS_BR:
      'VENDASBR',
  };

  return aliases[
    normalized
  ] || '';
}

function readWorkbook(
  filePath
) {
  /*
   * Lê por Buffer para funcionar corretamente
   * em Node ESM com a versão atual do xlsx.
   */
  const buffer =
    fs.readFileSync(
      filePath
    );

  const workbook =
    XLSX.read(
      buffer,
      {
        type: 'buffer',
        cellDates: true,
      }
    );

  if (
    !workbook.SheetNames?.length
  ) {
    throw new Error(
      'Planilha sem abas'
    );
  }

  const sheetName =
    workbook.SheetNames[0];

  const sheet =
    workbook.Sheets[
      sheetName
    ];

  const matrix =
    XLSX.utils.sheet_to_json(
      sheet,
      {
        header: 1,
        raw: true,
        defval: null,
      }
    );

  return {
    sheetName,
    matrix,
  };
}

function findHeaderRow(
  matrix,
  required
) {
  const requiredNormalized =
    required.map(
      normalizeText
    );

  for (
    let index = 0;
    index <
      Math.min(
        matrix.length,
        30
      );
    index += 1
  ) {
    const row =
      Array.isArray(
        matrix[index]
      )
        ? matrix[index]
        : [];

    const normalizedCells =
      new Set(
        row
          .map(
            normalizeText
          )
          .filter(Boolean)
      );

    const matched =
      requiredNormalized.every(
        (header) =>
          normalizedCells.has(
            header
          )
      );

    if (matched) {
      return index;
    }
  }

  return -1;
}

function buildRows(
  matrix,
  headerIndex
) {
  const headers =
    matrix[headerIndex].map(
      (value) =>
        text(value)
    );

  return matrix
    .slice(
      headerIndex + 1
    )
    .filter(
      (row) =>
        Array.isArray(row) &&
        row.some(
          (value) =>
            value !== null &&
            value !== undefined &&
            text(value) !== ''
        )
    )
    .map((row) =>
      Object.fromEntries(
        headers
          .map(
            (
              header,
              index
            ) => [
              header,
              row[index],
            ]
          )
          .filter(
            ([header]) =>
              header
          )
      )
    );
}

function normalizeEstoque(
  row,
  source
) {
  return {
    fonte_comercial:
      source,

    produto:
      code(row['Produto']),

    cod_altern_1:
      text(
        row['Cód.altern.1']
      ),

    desc_completa:
      text(
        row['Desc.completa']
      ),

    qtd_fisica:
      number(
        row['Qtd.física']
      ),

    un:
      text(row['UN']),

    vlr_tot_est:
      number(
        row['Vlr.tot.est']
      ),

    grupo:
      row['Grupo'],

    subgrupo:
      row['Subgrupo'],

    abreviacao:
      text(
        row['Abreviação']
      ),

    sig_emp:
      text(
        row['Sig.emp']
      ),

    colecao:
      text(
        row['Coleção']
      ),
  };
}

function normalizeCompra(
  row
) {
  return {
    fonte_comercial:
      'STK',

    nro_oc:
      code(
        row['Núm.OC']
      ),

    fornecedor:
      code(row['Forn']),

    razao_social:
      text(
        row['Razão social']
      ),

    dt_emissao:
      isoDate(
        row['Dt.emiss']
      ),

    produto:
      code(row['Produto']),

    grupo:
      row['Grupo'],

    subgrupo:
      row['Subgrupo'],

    desc_completa:
      text(
        row['Desc.completa']
      ),

    qtde:
      number(row['Qtde']),

    qtd_aberto:
      number(
        row['Qtd.aberto']
      ),

    vlr_un:
      number(row['Vlr.un']),

    dt_orig_ent:
      isoDate(
        row['Dt.orig.ent']
      ),

    dt_prazo_ent:
      isoDate(
        row['Dt.prazo ent']
      ),

    sig_emp:
      text(
        row['Sig.emp']
      ),
  };
}

function normalizeConsumo(
  row
) {
  return {
    fonte_comercial:
      'STK',

    cod_prod:
      code(
        row['Cód.prod']
      ),

    produto:
      code(
        row['Cód.prod']
      ),

    desc_completa:
      text(
        row['Desc.completa']
      ),

    grupo:
      row['Grupo'],

    subgrupo:
      row['Subgrupo'],

    orig_movto:
      row['Orig.movto'],

    descr_orig_movto:
      text(
        row[
          'Descr.Orig.movto'
        ]
      ),

    qtd_movimentada:
      number(
        row[
          'Qtd.movimentada'
        ]
      ),

    dt_movto:
      isoDate(
        row['Dt.movto']
      ),
  };
}

function normalizeOP(
  row,
  source
) {
  return {
    fonte_comercial:
      source,

    nro_op:
      code(row['Nro.OP']),

    produto:
      code(row['Produto']),

    desc_completa:
      text(
        row['Desc.completa']
      ),

    grupo:
      row['Grupo'],

    subgrupo:
      row['Subgrupo'],

    qtd_produzir:
      number(
        row['Qtd.produzir']
      ),

    dt_saida:
      isoDate(
        row[
          'Dt.entr.(data saída)'
        ]
      ),

    centro_custo:
      row[
        'Cent.custo últ.inic.prod'
      ],

    abreviacao:
      text(
        row['Abreviação']
      ),
  };
}

function normalizeVenda(
  row,
  source
) {
  return {
    fonte_comercial:
      source,

    dt_entrada:
      isoDate(
        row['Dt.entrada']
      ),

    dt_faturam:
      isoDate(
        row['Dt.faturam']
      ),

    produto:
      code(row['Produto']),

    desc_completa:
      text(
        row['Desc.completa']
      ),

    pedido:
      code(
        row['PEDIDO']
      ),

    cfop:
      code(row['CFOP']),

    grupo:
      row['Grupo'],

    subgrupo:
      row['Subgrupo'],

    cliente:
      code(row['Cliente']),

    razao_social:
      text(
        row['Razão social']
      ),

    qtd_faturada:
      number(
        row['Qtd.faturada']
      ),

    qtd_item:
      number(
        row['Qtd.item']
      ),

    nota:
      code(row['Nota']),

    vlr_un:
      number(row['Vlr.un']),

    vlr_liq_item:
      number(
        row['Vlr.líq.item']
      ),

    sig_emp:
      text(
        row['Sig.emp']
      ),

    posicao_item:
      text(
        row['Posição do item']
      ),

    representante:
      code(
        row['Representante']
      ),

    abreviacao:
      text(
        row['Abreviação']
      ),

    vlr_comissao_rep:
      number(
        row[
          'Vlr.comissão rep'
        ]
      ),

    cod_altern_1:
      text(
        row['Cód.altern.1']
      ),
  };
}

function normalizePedido(
  row
) {
  return {
    /*
     * A classificação STK / BEIRA RIO será
     * feita no Passo 3 pelo código do produto.
     */
    fonte_comercial:
      'PENDENTE_CLASSIFICACAO',

    dt_ent_item:
      isoDate(
        row['Dt.ent.item']
      ),

    dt_prevista:
      isoDate(
        row['Dt.faturam']
      ),

    pedido:
      code(row['Pedido']),

    produto:
      code(row['Produto']),

    desc_completa:
      text(
        row['Desc.completa']
      ),

    grupo:
      row['Grupo'],

    descricao_grupo:
      text(
        row['Descrição']
      ),

    nro_nota:
      number(
        row['Nro.nota']
      ),

    nat_oper:
      code(
        row['Nat.oper']
      ),

    qtd_item:
      number(
        row['Qtd.item/Ft']
      ),

    un:
      text(row['UN']),

    qtd_solicitada:
      number(
        row['Qtd.solic.item']
      ),

    /*
     * Campo oficial usado pelo Comercial.
     */
    qtd_aberto:
      number(
        row['Qtd.solic.item']
      ),

    valor_aberto:
      number(
        row[
          'Valor Fat+Valor IPI+Valor Frete'
        ]
      ),

    vlr_unit_liq:
      number(
        row['Vlr.unit.líq']
      ),

    status_faturamento:
      text(
        row['Descr.Pos.item']
      ),

    cliente:
      code(row['Cliente']),

    razao_social:
      text(
        row['Razão social']
      ),

    representante:
      text(
        row['Abreviação']
      ),

    cidade:
      text(row['Cidade']),

    uf:
      text(row['UF']),

    sig_emp:
      text(
        row['Sig.emp']
      ),

    frete:
      number(row['Frete']),

    preco_venda:
      number(
        row['Preço ven']
      ),

    diferenca:
      number(
        row['Diferença']
      ),

    comissao_prod:
      number(
        row['Comis.prod']
      ),

    comissao_metros:
      number(
        row[
          'Comissão/Metros'
        ]
      ),
  };
}

function normalizeRows(
  reportType,
  rows
) {
  switch (
    reportType
  ) {
    case 'ESTOQUE':
      return rows
        .map((row) =>
          normalizeEstoque(
            row,
            'STK'
          )
        )
        .filter(
          (row) =>
            row.produto
        );

    case 'COMPRAS':
      return rows
        .map(
          normalizeCompra
        )
        .filter(
          (row) =>
            row.produto
        );

    case 'CONSUMO':
      return rows
        .map(
          normalizeConsumo
        )
        .filter(
          (row) =>
            row.produto
        );

    case 'OP':
      return rows
        .map((row) =>
          normalizeOP(
            row,
            'STK'
          )
        )
        .filter(
          (row) =>
            row.produto
        );

    case 'VENDAS':
      return rows
        .map((row) =>
          normalizeVenda(
            row,
            'STK'
          )
        )
        .filter(
          (row) =>
            row.produto
        );

    case 'PEDIDOS_EM_ABERTO':
      return rows
        /*
         * Mantém a mesma regra já validada:
         * somente itens ainda não faturados.
         */
        .filter(
          (row) =>
            normalizeText(
              row[
                'Descr.Pos.item'
              ]
            ) ===
            'NADA FATURADO'
        )
        .filter(
          (row) =>
            number(
              row['Nro.nota']
            ) === 0
        )
        .map(
          normalizePedido
        )
        .filter(
          (row) =>
            row.produto
        );

    case 'ESTOQUEBR':
      return rows
        .map((row) =>
          normalizeEstoque(
            row,
            'BEIRA_RIO'
          )
        )
        .filter(
          (row) =>
            row.produto
        );

    case 'OPBR':
      return rows
        .map((row) =>
          normalizeOP(
            row,
            'BEIRA_RIO'
          )
        )
        .filter(
          (row) =>
            row.produto
        );

    case 'VENDASBR':
      return rows
        .map((row) =>
          normalizeVenda(
            row,
            'BEIRA_RIO'
          )
        )
        .filter(
          (row) =>
            row.produto
        );

    default:
      throw new Error(
        `Relatório desconhecido: ${reportType}`
      );
  }
}

function sum(
  rows,
  field
) {
  return rows.reduce(
    (total, row) =>
      total +
      number(row[field]),
    0
  );
}

function uniqueProducts(
  rows
) {
  return new Set(
    rows
      .map(
        (row) =>
          code(row.produto)
      )
      .filter(Boolean)
  ).size;
}

function ensureCleanTemp() {
  fs.rmSync(
    tempRoot,
    {
      recursive: true,
      force: true,
    }
  );

  fs.mkdirSync(
    tempRoot,
    {
      recursive: true,
    }
  );
}

function writeJson(
  relativePath,
  value
) {
  const destination =
    path.join(
      tempRoot,
      relativePath
    );

  fs.mkdirSync(
    path.dirname(
      destination
    ),
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    destination,
    JSON.stringify(
      value,
      null,
      2
    ),
    'utf8'
  );
}

function backupCurrent() {
  if (
    !fs.existsSync(
      outputRoot
    )
  ) {
    return null;
  }

  fs.mkdirSync(
    backupRoot,
    {
      recursive: true,
    }
  );

  const stamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        '-'
      );

  const backup =
    path.join(
      backupRoot,
      stamp
    );

  fs.cpSync(
    outputRoot,
    backup,
    {
      recursive: true,
    }
  );

  return backup;
}

function publishTemp() {
  const backup =
    backupCurrent();

  /*
   * WINDOWS / VITE:
   * Evitamos renomear a pasta inteira porque o Windows pode
   * manter handles abertos enquanto o Vite/VS Code observa
   * public/data/importacao-comercial.
   *
   * Em vez disso:
   * 1. garantimos a pasta final;
   * 2. copiamos os arquivos validados do temp para o destino;
   * 3. removemos o temp depois.
   *
   * A validação dos 9 relatórios já ocorreu antes daqui.
   */
  fs.mkdirSync(
    outputRoot,
    {
      recursive: true,
    }
  );

  fs.cpSync(
    tempRoot,
    outputRoot,
    {
      recursive: true,
      force: true,
      errorOnExist: false,
    }
  );

  fs.rmSync(
    tempRoot,
    {
      recursive: true,
      force: true,
    }
  );

  return backup;
}

function fail(message) {
  console.error('');
  console.error(
    '❌ IMPORTAÇÃO CANCELADA'
  );
  console.error(message);
  console.error('');
  console.error(
    'A última base válida NÃO foi alterada.'
  );
  console.error('');

  fs.rmSync(
    tempRoot,
    {
      recursive: true,
      force: true,
    }
  );

  process.exit(1);
}

function readJsonSafe(
  file,
  fallback = null
) {
  try {
    return JSON.parse(
      fs.readFileSync(
        file,
        'utf8'
      )
    );
  } catch {
    return fallback;
  }
}

function writeJsonDirect(
  file,
  value
) {
  fs.mkdirSync(
    path.dirname(file),
    {
      recursive: true,
    }
  );

  const temporary =
    `${file}.tmp`;

  fs.writeFileSync(
    temporary,
    JSON.stringify(
      value,
      null,
      2
    ),
    'utf8'
  );

  fs.renameSync(
    temporary,
    file
  );
}

function sourceStatusByFile(
  manifest
) {
  return new Map(
    (
      manifest
        ?.relatorios ||
      []
    ).map(
      (item) => [
        normalizeText(
          item?.arquivo
        ),
        item,
      ]
    )
  );
}

function findInputFiles(
  files,
  reportType
) {
  return files.filter(
    (fileName) =>
      reportTypeFromName(
        fileName
      ) === reportType
  );
}

function compactReason(
  value
) {
  return String(
    value ||
    'falha não identificada'
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

function buildItemSummary(
  reportType,
  fileName,
  sheetName,
  headerIndex,
  rawRows,
  normalized
) {
  const itemSummary = {
    arquivo:
      fileName,

    aba:
      sheetName,

    linhaCabecalho:
      headerIndex + 1,

    linhasOriginais:
      rawRows.length,

    linhasValidas:
      normalized.length,

    produtosDistintos:
      uniqueProducts(
        normalized
      ),
  };

  if (
    reportType ===
    'ESTOQUE' ||
    reportType ===
    'ESTOQUEBR'
  ) {
    itemSummary.quantidade =
      sum(
        normalized,
        'qtd_fisica'
      );
  }

  if (
    reportType ===
    'COMPRAS'
  ) {
    itemSummary.quantidade =
      sum(
        normalized,
        'qtd_aberto'
      );
  }

  if (
    reportType ===
    'CONSUMO'
  ) {
    itemSummary.quantidade =
      sum(
        normalized,
        'qtd_movimentada'
      );
  }

  if (
    reportType ===
    'OP' ||
    reportType ===
    'OPBR'
  ) {
    itemSummary.quantidade =
      sum(
        normalized,
        'qtd_produzir'
      );
  }

  if (
    reportType ===
    'VENDAS' ||
    reportType ===
    'VENDASBR'
  ) {
    itemSummary.quantidade =
      sum(
        normalized,
        'qtd_faturada'
      );
  }

  if (
    reportType ===
    'PEDIDOS_EM_ABERTO'
  ) {
    itemSummary.quantidade =
      sum(
        normalized,
        'qtd_aberto'
      );

    itemSummary.valor =
      sum(
        normalized,
        'valor_aberto'
      );

    itemSummary.pedidosDistintos =
      new Set(
        normalized
          .map(
            (row) =>
              row.pedido
          )
          .filter(Boolean)
      ).size;

    itemSummary.clientesDistintos =
      new Set(
        normalized
          .map(
            (row) =>
              row.cliente
          )
          .filter(Boolean)
      ).size;
  }

  return itemSummary;
}

function publishPartial() {
  fs.mkdirSync(
    outputRoot,
    {
      recursive: true,
    }
  );

  fs.cpSync(
    tempRoot,
    outputRoot,
    {
      recursive: true,
      force: true,
      errorOnExist: false,
    }
  );

  fs.rmSync(
    tempRoot,
    {
      recursive: true,
      force: true,
    }
  );
}

/* ============================================================
   INÍCIO — ATUALIZAÇÃO PARCIAL PROTEGIDA
   ============================================================ */

console.log('');
console.log(
  '============================================================'
);
console.log(
  ' ANÁLISE COMERCIAL — ATUALIZAÇÃO PARCIAL PROTEGIDA'
);
console.log(
  '============================================================'
);
console.log('');
console.log(
  `Pasta de entrada: ${inputDir}`
);
console.log(
  `Destino: ${outputRoot}`
);
console.log('');

fs.mkdirSync(
  inputDir,
  {
    recursive: true,
  }
);

const files =
  fs.readdirSync(
    inputDir,
    {
      withFileTypes: true,
    }
  )
    .filter(
      (entry) =>
        entry.isFile() &&
        /\.xlsx$/i.test(
          entry.name
        ) &&
        !entry.name.startsWith(
          '~$'
        )
    )
    .map(
      (entry) =>
        entry.name
    );

const gmailManifest =
  readJsonSafe(
    gmailStatusPath,
    null
  );

const manifestByFile =
  sourceStatusByFile(
    gmailManifest
  );

const previousStatus =
  readJsonSafe(
    updateStatusPath,
    {}
  );

const previousSummary =
  readJsonSafe(
    path.join(
      outputRoot,
      'resumo-importacao.json'
    ),
    {}
  );

ensureCleanTemp();

const now =
  new Date()
    .toISOString();

const summary = {
  importadoEm:
    now,

  pastaEntrada:
    inputDir,

  modo:
    'ATUALIZACAO_PARCIAL_PROTEGIDA',

  status:
    'PROCESSANDO',

  relatorios: {},

  totais: {
    stk: {},
    beiraRio: {},
    comum: {},
  },

  erros: [],
};

const reportStatuses = [];
const successful = [];
const failed = [];

for (
  const [
    reportType,
    config,
  ]
  of Object.entries(
    REPORTS
  )
) {
  const canonicalName =
    REPORT_FILES[
      reportType
    ];

  const sourceItem =
    manifestByFile.get(
      normalizeText(
        canonicalName
      )
    ) ||
    null;

  const sourceState =
    normalizeText(
      sourceItem
        ?.status ||
      ''
    );

  let failureReason =
    '';

  if (
    gmailManifest &&
    !sourceItem
  ) {
    failureReason =
      'não localizado no manifesto do Gmail';
  } else if (
    sourceItem &&
    ![
      'OK',
      'ATRASADO',
    ].includes(
      sourceState
    )
  ) {
    failureReason =
      sourceItem.mensagem ||
      sourceItem.status ||
      'anexo rejeitado no Gmail';
  }

  const matches =
    findInputFiles(
      files,
      reportType
    );

  if (
    !failureReason &&
    matches.length === 0
  ) {
    failureReason =
      'arquivo não foi disponibilizado para processamento';
  }

  if (
    !failureReason &&
    matches.length > 1
  ) {
    failureReason =
      `foram encontrados ${matches.length} arquivos para o mesmo relatório`;
  }

  if (failureReason) {
    const reason =
      compactReason(
        failureReason
      );

    const previousExists =
      fs.existsSync(
        path.join(
          outputRoot,
          config.destination
        )
      );

    const label =
      previousExists
        ? `MANTIDO — ${reason}`
        : `SEM BASE — ${reason}`;

    failed.push({
      reportType,
      arquivo:
        canonicalName,
      reason,
    });

    summary.erros.push({
      relatorio:
        reportType,
      arquivo:
        canonicalName,
      mensagem:
        reason,
      baseAnteriorMantida:
        previousExists,
    });

    if (
      previousSummary
        ?.relatorios
        ?.[reportType]
    ) {
      summary.relatorios[
        reportType
      ] = {
        ...previousSummary
          .relatorios[
            reportType
          ],
        statusAtualizacao:
          'MANTIDO',
        motivo:
          reason,
      };
    }

    reportStatuses.push({
      arquivo:
        canonicalName,
      status:
        label,
      recebidoEm:
        sourceItem
          ?.recebidoEm ||
        null,
      mensagem:
        reason,
      baseAnteriorMantida:
        previousExists,
    });

    console.warn(
      `⚠ ${reportType.padEnd(20)} ${label}`
    );

    continue;
  }

  const fileName =
    matches[0];

  try {
    const filePath =
      path.join(
        inputDir,
        fileName
      );

    const {
      sheetName,
      matrix,
    } =
      readWorkbook(
        filePath
      );

    const headerIndex =
      findHeaderRow(
        matrix,
        config.required
      );

    if (
      headerIndex < 0
    ) {
      throw new Error(
        'cabeçalho obrigatório não encontrado. ' +
        `Esperado: ${config.required.join(', ')}`
      );
    }

    const rawRows =
      buildRows(
        matrix,
        headerIndex
      );

    const normalized =
      normalizeRows(
        reportType,
        rawRows
      );

    if (
      normalized.length === 0
    ) {
      throw new Error(
        'nenhum registro válido após tratamento'
      );
    }

    writeJson(
      config.destination,
      normalized
    );

    const itemSummary =
      buildItemSummary(
        reportType,
        canonicalName,
        sheetName,
        headerIndex,
        rawRows,
        normalized
      );

    summary.relatorios[
      reportType
    ] =
      itemSummary;

    const publishedState =
      sourceState ===
      'ATRASADO'
        ? 'ATRASADO'
        : 'OK';

    successful.push({
      reportType,
      arquivo:
        canonicalName,
      linhas:
        normalized.length,
      status:
        publishedState,
    });

    reportStatuses.push({
      arquivo:
        canonicalName,
      status:
        publishedState,
      recebidoEm:
        sourceItem
          ?.recebidoEm ||
        null,
      linhasValidas:
        normalized.length,
      mensagem:
        publishedState ===
        'ATRASADO'
          ? 'Atualizado com o anexo mais recente disponível, porém atrasado.'
          : 'Atualizado com sucesso.',
    });

    console.log(
      `✓ ${reportType.padEnd(20)} ` +
      `${String(normalized.length).padStart(6)} linhas | ` +
      `${String(itemSummary.produtosDistintos).padStart(5)} produtos`
    );
  } catch (error) {
    const reason =
      compactReason(
        error?.message ||
        error
      );

    const previousExists =
      fs.existsSync(
        path.join(
          outputRoot,
          config.destination
        )
      );

    const label =
      previousExists
        ? `MANTIDO — ${reason}`
        : `SEM BASE — ${reason}`;

    failed.push({
      reportType,
      arquivo:
        canonicalName,
      reason,
    });

    summary.erros.push({
      relatorio:
        reportType,
      arquivo:
        canonicalName,
      mensagem:
        reason,
      baseAnteriorMantida:
        previousExists,
    });

    if (
      previousSummary
        ?.relatorios
        ?.[reportType]
    ) {
      summary.relatorios[
        reportType
      ] = {
        ...previousSummary
          .relatorios[
            reportType
          ],
        statusAtualizacao:
          'MANTIDO',
        motivo:
          reason,
      };
    }

    reportStatuses.push({
      arquivo:
        canonicalName,
      status:
        label,
      recebidoEm:
        sourceItem
          ?.recebidoEm ||
        null,
      mensagem:
        reason,
      baseAnteriorMantida:
        previousExists,
    });

    console.warn(
      `⚠ ${reportType.padEnd(20)} ${label}`
    );
  }
}

const staleCount =
  successful.filter(
    (item) =>
      item.status ===
      'ATRASADO'
  ).length;

summary.status =
  failed.length
    ? successful.length
      ? 'ATENCAO'
      : 'ERRO'
    : staleCount
      ? 'ATENCAO'
      : 'OK';

writeJson(
  'resumo-importacao.json',
  summary
);

publishPartial();

const failedNames =
  failed
    .map(
      (item) =>
        item.arquivo
    )
    .join(', ');

let message =
  `${successful.length} de ${Object.keys(REPORTS).length} relatórios atualizados com sucesso.`;

if (failed.length) {
  message +=
    ` ${failed.length} mantido(s) na base anterior: ${failedNames}.`;
} else if (staleCount) {
  message +=
    ` ${staleCount} relatório(s) está(ão) atrasado(s).`;
}

const finalStatus = {
  atualizadoEm:
    now,

  ultimaAtualizacaoValida:
    successful.length
      ? now
      : previousStatus
          .ultimaAtualizacaoValida ||
        null,

  status:
    summary.status,

  mensagem:
    message,

  modo:
    'PARCIAL_SEGURO',

  totalEsperado:
    Object.keys(
      REPORTS
    ).length,

  totalRecebido:
    successful.length,

  totalAtualizado:
    successful.length,

  totalMantido:
    failed.length,

  relatorios:
    reportStatuses,
};

writeJsonDirect(
  updateStatusPath,
  finalStatus
);

const previousVersion =
  readJsonSafe(
    versionPath,
    {}
  );

writeJsonDirect(
  versionPath,
  {
    ...previousVersion,
    updatedAt:
      now,
    commercialStatus:
      summary.status,
    reportsUpdated:
      successful.length,
    reportsMaintained:
      failed.length,
  }
);

console.log('');
console.log(
  '============================================================'
);
console.log(
  ` RESULTADO: ${summary.status}`
);
console.log(
  '============================================================'
);
console.log(message);
console.log('');
