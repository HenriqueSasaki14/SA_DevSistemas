# SafeCash – Sistema de Tesouraria Integrada (FinTech Flow)

> **Situação de Aprendizagem – Desenvolvimento de Sistemas | Prof. Willer Barros**
> Core Engine financeiro fullstack para controle de fluxo de caixa, com integridade bancária e rastreabilidade por auditoria completa.

### Integrantes – Grupo 1

| Nome | Papel |
| :--- | :--- |
| Gustavo Nobre | Back-end |
| Guilherme Weiss Rodrigues da Silva | Back-end |
| Henrique Sasaki Tannous | Front-end |
| Cleyton Rodrigues Pedroza | Front-end |
| Guilherme Coimbra Bruno | Front-end |
| Victor Morsoletto de Oliveira | Arquiteto |

📋 **Quadro de tarefas (Trello):** _colar aqui o link do quadro_
🎬 **Vídeo de demonstração:** _colar aqui o link do vídeo_

---

## 1. Visão Geral

A **SafeCash** é uma plataforma de tesouraria para pequenas empresas controlarem entradas e saídas de caixa com precisão bancária:

- **Precisão bancária:** valores guardados como **centavos inteiros** (R$ 2.000,00 = `200000`), sem erro de arredondamento.
- **Regra de Ouro (H1):** nenhuma exclusão física. Toda exclusão é lógica (Soft Delete), registrando data e responsável, e o próprio banco bloqueia `DELETE` por trigger.
- **Auditoria imutável:** criação, edição (com o diff "antes/depois") e exclusão de cada transação ficam registradas com autor e data.
- **Sem duplicidade:** chave única por usuário (`chaveUnica`) impede o mesmo lançamento duas vezes (duplo clique, reenvio).
- **Validação de schema (Zod):** recusa valores negativos, decimais, tipos errados e campos desconhecidos.
- **Saldo em tempo real:** calculado pela API e atualizado no dashboard após cada operação.
- **Busca, filtros e paginação**, **gráfico mensal**, **extrato em CSV**.
- **Perfis de acesso (RBAC):** ADMIN e USUÁRIO, com área administrativa.
- **Documentação interativa (Swagger)** e **métricas de desempenho** da API.

## 2. Justificativa da Stack (H2, H3, H4)

A SafeCash precisa atender pequenas empresas **no computador e no celular**, com uma equipe pequena e prazo curto. Por isso, **JavaScript Fullstack (Node.js + React)**:

**Multiplataforma**
- **Uma linguagem do servidor ao navegador:** a mesma equipe mantém backend e frontend. Regras como "valor em centavos inteiros" são entendidas igual pelos dois lados.
- **Web e mobile com o mesmo código:** o React gera uma interface responsiva que roda em qualquer navegador, sem instalar nada. Um app nativo futuro pode usar **React Native**, reaproveitando lógica e a mesma API REST.
- **API REST em JSON**, o formato nativo do JavaScript: qualquer cliente (web, app, parceiro) consome a API sem conversões.

**Requisitos técnicos**
- **Node.js + Express 5:** I/O não bloqueante, adequado a muitas requisições curtas e simultâneas (consultas de saldo, lançamentos).
- **Prisma ORM + PostgreSQL:** banco relacional com transações ACID (`$transaction`): a transação e o seu registro de auditoria são gravados juntos ou não são gravados. Migrations versionadas, índices e triggers.
- **Zod:** validação declarativa de schemas.
- **Bcrypt + JWT:** hash de senhas com salt e autenticação stateless com expiração.

**Mercado:** o ecossistema npm é o maior do mundo e o JavaScript Fullstack é amplamente usado pelas empresas de tecnologia da Grande Florianópolis.

## 3. Documentação Técnica

