# Fork XMACNA — fonte e versão operacional

A main consolida a linha de desenvolvimento `xmacna-v7` (`d2f1fdd`), incluindo o histórico v5/v6, e preserva a remoção do workflow de release da main anterior `599daa1`. O runtime dessa linha não foi alterado pela consolidação. A branch v8 (`246f69f`) é uma atualização posterior, arquivada em tag de recuperação, sem promoção nesta entrega.

**Main não é a versão em produção.** O readback de 20/09/2026 dos três artefatos distintos dos clusters Olympus confirmou `whatsapp-web.js` 1.33.2, commit `28288f4353e039b25603fc6c6f813938d110efb8` (`xmacna-fix-group`). Os hashes de Client, Store, Utils e Puppeteer coincidem com essa ref. O consumidor Olympus permanece fixado nesse SHA; trocar para main/v7 exige canário autenticado próprio e rollback, não apenas estes testes offline. Não houve publicação npm nem troca de imagem produtiva.

Os testes `npm run test:offline` exercitam as funções reais com dependências de navegador controladas: recuperação de binding CDP, propagação de erro inesperado, coleções movidas, ausência/presença de setPushname e duas assinaturas de sendSeen. Não usam sessão nem enviam mensagens. A suíte original `npm test` exige sessão WhatsApp e destinatário, conforme `tests/README.md`; não é executada implicitamente pelo gate offline.

O workflow Lint usa Node 22, mantém ESLint integral e executa os testes offline. O updater automático fica limitado ao repositório upstream, pois sua configuração solicita revisão de terceiros. A licença Apache-2.0 e os créditos originais permanecem preservados.

Recuperação: tags `recovery/2026-09-20/main`, `recovery/2026-09-20/operational`, `recovery/2026-09-20/v8`. Para reproduzir o comportamento implantado, use a tag operational ou o SHA completo acima, jamais a posição corrente da main.
