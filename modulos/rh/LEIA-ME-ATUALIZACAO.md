# Smart Group Analytics — RH 2.6.0 (ajustes controlados)

Este pacote foi preparado a partir dos arquivos do módulo RH enviados em 06/11/2026 e do Apps Script 2.5.1 enviado em seguida.

## O que foi alterado

1. **Escolha do escopo de sincronização:** ao clicar no ícone azul de atualizar, um administrador/RH escolhe **somente o colaborador selecionado** ou **todos os colaboradores**. O usuário sem permissão administrativa continua apenas recarregando os dados, sem executar Apps Script.
2. **Atualização individual de fato:** o servidor usa o ID do documento do Firestore, procura o `arquivoDriveId` já vinculado e verifica a origem em uma das pastas permitidas do RH. Não aceita um ID arbitrário de arquivo enviado pelo navegador, nem percorre as planilhas de outras matrículas. Bloqueia atualizações se a matrícula ou o nome da planilha não corresponderem ao cadastro selecionado ou se houver alerta de integridade.
3. **Extração de fotografia:** no Apps Script e no importador do painel, procura a imagem ancorada na região do retrato da **aba Perfil** no arquivo XLSX, usando as relações internas da planilha; **não** escolhe mais `xl/media/image1` automaticamente. Se a foto não for identificada com segurança, mantém a anterior (quando houver) e registra aviso.
4. **Matrizes:** preserva os dois tipos da versão 2.5.1. A opção Comportamental fica habilitada quando o documento no Firestore inclui `matrizComportamental.habilidades` preenchido. Um arquivo com as duas abas precisa ser processado para que esse campo chegue à base.
5. **Proteção de cadastros:** `PERMITIR_REMOCAO_AUTOMATICA: false` evita remover outros cadastros simplesmente porque um arquivo não foi encontrado no Drive. `REPROCESSAR_VERSAO_AUTOMATICAMENTE: false` evita que a troca para 2.6.0 reimporte todos os funcionários pelo gatilho de 15 minutos sem você solicitar.

## Instalação na ordem correta

1. **Guarde cópias** do Apps Script atual e dos 6 arquivos de `/rh` publicados no GitHub.
2. No projeto **automacao rh drive**, substitua o código anterior pelo conteúdo completo de `Automacao-RH-2.6.0.gs`. Não mantenha duas versões das mesmas funções no projeto. Clique em **Salvar**.
3. No Apps Script, use **Implantar > Gerenciar implantações > Editar (lápis) > Nova versão > Implantar**. Isso mantém a URL `/exec` que já existe no arquivo `rh.js`. **Não rode `instalarAutomacaoRH` novamente** se o gatilho atual já funciona.
4. No repositório do dashboard, substitua **apenas** estes arquivos da pasta `/rh`: `index.html`, `rh.js`, `rh.css`, `rh-leitura.js`, `rh-faixas.css` e `rh-privacidade.css`. Não mexa em outros módulos.
5. Aguarde a publicação do GitHub Pages e abra o RH com **Ctrl+F5**. Evite clicar em Atualizar durante a troca de versões; o painel antigo não envia o parâmetro `modo`, exigido pelo script novo.

## Primeiro teste recomendado (sem alterar outros funcionários)

1. No Apps Script, execute a função **`testarLeituraRH`** para um XLSX de teste, preenchendo temporariamente o ID do arquivo na própria função. Ela lê o arquivo e mostra no registro se encontrou Técnica e Comportamental, sem gravar no Firestore. Pode criar e excluir **cópias temporárias** no Drive.
2. No painel, escolha o funcionário **matrícula 158 (Abner)** ou outro que tenha as duas abas; clique na seta circular azul e depois em **Atualizar somente este funcionário**.
3. Confirme no Firestore, em `rh_colaboradores/<matrícula>`, se `versaoAutomacao` é `2.6.0`, se `matrizComportamental.habilidades` foi gravado e se a foto correta aparece. Em seguida verifique a opção **Comportamental** no dashboard.
4. Para atualizar toda a base, use explicitamente **Atualizar todos os funcionários**. Essa operação utiliza lotes e continuações como na versão anterior.

## Observações importantes

- **Testes locais realizados:** sintaxe do Apps Script e do JS; escolha da foto em um XLSX sintético no qual `image1.png` era uma legenda e `image9.jpg` era a foto; preservação de foto quando não há imagem identificável; escolha de abas; roteamento dos modos individual/completo; existência de IDs dos botões no HTML.
- **Não testado em produção:** autenticação real Firebase, Apps Script implantado, leitura das planilhas atuais do Drive, integração final com Firestore/GitHub Pages. A atualização real só pode ser verificada no seu ambiente.
- Se a foto antiga já foi gravada incorretamente no Firestore **e** o novo código não conseguir identificar uma foto válida na planilha original, ele preservará o valor anterior. Nesse caso é necessário corrigir/posicionar a foto no arquivo XLSX ou tratar o campo específico com backup — não faremos exclusões automáticas de fotos.
- Algumas imagens não usam vínculos padrão OOXML (por exemplo imagens dentro de célula ou formatos não suportados); nesses casos a automação não escolhe outra imagem por aproximação arriscada.
- Mantenha a versão anterior para reversão caso o ambiente de produção apresente uma estrutura de Excel diferente da esperada.
