# MeuDate

Crie convites para encontros, compartilhe um link e receba confirmações — sem servidor, sem cadastro. Tudo roda no navegador com `localStorage`; exporte/importe `.json` para levar um convite para outro aparelho.

## Rodando localmente

Como o app usa `fetch`/rotas simples e nenhum passo de build, basta subir um servidor estático na pasta (abrir com duplo clique também funciona, mas um servidor evita restrições de alguns navegadores com `file://`):

```bash
npx serve .
# ou
python3 -m http.server 8080
```

Abra `http://localhost:8080`.

## Estrutura

```
index.html          shell da página + import dos scripts
css/styles.css       design tokens e estilos
js/storage.js        camada de persistência (hoje: localStorage)
js/imageUtils.js     compressão de imagem via canvas antes de salvar
js/app.js            roteamento por hash e renderização das telas
```

## Como funciona

- **Criar convite** (`#/`): formulário com autor, título, imagem opcional e horários sugeridos. Ao salvar, o convite ganha um ID curto e vira dono (`meudate:myInvites`) neste navegador.
- **Ver / responder** (`#/d/:id`): tela pública do convite — quem recebe o link escolhe um horário e confirma presença.
- **Painel do criador** (`#/painel/:id`): lista de respostas, contagem por horário, link para compartilhar, exportar `.json` e apagar o convite.
- **Importar**: em qualquer navegador, um botão "Importar .json" lê um arquivo exportado e passa a tratar aquele convite como seu (some no painel local).

Compatível com GitHub Pages porque as rotas usam `#/...` (hash), então não há necessidade de configurar rotas no servidor.

## Limite de armazenamento

`localStorage` tem ~5MB por origem. Imagens são redimensionadas (máx. 900px de largura) e comprimidas em JPEG no cliente antes de salvar; o app avisa se, mesmo assim, o arquivo final ficar grande.

## Extensão opcional: Firebase

O app foi desenhado para trocar de backend sem reescrever as telas: `js/app.js` só conhece os métodos de `MeuDateStorage` (`getInvite`, `saveInvite`, `addResponse`, etc). Para migrar para Firebase:

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com), ative **Authentication** (ex: login anônimo ou por e-mail) e **Firestore**.
2. Adicione o SDK do Firebase ao `index.html` (via CDN ou npm, se introduzir um bundler).
3. Reescreva os métodos de `js/storage.js` para ler/escrever no Firestore em vez de `localStorage` — por exemplo, `saveInvite` viraria `setDoc(doc(db, 'invites', id), invite)`. A assinatura dos métodos (o que cada um recebe e retorna) pode continuar igual, então `app.js` não precisa mudar.
4. Use `firebase deploy` (Firebase Hosting) no lugar de — ou junto com — o GitHub Pages.

Isso é opcional: o app funciona 100% offline sem nenhuma dessas etapas.

## Publicando no GitHub Pages

1. Suba os arquivos para um repositório no GitHub.
2. Em **Settings → Pages**, escolha a branch (ex: `main`) e a pasta raiz (`/`).
3. O site fica em `https://SEU-USUARIO.github.io/SEU-REPO/`. Como as rotas são por hash, não é preciso nenhuma configuração extra de redirecionamento.