| Documento | Conteúdo |
| :-- | :-- |
| [`docs/REQUISITOS.md`](docs/REQUISITOS.md) | Requisitos funcionais e não funcionais |
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | Camadas, fluxo de dados, segurança e RBAC, fluxos de navegação, índices e métricas |
| [`docs/TESTES.md`](docs/TESTES.md) | Estratégia de testes (unitários e e2e) |
| [`docs/UX.md`](docs/UX.md) | Padrões de UX/UI e checklist de homologação |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Build e deploy (Vercel + Render) |
| **Swagger** | `http://localhost:3001/api/docs` (com o backend rodando) |

## 4. Banco de Dados

Modelo em [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma):

```mermaid
erDiagram
    Usuario ||--o{ Transacao : "responsavel por"
    Usuario ||--o{ Transacao : "excluiu (soft delete)"
    Usuario ||--o{ Auditoria : "autor da acao"
    Transacao ||--o{ Auditoria : "historico de auditoria"

    Usuario {
        int id PK
        string nome
        string email UK
        string senhaHash
        string cpf
        string telefone
        PerfilUsuario perfil "ADMIN | USUARIO"
        datetime criadoEm
    }

    Transacao {
        int id PK
        int usuarioId FK
        TipoTransacao tipo "ENTRADA | SAIDA"
        string descricao
        int valorCentavos "ex: 200000 = R$ 2.000,00"
        datetime dataTransacao
        string chaveUnica "Idempotencia"
        datetime criadoEm
        datetime atualizadoEm
        datetime deletadoEm "Soft Delete"
        int deletadoPorId FK "Responsavel pela exclusao"
    }

    Auditoria {
        int id PK
        int transacaoId FK
        int usuarioId FK
        TipoAcaoAuditoria tipoAcao "CRIACAO | EDICAO | EXCLUSAO"
        datetime dataAcao
        json dadosAlterados "Diff antes/depois"
    }
```

### Rastreabilidade: quem criou e quem alterou

| Pergunta | Onde está a resposta |
| :--- | :--- |
| Quem criou a transação e quando? | `Transacao.usuarioId` + `criadoEm` e a entrada `CRIACAO` da `Auditoria` |
| Quem alterou, quando e o quê? | Entradas `EDICAO` da `Auditoria` (`usuarioId`, `dataAcao`, diff) e `Transacao.atualizadoEm` |
| Quem excluiu e quando? | `Transacao.deletadoPorId` + `deletadoEm` e a entrada `EXCLUSAO` da `Auditoria` |

### Regra de Ouro garantida no banco

| Tentativa (mesmo por SQL direto) | Resultado |
| :--- | :--- |
| `DELETE FROM "Transacao"` | **Bloqueado** por trigger |
| Alterar ou "ressuscitar" uma transação já excluída | **Bloqueado** por trigger |
| `UPDATE` ou `DELETE` em `"Auditoria"` | **Bloqueado** por trigger (append-only) |

Todas as chaves estrangeiras usam `ON DELETE RESTRICT`: nada é apagado em cascata.

## 5. Rotas da API REST (H6, H10)

A documentação completa e interativa (com exemplos e "Try it out") está no **Swagger: `/api/docs`**. Resumo:

Rotas protegidas exigem `Authorization: Bearer <token>`.

| Método | Rota | Descrição | Perfil |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | Cadastro (o 1º usuário do sistema vira ADMIN) | público |
| POST | `/api/auth/login` | Login, retorna o JWT | público |
| GET | `/api/me` | Usuário logado | logado |
| GET | `/api/transacoes` | Lista com **filtros, busca, ordenação e paginação** | logado |
| GET | `/api/transacoes/:id` | Detalhe | logado |
| POST | `/api/transacoes` | Cria (idempotente) + auditoria `CRIACAO` | logado |
| PUT | `/api/transacoes/:id` | Edita + auditoria `EDICAO` com diff | logado |
| DELETE | `/api/transacoes/:id` | **Soft Delete** + auditoria `EXCLUSAO` | logado |
| GET | `/api/transacoes/:id/auditoria` | Trilha da transação (inclusive excluídas) | logado |
| GET | `/api/dashboard` | Saldo, entradas e saídas consolidados | logado |
| GET | `/api/relatorios/mensal` | Entradas × saídas por mês | logado |
| GET | `/api/relatorios/extrato` | Extrato com saldo acumulado (JSON ou CSV) | logado |
| GET | `/api/admin/dashboard` | Totais de toda a empresa | ADMIN |
| GET | `/api/admin/usuarios` | Usuários (paginado, com busca) | ADMIN |
| PATCH | `/api/admin/usuarios/:id/perfil` | Promove ou rebaixa usuário | ADMIN |
| GET | `/api/admin/auditoria` | Auditoria global (paginada) | ADMIN |
| GET | `/api/admin/metricas` | Desempenho por rota | ADMIN |
| GET | `/api/health` | Verificação de saúde | público |

