# Smart Group Analytics — Produção

Código-fonte do módulo Produção migrado do projeto anterior para o Smart Group Analytics.

## Arquitetura

- Firebase Authentication: mesma conta/sessão do portal Analytics.
- Firestore: `/producao/{entidade}/items/{documento}`.
- Permissão: `usuarios/{uid}.modulos.producao` ou perfil `administrador`.
- Rotas: `HashRouter`, adequado ao GitHub Pages.
- Importações de planilhas: executadas no navegador e persistidas no Firestore.
- `../runtime/`: JavaScript já transpilado para a versão publicada.

O diretório `_src` existe para manutenção futura. A versão publicada não precisa de Node no servidor.
