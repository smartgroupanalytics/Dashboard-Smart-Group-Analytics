import fs from 'node:fs';
import path from 'node:path';

const endpoint =
  process.env.APPS_SCRIPT_DATA_URL;

const token =
  process.env.APPS_SCRIPT_DATA_TOKEN;

const outputDir =
  path.resolve(
    process.argv[2] ||
    './_automacao/entrada-relatorios'
  );

const EXPECTED = new Set([
  'ESTOQUE.xlsx',
  'COMPRAS.xlsx',
  'CONSUMO.xlsx',
  'OP.xlsx',
  'VENDAS.xlsx',
  'PEDIDOS EM ABERTO.xlsx',
  'ESTOQUEBR.xlsx',
  'OPBR.xlsx',
  'VENDASBR.xlsx',
]);

function fail(message) {
  console.error(
    `ERRO: ${message}`
  );
  process.exit(1);
}

if (!endpoint) {
  fail(
    'Secret APPS_SCRIPT_DATA_URL não configurado no GitHub.'
  );
}

if (!token) {
  fail(
    'Secret APPS_SCRIPT_DATA_TOKEN não configurado no GitHub.'
  );
}

async function callAppsScript(
  payload
) {
  const response =
    await fetch(
      endpoint,
      {
        method:
          'POST',
        redirect:
          'follow',
        headers: {
          'Content-Type':
            'text/plain;charset=utf-8',
        },
        body:
          JSON.stringify({
            token,
            ...payload,
          }),
      }
    );

  const responseText =
    await response.text();

  let value;

  try {
    value =
      JSON.parse(
        responseText
      );
  } catch {
    throw new Error(
      `Apps Script retornou uma resposta inválida (HTTP ${response.status}).`
    );
  }

  if (
    !response.ok ||
    value?.ok !== true
  ) {
    throw new Error(
      value?.error ||
      `Apps Script respondeu HTTP ${response.status}.`
    );
  }

  return value;
}

function excelLooksValid(
  buffer
) {
  return (
    buffer.length > 100 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b
  );
}

async function main() {
  const manifestResponse =
    await callAppsScript({
      acao:
        'manifesto',
    });

  const manifest =
    manifestResponse.manifesto;

  if (
    !manifest ||
    !Array.isArray(
      manifest.relatorios
    )
  ) {
    throw new Error(
      'Manifesto do Gmail não foi encontrado ou está inválido.'
    );
  }

  fs.rmSync(
    outputDir,
    {
      recursive: true,
      force: true,
    }
  );

  fs.mkdirSync(
    outputDir,
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    path.join(
      outputDir,
      'status-gmail.json'
    ),
    JSON.stringify(
      manifest,
      null,
      2
    ),
    'utf8'
  );

  let downloaded = 0;

  for (
    const item
    of manifest.relatorios
  ) {
    const fileName =
      String(
        item?.arquivo ||
        ''
      ).trim();

    if (
      !EXPECTED.has(
        fileName
      )
    ) {
      console.warn(
        `Ignorado no manifesto: ${fileName || '(sem nome)'}`
      );
      continue;
    }

    if (
      ![
        'OK',
        'ATRASADO',
      ].includes(
        String(
          item?.status ||
          ''
        ).toUpperCase()
      )
    ) {
      console.warn(
        `Mantido na base anterior: ${fileName} — ${item?.status || 'ERRO'}`
      );
      continue;
    }

    const fileResponse =
      await callAppsScript({
        acao:
          'arquivo',
        arquivo:
          fileName,
      });

    const buffer =
      Buffer.from(
        fileResponse.base64 ||
        '',
        'base64'
      );

    if (
      !excelLooksValid(
        buffer
      )
    ) {
      throw new Error(
        `${fileName}: download não parece ser um XLSX válido.`
      );
    }

    fs.writeFileSync(
      path.join(
        outputDir,
        fileName
      ),
      buffer
    );

    downloaded += 1;

    console.log(
      `Baixado: ${fileName} (${buffer.length} bytes)`
    );
  }

  console.log(
    `${downloaded} relatório(s) disponibilizado(s) para validação.`
  );
}

main().catch(
  (error) => {
    fail(
      error?.message ||
      error
    );
  }
);