### Exemplo: criar a transação do enunciado

```http
POST /api/transacoes
Authorization: Bearer <token>
Content-Type: application/json

{
  "tipo": "SAIDA",
  "descricao": "Pagamento de Aluguel",
  "valorCentavos": 200000,
  "dataTransacao": "2026-11-22",
  "chaveUnica": "TX-1763850000-ALUGUEL"
}
```

| Campo | Regra |
| :--- | :--- |
| `tipo` | Obrigatório. `ENTRADA` ou `SAIDA` |
| `descricao` | Obrigatório. 1 a 255 caracteres |
| `valorCentavos` | Obrigatório. **Inteiro > 0** e ≤ 2.147.483.647. Recusa negativos, zero, decimais, strings e booleanos |
| `dataTransacao` | Opcional (padrão: agora). `AAAA-MM-DD` ou ISO 8601 |
| `chaveUnica` | Opcional (gerada automaticamente). Repetida para o mesmo usuário → **409** |

### Exemplo: listagem filtrada

```http
GET /api/transacoes?busca=aluguel&tipo=SAIDA&dataInicio=2026-11-01&dataFim=2026-11-30&ordenarPor=valorCentavos&ordem=desc&pagina=1&limite=10
```

```json
{
  "dados": [{ "id": 1, "descricao": "Pagamento de Aluguel", "valorCentavos": 200000, "valorFormatado": "R$ 2.000,00", "...": "..." }],
  "paginacao": { "pagina": 1, "limite": 10, "total": 1, "totalPaginas": 1 }
}
```

### Formato dos erros

```json
{ "erro": "O valor da transação deve ser maior que zero.", "erros": [{ "campo": "valorCentavos", "mensagem": "..." }] }
```

| Status | Quando |
| :---: | :--- |
| 400 | Dados inválidos (schema), ID inválido, JSON malformado |
| 401 | Token ausente, inválido ou expirado; login incorreto |
| 403 | Perfil sem permissão (RBAC) |
| 404 | Transação inexistente, excluída ou de outro usuário |
| 409 | `chaveUnica` repetida ou e-mail já cadastrado |
| 500 | Erro interno (detalhes só no log do servidor) |

## 6. Como Executar

### Pré-requisitos
- **Node.js 22.18 ou superior** (o backend importa o Prisma Client gerado em TypeScript, recurso nativo do Node a partir dessa versão)
- **PostgreSQL** local ou em nuvem (Neon, Supabase, Render, Railway)

### Passo a passo

1. **Instalar as dependências** (o Prisma Client é gerado automaticamente):
   ```bash
   npm run install:all
   ```

2. **Configurar o ambiente:** copie `backend/.env.example` para `backend/.env` e ajuste:
   ```env
   PORT=3001
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/safecash
   JWT_SECRET=sua_chave_secreta_jwt_aqui
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:5173
   ```

3. **Criar as tabelas, índices e triggers:**
   ```bash
   npm run db:migrate --prefix backend
   ```

4. **Iniciar backend + frontend:**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - API: http://localhost:3001 · Swagger: http://localhost:3001/api/docs

   > O **primeiro usuário cadastrado** vira **ADMIN** e vê o menu "Administração".

### Scripts

| Comando (na raiz) | O que faz |
| :--- | :--- |
| `npm run dev` | Backend + frontend em modo desenvolvimento |
| `npm test` | Testes unitários do backend |
| `npm run test:e2e` | Testes e2e no navegador (ver [`docs/TESTES.md`](docs/TESTES.md)) |
| `npm run lint` | ESLint do frontend |
| `npm run build` | Build de produção do frontend |

