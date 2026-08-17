const RELATORIOS_COMERCIAIS = Object.freeze([
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

const CONFIGURACAO_PADRAO = Object.freeze({
  GITHUB_OWNER:
    'smartgroupanalytics',
  GITHUB_REPO:
    'Dashboard-Smart-Group-Analytics',
  GMAIL_DIAS_PESQUISA:
    '30',
  MAX_IDADE_HORAS:
    '48',
  MAX_ANEXO_BYTES:
    String(
      15 *
      1024 *
      1024
    ),
});

const CHAVES = Object.freeze({
  PASTA_DRIVE:
    'DRIVE_FOLDER_ID',
  ARQUIVOS_DRIVE:
    'DRIVE_FILE_IDS',
  MANIFESTO:
    'MANIFESTO_RELATORIOS',
  ASSINATURA:
    'ASSINATURA_RELATORIOS',
  TOKEN_DADOS:
    'DATA_SECRET',
  TOKEN_GITHUB:
    'GITHUB_TOKEN',
});

function propriedades_() {
  return PropertiesService
    .getScriptProperties();
}

function normalizar_(valor) {
  return String(
    valor == null
      ? ''
      : valor
  )
    .trim()
    .toUpperCase();
}

function numeroConfig_(
  nome,
  padrao
) {
  const valor =
    Number(
      propriedades_()
        .getProperty(nome) ||
      CONFIGURACAO_PADRAO[nome] ||
      padrao
    );

  return Number.isFinite(valor)
    ? valor
    : padrao;
}

function jsonSeguro_(
  valor,
  fallback
) {
  try {
    return JSON.parse(
      valor ||
      ''
    );
  } catch (erro) {
    return fallback;
  }
}

function respostaJson_(
  valor
) {
  return ContentService
    .createTextOutput(
      JSON.stringify(
        valor
      )
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}

function hashBytes_(bytes) {
  const digest =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      bytes
    );

  return digest
    .map(
      function(byte) {
        return (
          byte +
          256
        )
          .toString(16)
          .slice(-2);
      }
    )
    .join('');
}

function hashTexto_(texto) {
  return hashBytes_(
    Utilities.newBlob(
      String(texto)
    ).getBytes()
  );
}

function compararSegredo_(
  recebido,
  esperado
) {
  if (
    !recebido ||
    !esperado
  ) {
    return false;
  }

  return hashTexto_(recebido) ===
    hashTexto_(esperado);
}

function coletarPartes_(
  parte,
  saida
) {
  if (!parte) {
    return;
  }

  saida.push(parte);

  (parte.parts || [])
    .forEach(
      function(filha) {
        coletarPartes_(
          filha,
          saida
        );
      }
    );
}

function gmailApiJson_(
  caminho
) {
  const resposta =
    UrlFetchApp.fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me' +
        caminho,
      {
        method:
          'get',
        headers: {
          Authorization:
            'Bearer ' +
            ScriptApp.getOAuthToken(),
        },
        muteHttpExceptions:
          true,
      }
    );

  const codigo =
    resposta.getResponseCode();

  if (
    codigo < 200 ||
    codigo >= 300
  ) {
    throw new Error(
      'Gmail API retornou HTTP ' +
        codigo +
        ': ' +
        resposta
          .getContentText()
          .slice(0, 300)
    );
  }

  return JSON.parse(
    resposta.getContentText()
  );
}

function localizarAnexoMaisRecente_(
  nomeArquivo
) {
  const dias =
    numeroConfig_(
      'GMAIL_DIAS_PESQUISA',
      30
    );

  const consulta =
    'newer_than:' +
    dias +
    'd has:attachment filename:"' +
    nomeArquivo +
    '"';

  let pagina =
    null;

  let verificados =
    0;

  let escolhido =
    null;

  do {
    const opcoes = {
      q:
        consulta,
      maxResults:
        50,
    };

    if (pagina) {
      opcoes.pageToken =
        pagina;
    }

    const parametros = [
      'q=' +
        encodeURIComponent(
          opcoes.q
        ),
      'maxResults=' +
        encodeURIComponent(
          opcoes.maxResults
        ),
    ];

    if (opcoes.pageToken) {
      parametros.push(
        'pageToken=' +
          encodeURIComponent(
            opcoes.pageToken
          )
      );
    }

    const resposta =
      gmailApiJson_(
        '/messages?' +
          parametros.join('&')
      );

    const mensagens =
      resposta.messages ||
      [];

    for (
      let indice = 0;
      indice < mensagens.length;
      indice += 1
    ) {
      const detalhe =
        gmailApiJson_(
          '/messages/' +
            encodeURIComponent(
              mensagens[indice].id
            ) +
            '?format=full'
        );

      verificados += 1;

      const partes = [];

      coletarPartes_(
        detalhe.payload,
        partes
      );

      const anexos =
        partes.filter(
          function(parte) {
            return normalizar_(
              parte.filename
            ) ===
              normalizar_(
                nomeArquivo
              );
          }
        );

      if (!anexos.length) {
        continue;
      }

      anexos.sort(
        function(a, b) {
          return Number(
            b.body
              ?.size ||
            0
          ) -
            Number(
              a.body
                ?.size ||
              0
            );
        }
      );

      const candidato = {
        mensagemId:
          detalhe.id,
        dataInterna:
          Number(
            detalhe.internalDate ||
            0
          ),
        parte:
          anexos[0],
      };

      if (
        !escolhido ||
        candidato.dataInterna >
          escolhido.dataInterna
      ) {
        escolhido =
          candidato;
      }

      if (
        escolhido &&
        indice === 0
      ) {
        break;
      }
    }

    pagina =
      resposta.nextPageToken ||
      null;
  } while (
    pagina &&
    verificados < 100 &&
    !escolhido
  );

  return escolhido;
}

function baixarBytesAnexo_(
  candidato
) {
  const corpo =
    candidato.parte.body ||
    {};

  let dados =
    corpo.data ||
    '';

  if (
    !dados &&
    corpo.attachmentId
  ) {
    const anexo =
      gmailApiJson_(
        '/messages/' +
          encodeURIComponent(
            candidato.mensagemId
          ) +
          '/attachments/' +
          encodeURIComponent(
            corpo.attachmentId
          )
      );

    dados =
      anexo.data ||
      '';
  }

  if (!dados) {
    throw new Error(
      'anexo sem conteúdo disponível'
    );
  }

  const textoBase64 =
    String(dados)
      .trim()
      .replace(/\s/g, '')
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .replace(/=+$/, '');

  if (
    !/^[A-Za-z0-9+/]+$/.test(
      textoBase64
    )
  ) {
    throw new Error(
      'O Gmail retornou o anexo em um formato Base64 inválido.'
    );
  }

  const preenchimento =
    '='.repeat(
      (
        4 -
        textoBase64.length % 4
      ) % 4
    );

  return Utilities.base64Decode(
    textoBase64 +
      preenchimento
  );
}

function excelValido_(bytes) {
  return (
    bytes &&
    bytes.length > 100 &&
    (
      bytes[0] &
      255
    ) === 0x50 &&
    (
      bytes[1] &
      255
    ) === 0x4b
  );
}

function pastaDrive_() {
  const props =
    propriedades_();

  const existente =
    props.getProperty(
      CHAVES.PASTA_DRIVE
    );

  if (existente) {
    try {
      return DriveApp
        .getFolderById(
          existente
        );
    } catch (erro) {
      console.warn(
        'A pasta anterior do Drive não pôde ser aberta; uma nova será criada.'
      );
    }
  }

  const pasta =
    DriveApp.createFolder(
      'Smart Group Analytics - Relatórios Comerciais Privados'
    );

  props.setProperty(
    CHAVES.PASTA_DRIVE,
    pasta.getId()
  );

  return pasta;
}

function salvarArquivoDrive_(
  nomeArquivo,
  bytes
) {
  const props =
    propriedades_();

  const ids =
    jsonSeguro_(
      props.getProperty(
        CHAVES.ARQUIVOS_DRIVE
      ),
      {}
    );

  const blob =
    Utilities.newBlob(
      bytes,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      nomeArquivo
    );

  const novo =
    pastaDrive_()
      .createFile(
        blob
      );

  const antigoId =
    ids[nomeArquivo];

  ids[nomeArquivo] =
    novo.getId();

  props.setProperty(
    CHAVES.ARQUIVOS_DRIVE,
    JSON.stringify(ids)
  );

  if (
    antigoId &&
    antigoId !==
      novo.getId()
  ) {
    try {
      DriveApp
        .getFileById(
          antigoId
        )
        .setTrashed(true);
    } catch (erro) {
      console.warn(
        'Não foi possível mover a versão anterior de ' +
        nomeArquivo +
        ' para a lixeira.'
      );
    }
  }

  return novo.getId();
}

function processarRelatorio_(
  nomeArquivo,
  manifestoAnterior
) {
  try {
    const candidato =
      localizarAnexoMaisRecente_(
        nomeArquivo
      );

    if (!candidato) {
      return {
        arquivo:
          nomeArquivo,
        status:
          'FALTANDO',
        recebidoEm:
          null,
        mensagem:
          'Nenhum anexo com este nome foi localizado no período pesquisado.',
      };
    }

    const bytes =
      baixarBytesAnexo_(
        candidato
      );

    if (
      !excelValido_(
        bytes
      )
    ) {
      return {
        arquivo:
          nomeArquivo,
        status:
          'ERRO',
        recebidoEm:
          new Date(
            candidato.dataInterna
          ).toISOString(),
        mensagem:
          'O anexo mais recente não parece ser um arquivo XLSX válido.',
      };
    }

    const maximo =
      numeroConfig_(
        'MAX_ANEXO_BYTES',
        15 *
          1024 *
          1024
      );

    if (
      bytes.length >
      maximo
    ) {
      return {
        arquivo:
          nomeArquivo,
        status:
          'ERRO',
        recebidoEm:
          new Date(
            candidato.dataInterna
          ).toISOString(),
        mensagem:
          'O anexo excede o limite de segurança configurado.',
      };
    }

    const recebidoEm =
      new Date(
        candidato.dataInterna
      ).toISOString();

    const idadeHoras =
      (
        Date.now() -
        candidato.dataInterna
      ) /
      3600000;

    const hash =
      hashBytes_(bytes);

    const anterior =
      manifestoAnterior
        ?.relatorios
        ?.find(
          function(item) {
            return normalizar_(
              item.arquivo
            ) ===
              normalizar_(
                nomeArquivo
              );
          }
        );

    const ids =
      jsonSeguro_(
        propriedades_()
          .getProperty(
            CHAVES.ARQUIVOS_DRIVE
          ),
        {}
      );

    const precisaSalvar =
      !anterior ||
      anterior.hash !== hash ||
      !ids[nomeArquivo];

    if (precisaSalvar) {
      salvarArquivoDrive_(
        nomeArquivo,
        bytes
      );
    }

    const atrasado =
      idadeHoras >
      numeroConfig_(
        'MAX_IDADE_HORAS',
        48
      );

    return {
      arquivo:
        nomeArquivo,
      status:
        atrasado
          ? 'ATRASADO'
          : 'OK',
      recebidoEm:
        recebidoEm,
      idadeHoras:
        Number(
          idadeHoras.toFixed(1)
        ),
      tamanhoBytes:
        bytes.length,
      hash:
        hash,
      mensagem:
        atrasado
          ? 'Anexo válido, porém mais antigo que o limite configurado.'
          : 'Anexo válido e pronto para atualização.',
    };
  } catch (erro) {
    return {
      arquivo:
        nomeArquivo,
      status:
        'ERRO',
      recebidoEm:
        null,
      mensagem:
        String(
          erro
            ?.message ||
          erro
        ).slice(0, 240),
    };
  }
}

function assinaturaManifesto_(
  manifesto
) {
  return hashTexto_(
    JSON.stringify(
      manifesto.relatorios.map(
        function(item) {
          return {
            arquivo:
              item.arquivo,
            status:
              item.status,
            recebidoEm:
              item.recebidoEm,
            hash:
              item.hash ||
              null,
            mensagem:
              item.mensagem,
          };
        }
      )
    )
  );
}

function coletarManifesto_() {
  const props =
    propriedades_();

  const anterior =
    jsonSeguro_(
      props.getProperty(
        CHAVES.MANIFESTO
      ),
      null
    );

  const relatorios =
    RELATORIOS_COMERCIAIS.map(
      function(nomeArquivo) {
        return processarRelatorio_(
          nomeArquivo,
          anterior
        );
      }
    );

  const manifesto = {
    geradoEm:
      new Date()
        .toISOString(),
    totalEsperado:
      RELATORIOS_COMERCIAIS.length,
    totalDisponivel:
      relatorios.filter(
        function(item) {
          return [
            'OK',
            'ATRASADO',
          ].includes(
            item.status
          );
        }
      ).length,
    relatorios:
      relatorios,
  };

  return manifesto;
}

function dispararGitHub_(
  manifesto
) {
  const props =
    propriedades_();

  const token =
    props.getProperty(
      CHAVES.TOKEN_GITHUB
    );

  if (!token) {
    throw new Error(
      'A propriedade GITHUB_TOKEN não foi configurada no Apps Script.'
    );
  }

  const owner =
    props.getProperty(
      'GITHUB_OWNER'
    ) ||
    CONFIGURACAO_PADRAO.GITHUB_OWNER;

  const repositorio =
    props.getProperty(
      'GITHUB_REPO'
    ) ||
    CONFIGURACAO_PADRAO.GITHUB_REPO;

  const resposta =
    UrlFetchApp.fetch(
      'https://api.github.com/repos/' +
      encodeURIComponent(owner) +
      '/' +
      encodeURIComponent(repositorio) +
      '/dispatches',
      {
        method:
          'post',
        contentType:
          'application/json',
        headers: {
          Accept:
            'application/vnd.github+json',
          Authorization:
            'Bearer ' +
            token,
          'X-GitHub-Api-Version':
            '2026-03-10',
        },
        payload:
          JSON.stringify({
            event_type:
              'relatorios-comerciais-atualizados',
            client_payload: {
              geradoEm:
                manifesto.geradoEm,
              totalDisponivel:
                manifesto.totalDisponivel,
            },
          }),
        muteHttpExceptions:
          true,
      }
    );

  const codigo =
    resposta.getResponseCode();

  if (codigo !== 204) {
    throw new Error(
      'GitHub não aceitou a atualização. HTTP ' +
      codigo +
      ': ' +
      resposta
        .getContentText()
        .slice(0, 300)
    );
  }
}

function executarAtualizacao() {
  const trava =
    LockService
      .getScriptLock();

  if (
    !trava.tryLock(
      5000
    )
  ) {
    console.log(
      'Já existe uma atualização em andamento.'
    );
    return;
  }

  try {
    const props =
      propriedades_();

    const manifesto =
      coletarManifesto_();

    const assinatura =
      assinaturaManifesto_(
        manifesto
      );

    props.setProperty(
      CHAVES.MANIFESTO,
      JSON.stringify(
        manifesto
      )
    );

    const anterior =
      props.getProperty(
        CHAVES.ASSINATURA
      );

    if (
      assinatura ===
      anterior
    ) {
      console.log(
        'Nenhum relatório novo ou mudança de status encontrada.'
      );
      return;
    }

    dispararGitHub_(
      manifesto
    );

    props.setProperty(
      CHAVES.ASSINATURA,
      assinatura
    );

    console.log(
      'Atualização enviada ao GitHub com sucesso.'
    );
  } finally {
    trava.releaseLock();
  }
}

function testarLeituraGmail() {
  const manifesto =
    coletarManifesto_();

  propriedades_()
    .setProperty(
      CHAVES.MANIFESTO,
      JSON.stringify(
        manifesto
      )
    );

  console.log(
    JSON.stringify(
      manifesto,
      null,
      2
    )
  );
}

function instalarGatilho() {
  ScriptApp
    .getProjectTriggers()
    .filter(
      function(gatilho) {
        return gatilho
          .getHandlerFunction() ===
          'executarAtualizacao';
      }
    )
    .forEach(
      function(gatilho) {
        ScriptApp
          .deleteTrigger(
            gatilho
          );
      }
    );

  ScriptApp
    .newTrigger(
      'executarAtualizacao'
    )
    .timeBased()
    .everyMinutes(15)
    .create();

  console.log(
    'Gatilho instalado: verificação automática a cada 15 minutos.'
  );
}

function configurarProjeto() {
  const props =
    propriedades_();

  Object.keys(
    CONFIGURACAO_PADRAO
  ).forEach(
    function(chave) {
      if (
        !props.getProperty(
          chave
        )
      ) {
        props.setProperty(
          chave,
          CONFIGURACAO_PADRAO[chave]
        );
      }
    }
  );

  if (
    !props.getProperty(
      CHAVES.TOKEN_DADOS
    )
  ) {
    props.setProperty(
      CHAVES.TOKEN_DADOS,
      Utilities.getUuid() +
      Utilities.getUuid()
    );
  }

  pastaDrive_();

  console.log(
    'Configuração básica concluída.'
  );
  console.log(
    'Copie DATA_SECRET para o secret APPS_SCRIPT_DATA_TOKEN do GitHub:'
  );
  console.log(
    props.getProperty(
      CHAVES.TOKEN_DADOS
    )
  );
  console.log(
    'Depois, adicione GITHUB_TOKEN nas Propriedades do script.'
  );
}

function doGet() {
  return respostaJson_({
    ok:
      true,
    servico:
      'Smart Group Analytics - dados comerciais privados',
    mensagem:
      'Use uma requisição POST autenticada.',
  });
}

function doPost(e) {
  try {
    const pedido =
      jsonSeguro_(
        e
          ?.postData
          ?.contents,
        {}
      );

    const props =
      propriedades_();

    if (
      !compararSegredo_(
        pedido.token,
        props.getProperty(
          CHAVES.TOKEN_DADOS
        )
      )
    ) {
      return respostaJson_({
        ok:
          false,
        error:
          'Não autorizado.',
      });
    }

    const manifesto =
      jsonSeguro_(
        props.getProperty(
          CHAVES.MANIFESTO
        ),
        null
      );

    if (!manifesto) {
      return respostaJson_({
        ok:
          false,
        error:
          'Ainda não existe um manifesto. Execute testarLeituraGmail primeiro.',
      });
    }

    if (
      pedido.acao ===
      'manifesto'
    ) {
      return respostaJson_({
        ok:
          true,
        manifesto:
          manifesto,
      });
    }

    if (
      pedido.acao ===
      'arquivo'
    ) {
      const nomeArquivo =
        String(
          pedido.arquivo ||
          ''
        ).trim();

      if (
        RELATORIOS_COMERCIAIS.indexOf(
          nomeArquivo
        ) < 0
      ) {
        return respostaJson_({
          ok:
            false,
          error:
            'Arquivo não permitido.',
        });
      }

      const item =
        manifesto.relatorios.find(
          function(relatorio) {
            return relatorio.arquivo ===
              nomeArquivo;
          }
        );

      if (
        !item ||
        ![
          'OK',
          'ATRASADO',
        ].includes(
          item.status
        )
      ) {
        return respostaJson_({
          ok:
            false,
          error:
            'O arquivo atual não foi aprovado para processamento.',
        });
      }

      const ids =
        jsonSeguro_(
          props.getProperty(
            CHAVES.ARQUIVOS_DRIVE
          ),
          {}
        );

      const arquivoId =
        ids[nomeArquivo];

      if (!arquivoId) {
        return respostaJson_({
          ok:
            false,
          error:
            'Arquivo privado ainda não foi salvo no Drive.',
        });
      }

      const blob =
        DriveApp
          .getFileById(
            arquivoId
          )
          .getBlob();

      return respostaJson_({
        ok:
          true,
        arquivo:
          nomeArquivo,
        tamanhoBytes:
          blob.getBytes().length,
        base64:
          Utilities.base64Encode(
            blob.getBytes()
          ),
      });
    }

    return respostaJson_({
      ok:
        false,
      error:
        'Ação inválida.',
    });
  } catch (erro) {
    return respostaJson_({
      ok:
        false,
      error:
        String(
          erro
            ?.message ||
          erro
        ).slice(0, 300),
    });
  }
}
