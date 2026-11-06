# Smart Group Analytics — RH 2.6.5 (pacote cumulativo)

## Principal correção pedida

O **Nome completo da aba Perfil** é a fonte oficial, SEM comparar semelhança com os nomes das matrizes. Durante a sincronização:

1. Abre a planilha XLSX do funcionário no Drive, identifica o Perfil e lê o nome oficial.
2. Na **Matriz de Habilidades Técnicas** e na **Matriz de Habilidades Comportamentais**, identifica o campo "Membro do Time". Mesmo se o campo tiver um nome completamente diferente, será padronizado ao Perfil no processamento dos dados.
3. Registra o nome anterior nos logs. Não altera a matrícula, conteúdo das avaliações, fórmulas ou outras células.
4. Antes de modificar o XLSX original no Drive, cria um backup na pasta privada **RH - BACKUPS CORRECOES DE NOMES**, fora das pastas monitoradas pelo RH. Só após verificar o backup regrava o original, mantendo o ID do arquivo.
5. Se a célula não for reconhecida com segurança, tiver fórmula, o arquivo tiver sido alterado por outra pessoa, ou a gravação falhar, não altera o original e informa o erro no resultado. Os dados do Firebase podem ter sido atualizados antes de um eventual erro na gravação do Excel.

**Atenção:** esta correção altera APENAS a escrita do nome na matriz. Se as notas/habilidades dentro da matriz realmente forem de outro funcionário, elas NÃO serão identificadas nem corrigidas automaticamente. Confirme a origem das avaliações com o RH quando o nome anterior for muito diferente.

## Inclui as correções já feitas

- Matrículas (incluindo cadastro histórico sem matrícula, como Agnaldo / 226), com validação da identidade pelo Perfil e do vínculo do arquivo Drive.
- Atualização individual ou completa do RH.
- Duas matrizes: Técnica e Comportamental, seletor e resumos.
- Foto vinculada à aba Perfil, com redução automática quando necessário.
- Preservação de campos existentes no Firestore via PATCH/updateMask e sem exclusão automática de colaboradores sem arquivo.
- Correção de nomes nas matrizes do Excel original do Drive com backup.

## Instalação — A versão 2.6.4 NÃO foi instalada

**Não instale 2.6.3 ou 2.6.4 antes.** Este pacote já incorpora todas as mudanças.

1. Faça backup do Apps Script atual (2.6.1) e dos arquivos do GitHub atualmente publicados.
2. No Apps Script, **substitua** a versão atual por `Automacao-RH-2.6.5.gs`; não mantenha versões duplicadas no mesmo projeto. Salve.
3. Abra **Implantar → Gerenciar implantações → editar implantação existente → Nova versão → Implantar**. Mantenha a mesma URL do Web App. Não reinstale o gatilho RH se ele já existe.
4. Na pasta `rh/` do GitHub, substitua `rh.js`, `rh-leitura.js` e `index.html`. Os três arquivos CSS estão no pacote apenas como cópia de referência da versão anterior.
5. Após GitHub Pages atualizar, pressione Ctrl + F5. Teste **Atualizar somente este funcionário** com o cadastro do Agnaldo (matrícula 226) antes de usar a atualização completa.
6. Confira o resultado no painel, o nome corrigido nas duas matrizes no Excel original do Drive, e o backup na pasta dedicada.

Para corrigir os nomes de TODOS os colaboradores, use o modo "Atualizar todo o RH" **apenas depois** do teste individual, pois é um processamento de múltiplas planilhas.

## Limitações e salvaguardas

- Somente arquivos `.xlsx` autorizados no Drive são modificados, mediante permissões existentes de administrador/RH.
- A rotina de escrita protege macros/assinaturas, verifica a posição da célula, limita o tamanho da planilha e confirma a existência do backup.
- Não altera dados de outros módulos do dashboard.
- Apps Script de produção e Google Drive **não foram acessados** durante o preparo deste pacote. Testes locais não garantem o comportamento em produção.
