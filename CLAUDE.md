# Fork XMACNA de whatsapp-web.js

A `main` contém a linha v7 de desenvolvimento. A produção Olympus permanece
fixada em `28288f4353e039b25603fc6c6f813938d110efb8` (1.33.2), conforme o readback
de 20/09/2026. Não substituir esse pin pela main ou por uma branch móvel.
Estado e recuperação: [docs/xmacna-fork.md](docs/xmacna-fork.md).

Use Node 22 e o `package-lock.json` versionado:

```bash
PUPPETEER_SKIP_DOWNLOAD=true npm ci --ignore-scripts
npm run test:offline
./node_modules/.bin/eslint .
```

O gate offline não usa sessão WhatsApp nem envia mensagens. A suíte `npm test`
original exige sessão e destinatário; não executá-la como substituto automático.
Uma mudança do consumidor exige canário autenticado e rollback próprios. Manter
licença Apache-2.0 e atribuições upstream; não reativar publicação automática.
