# LogFit — Estação do Corpo

Sistema de gestão para academia (alunos, planos, financeiro, check-in, aulas e treinos).

## Instalação

### Pré-requisitos

- [Node.js](https://nodejs.org) 20 ou superior e npm
- [Git](https://git-scm.com)
- Uma conta no [Neon](https://neon.tech) (banco Postgres) — diretamente ou através do Vercel Marketplace
- Opcional: [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`), caso você tenha acesso ao projeto na Vercel — facilita puxar as variáveis de ambiente já configuradas

### 1. Clonar o repositório

```bash
git clone https://github.com/Thiago270906/logfit.git
cd logfit
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Configurar as variáveis de ambiente

Crie o arquivo `.env.local` na raiz do projeto (ele é ignorado pelo Git). Use `.env.example` como ponto de partida:

```bash
cp .env.example .env.local
```

Você tem duas opções para preenchê-lo:

**Opção A — Projeto já linkado na Vercel (recomendado, se você tiver acesso ao time)**

```bash
npm i -g vercel
vercel link
vercel env pull .env.local
```

Isso preenche automaticamente `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET` etc. com os valores já configurados no projeto (banco Neon provisionado via Vercel Marketplace).

**Opção B — Configuração manual (banco próprio)**

1. Crie um banco Postgres gratuito em [neon.tech](https://neon.tech) (ou via Vercel Marketplace → Neon).
2. No painel da Neon, copie as duas connection strings do seu banco:
   - **pooled** (host com `-pooler`) → variável `DATABASE_URL`
   - **direta/unpooled** (sem `-pooler`) → variável `DATABASE_URL_UNPOOLED` (usada pelas migrations)
3. Gere um segredo para o Better Auth:

   ```bash
   npx @better-auth/cli secret
   ```

   ou, sem depender de rede:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Preencha o `.env.local`:

   ```env
   BETTER_AUTH_SECRET=<segredo gerado>
   BETTER_AUTH_URL=http://localhost:3000

   DATABASE_URL=<connection string pooled>
   DATABASE_URL_UNPOOLED=<connection string direta>
   ```

### 4. Aplicar as migrations no banco

```bash
npm run db:migrate
```

Isso cria todas as tabelas do projeto (autenticação, alunos, planos etc.) no banco configurado.

> Quer visualizar os dados pelo navegador? Rode `npm run db:studio` (abre o Drizzle Studio).

### 5. Criar o usuário administrador

```bash
npm run db:seed-admin
```

Por padrão cria o login `admin@logfit.com` / `Admin@2026`. Para usar outro e-mail/senha, defina as variáveis antes de rodar o comando:

```bash
# Git Bash / macOS / Linux
SEED_ADMIN_EMAIL="seu@email.com" SEED_ADMIN_PASSWORD="SuaSenha123" npm run db:seed-admin
```

```powershell
# PowerShell
$env:SEED_ADMIN_EMAIL = "seu@email.com"
$env:SEED_ADMIN_PASSWORD = "SuaSenha123"
npm run db:seed-admin
```

### 6. Rodar o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) e faça login com o usuário administrador criado no passo anterior.

### Testes

Os testes de integração rodam contra um Postgres real, isolado da produção, via Docker.

```bash
cp .env.test.example .env.test   # só na primeira vez
npm run test:db:up               # sobe o Postgres de teste (docker-compose.test.yml)
npm run test:db:migrate          # aplica as migrations nesse banco
npm test                         # roda os testes (Vitest)
npm run test:db:down             # derruba o container quando terminar
```

O CI (`.github/workflows/ci.yml`) faz esse mesmo fluxo a cada push/PR para a `main` e só libera (job verde) se pelo menos 90% dos testes passarem — ver `scripts/check-test-threshold.mjs`.

### Scripts úteis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm run start` | Roda o build de produção |
| `npm run lint` | Executa o ESLint |
| `npm run db:generate` | Gera uma nova migration a partir de alterações no schema |
| `npm run db:migrate` | Aplica as migrations pendentes no banco |
| `npm run db:push` | Sincroniza o schema direto no banco (uso pontual em dev) |
| `npm run db:studio` | Abre o Drizzle Studio para inspecionar o banco |
| `npm run db:seed-admin` | Cria o usuário administrador inicial |
| `npm test` | Roda os testes (Vitest) contra o banco de teste |
| `npm run test:db:up` / `test:db:down` | Sobe/derruba o Postgres de teste via Docker |
| `npm run test:db:migrate` | Aplica as migrations no banco de teste |
