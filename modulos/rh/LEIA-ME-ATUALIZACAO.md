# RH Smart Group Analytics — 2.6.6: remover card de Avaliação de Desempenho

## Alteração visual solicitada

Foi removida **somente** a seção final intitulada **AVALIAÇÃO DE DESEMPENHO** (card Resultado geral) da aba Perfil. A coluna de registros de feedbacks, histórico, salários, matriz de habilidades, porcentagens, fotos e atualização de funcionários continua igual.

O campo `avaliacao` armazenado no Firebase e a leitura das planilhas continuam preservados; esta mudança **não apaga informações** nem muda cálculos no backend.

## Instalação sobre 2.6.5

Substituir somente dois arquivos em `rh/` do GitHub:

- `index.html`
- `rh.js`

Não é necessário atualizar o Apps Script, regras do Firebase, CSS ou planilhas. O HTML utiliza `rh.js?v=17` para evitar cache antigo. Após a publicação do GitHub Pages, usar **Ctrl+F5**.

## Pacote cumulativo

O pacote completo também inclui `Automacao-RH-2.6.5.gs` **sem qualquer alteração**, além de CSS e leitor anteriores, para quem ainda não instalou as revisões anteriores. O nome 2.6.6 refere-se apenas à interface. Não reinstale o Apps Script se ele já estiver na versão 2.6.5.

## Verificações locais

- HTML não contém a seção removida.
- JavaScript não procura mais o elemento excluído.
- Arquivos JavaScript e Apps Script têm sintaxe válida.
- Nenhuma sincronização em produção foi executada.
