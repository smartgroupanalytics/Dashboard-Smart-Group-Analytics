# Smart Group Analytics — correção RH 2.6.2

## Motivo da correção
No `rh.js` 2.6.1, o item **Comportamental** era desabilitado se `matrizComportamental.habilidades` não estivesse presente no documento Firebase. Além disso, após `getDocs()` a lista de colaboradores era substituída, mas o colaborador selecionado continuava apontando para o objeto anterior. Por isso, mesmo após sincronizar um funcionário, sua tela podia mostrar os dados antigos até uma troca de seleção ou recarga.

## Mudanças nesta revisão (somente frontend)

- Seletor **Técnica / Comportamental** sempre disponível para consulta.
- Caso os dados comportamentais não estejam no Firebase, mostra uma explicação orientando a sincronização **individual**; nunca inventa percentuais e contagens com valor zero.
- Após consultar o Firebase, o colaborador selecionado é associado novamente ao **novo objeto**, corrigindo a persistência da matriz antiga em memória.
- Ao sincronizar e recarregar **o mesmo colaborador**, a matriz selecionada permanece; ao mudar de colaborador, volta à Técnica.
- Preservados: imagens, redução de fotos, matrizes técnicas, cálculos, autenticação, permissões, atualização individual/completa e outros módulos.

## Instalação

Se o RH 2.6.1 já está instalado, substitua **somente** estes arquivos em `/rh` no GitHub Pages:

1. `rh.js`
2. `index.html`
3. `rh.css`

Os arquivos `rh-leitura.js`, `rh-faixas.css`, `rh-privacidade.css` e o **Apps Script 2.6.1** não precisam ser alterados. O ZIP inclui os outros arquivos apenas para fornecer uma cópia completa do módulo.

Faça backup dos arquivos atuais antes da troca. Após o deploy, recarregue o dashboard com `Ctrl + F5`.

## Teste recomendado

1. No dashboard, selecione **Fabio Silveira** (selecionado no print). A lista **Tipo de matriz** deverá permitir selecionar **Comportamental**.
2. Caso apareça a mensagem de dados não disponíveis, confirme que o XLSX atualizado do Fabio, com **as duas abas**, está na pasta correta do Drive. Se estiver, clique no ícone azul e escolha **Atualizar somente este funcionário**.
3. A atualização individual deve retornar se encontrou a matriz comportamental. Verifique `rh_colaboradores/<id_do_Fabio>` no Firestore e localize `matrizComportamental.habilidades`.
4. Repita para **Abner**, matrícula 158, para verificar as duas matrizes. A foto não é alterada por esta revisão.

**Validação:** verificações locais de sintaxe e fluxo de estado. Sem acesso ao Firebase/GitHub em produção, não se pode confirmar remotamente que a matriz do Fabio já foi gravada.
