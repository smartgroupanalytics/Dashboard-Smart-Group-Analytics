MÓDULO PRODUÇÃO - MIGRADO DO BASE44
===================================

Objetivo
--------
Este módulo foi separado do Base44 e integrado ao Smart Group Analytics.
A aplicação abre por:
  modulos/producao/index.html

Arquitetura
-----------
- Autenticação: Firebase Authentication do Smart Group Analytics.
- Permissões: coleção usuarios, campo modulos.producao.
- Dados: Firestore em /producao/{entidade}/items/{documento}.
- Rotas internas: HashRouter, compatível com hospedagem estática/GitHub Pages.
- Importações Excel: executadas no navegador e gravadas no Firestore.
- Código-fonte editável: modulos/producao/_src/
- Código executável: modulos/producao/runtime/

Base44
------
A aplicação não usa SDK, autenticação, banco ou funções do Base44.
As rotinas de importação exportadas foram adaptadas para execução local no módulo.
As imagens que apontavam para mídia do projeto original foram substituídas por
um ativo local em assets/producao-bg.svg.

Observação importante
---------------------
O ZIP exportado não continha a função original importDefeitosExcel nem o
componente desempenho/ImportSetupDialog. Ambos foram reconstruídos para que
as telas correspondentes não fiquem quebradas. Essas duas rotinas devem ser
validadas com uma planilha real antes de uso definitivo.

Dependências web
----------------
Como o Analytics atual já é hospedado de forma estática, as bibliotecas do
React são carregadas por ESM CDN e o Tailwind pelo CDN oficial. Isso elimina a
necessidade de servidor Node/Base44 no GitHub Pages. O Firebase continua sendo
o mesmo projeto do Analytics.

Publicação
----------
Publique a pasta completa do Dashboard no GitHub como nos demais módulos.
Antes de gravar dados, publique também as regras descritas em:
  ADICIONAR-NAS-REGRAS-FIRESTORE-PRODUCAO.txt
