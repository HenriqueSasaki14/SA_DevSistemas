# Build e Deploy (Etapa 10)

Arquitetura de produção: **frontend na Vercel** + **backend e PostgreSQL no Render** (ambos têm plano gratuito).

## 1. Backend + banco (Render)

1. Crie uma conta em https://render.com e conecte o GitHub.
2. **New → Blueprint** → selecione este repositório. O Render lê o `render.yaml` e cria:
   - o PostgreSQL `safecash-db`;
   - o serviço `safecash-api` (pasta `backend/`), que roda `npm install && npm run build` e, ao iniciar, `prisma migrate deploy` (cria tabelas, índices e triggers).
3. O `JWT_SECRET` é gerado automaticamente. Deixe `CORS_ORIGIN` para o passo 3.
4. Teste: `https://<seu-servico>.onrender.com/api/health` deve responder `{"status":"ok"}`, e `/api/docs` abre o Swagger.

## 2. Frontend (Vercel)

1. Crie uma conta em https://vercel.com → **Add New → Project** → importe o repositório.
2. **Root Directory:** `frontend` (o `vercel.json` já configura build e rotas da SPA).
3. **Environment Variables:** `VITE_API_URL = https://<seu-servico>.onrender.com`
4. Deploy. Anote a URL gerada (ex: `https://safecash.vercel.app`).

## 3. Ligar os dois

No Render, em `safecash-api → Environment`, defina `CORS_ORIGIN` com a URL da Vercel e salve (o serviço reinicia).

## Build local de produção

```bash
npm run build                      # gera frontend/dist
npm run build --prefix backend     # gera o Prisma Client
```

> No plano gratuito do Render o backend "dorme" após 15 min sem acesso; a primeira requisição depois disso demora ~30 s.
