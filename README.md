# SobraMais — Controle Financeiro e Gestão de Sobras

Aplicação web de controle financeiro pessoal com foco em **entradas, saídas, gastos padrões (1-clique), categorias com teto mensal e planejamento de sobras líquidas**.

## Como subir para o GitHub e publicar no GitHub Pages

O projeto já está configurado com:
- `base: './'` no `vite.config.ts` (compatível com qualquer subdiretório `https://seu-usuario.github.io/nome-do-repositorio/` ou domínio próprio).
- Workflow oficial de CI/CD em `.github/workflows/deploy.yml` para build e deploy automático no GitHub Pages.
- Arquivos `public/.nojekyll` e `public/404.html` para roteamento SPA sem erros 404.

### Passo 1: Subir o código para o seu repositório no GitHub

No terminal da sua máquina (ou exportando diretamente pelo botão do GitHub):

```bash
git init
git add .
git commit -m "feat: SobraMais controle financeiro pronto para GitHub Pages"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
git push -u origin main
```

### Passo 2: Ativar o GitHub Pages no repositório

1. No seu repositório no GitHub, clique em **Settings** (Configurações) no topo.
2. No menu lateral esquerdo, clique em **Pages**.
3. Em **Build and deployment** → **Source**, selecione a opção **GitHub Actions**.
4. O workflow **Deploy to GitHub Pages** será executado automaticamente na aba **Actions** e publicará o site em `https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO/`.

### Passo 3 (Opcional): Autorizar o domínio no Firebase Authentication

Para usar o login com **Google Popup** diretamente no endereço `SEU_USUARIO.github.io`:
1. Acesse o [Firebase Console](https://console.firebase.google.com/).
2. Abra o projeto associado (`firebase-applet-config.json`).
3. Vá em **Authentication** → **Settings** (Configurações) → **Authorized domains** (Domínios autorizados).
4. Clique em **Add domain** e adicione `SEU_USUARIO.github.io`.

> **Nota:** Mesmo antes de autorizar o domínio no Firebase, o cadastro/login por e-mail e o **Modo Convidado** já funcionam automaticamente salvando os dados no navegador (`localStorage`).

## Rodando Localmente

```bash
npm install
npm run dev
```

Para gerar a pasta estática de produção (`dist/`):

```bash
npm run build
```
