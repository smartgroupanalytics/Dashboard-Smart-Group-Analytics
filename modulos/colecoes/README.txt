Módulo Desempenho de Coleções

O arquivo index.html preserva o painel original fornecido pelo usuário.
O arquivo importador.js processa a planilha Excel no navegador.
A coluna D da aba ESTOQUE é interpretada como COR mesmo que o cabeçalho esteja vazio.

SINCRONIZAÇÃO COMPARTILHADA
- Ao importar uma nova planilha, a base consolidada é compactada e gravada no Firestore.
- O último carregamento passa a ser usado por todos os usuários que têm acesso ao módulo Coleções.
- Usuários que já estiverem com a página aberta também recebem a nova base automaticamente.
- A versão atual e a versão imediatamente anterior são mantidas para reduzir risco durante a troca da base.
- Se o Firestore estiver indisponível, o painel continua com a base embutida no index.html.

IMPORTANTE
Antes de usar a sincronização pela primeira vez, publique as regras indicadas em:
ADICIONAR-NAS-REGRAS-FIRESTORE-COLECOES.txt