## 7. Etapas da S.A. (planilha) → onde estão

| Etapa | Backend | Frontend | Arquiteto |
| :-: | :-- | :-- | :-- |
| 1 | Projeto Node (`backend/`) | React + Vite (`frontend/`) | [`docs/REQUISITOS.md`](docs/REQUISITOS.md) |
| 2 | Pastas em camadas (seção 8) | Logo (`frontend/src/assets`) | Quadro no Trello (link no topo) |
| 3 | GET, POST, PUT de transações | Consumo em `services/api.js` | — |
| 4 | JWT (`authMiddleware.js`) | Login com autenticação | Fluxo de dados em [`ARQUITETURA.md`](docs/ARQUITETURA.md#2-fluxo-de-dados-de-uma-criação-etapa-4--validação-do-fluxo) |
| 5 | Rotas protegidas, `autenticar` + `autorizar` | Dashboard | Segurança e RBAC em [`ARQUITETURA.md`](docs/ARQUITETURA.md#3-critérios-de-segurança-e-rbac-etapa-5) |
| 6 | `/api/dashboard`, `/api/relatorios/mensal` (agregações) | Gráfico mensal (`GraficoMensal.jsx`) | Fluxos de navegação em [`ARQUITETURA.md`](docs/ARQUITETURA.md#4-fluxos-de-navegação-etapa-6) |
| 7 | Filtros, paginação e busca em `GET /api/transacoes` | `FiltrosTransacoes`, `TabelaTransacoes`, `Paginacao` | Desempenho e métricas em [`ARQUITETURA.md`](docs/ARQUITETURA.md#5-modelagem-de-desempenho-das-consultas-e-métricas-etapas-7-e-9) |
| 8 | `errorHandler` central + Zod | Toasts, skeletons, modais de erro | [`docs/UX.md`](docs/UX.md) |
| 9 | Índices + relatório de extrato (JSON/CSV) | `memo`/`useMemo`/`useCallback`, debounce, responsivo | [`docs/TESTES.md`](docs/TESTES.md) |
| 10 | `npm run build`, `render.yaml` | `vercel.json`, build de produção | Swagger (`/api/docs`) + [`docs/DEPLOY.md`](docs/DEPLOY.md) |
| 11 | Vídeo de demonstração (link no topo) | | |

## 8. Estrutura do Projeto

```
backend/
├── prisma/
│   ├── schema.prisma             # Usuario, Transacao, Auditoria, perfis, índices
│   └── migrations/               # Tabelas + triggers da Regra de Ouro + RBAC/índices
├── src/
│   ├── server.js                 # Inicialização
│   ├── app.js                    # Express: CORS, JSON, métricas, Swagger, rotas, erros
│   ├── routes/                   # auth, transacoes, dashboard/relatorios, admin
│   ├── validators/schemas.js     # Schemas Zod (body e query string)
│   ├── services/                 # Regras de negócio
│   ├── middlewares/              # JWT, RBAC, métricas, tratamento de erros
│   ├── docs/openapi.js           # Especificação Swagger/OpenAPI
│   ├── errors/  utils/  lib/
└── test/                         # Testes unitários (node:test)
frontend/src/
├── pages/                        # Login, Cadastro, Dashboard, Administração
├── components/
│   ├── layout/                   # Header, Footer
│   ├── dashboard/                # GraficoMensal
│   ├── transacoes/               # Filtros, Tabela, Modais, ListaAuditoria
│   └── ui/                       # Modal, Paginacao, CampoMoeda, Skeleton
├── contexts/                     # Sessão (JWT) e Toasts
├── hooks/                        # useRequisicao, useDebounce
├── services/api.js               # Cliente da API REST
└── utils/                        # Moeda e datas
e2e/                              # Testes ponta a ponta (Playwright)
docs/                             # Requisitos, arquitetura, testes, UX, deploy
```
