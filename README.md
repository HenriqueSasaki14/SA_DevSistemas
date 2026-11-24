# SafeCash – Sistema de Tesouraria Integrada (FinTech Flow)

> **Situação de Aprendizagem – Desenvolvimento de Sistemas | Prof. Willer Barros**  
> Core Engine financeiro fullstack para controle de fluxo de caixa, integridade bancária e rastreabilidade com auditoria completa.

### Integrantes

| Nome | GitHub |
| :--- | :--- |
| _preencher_ | _@usuario_ |
| _preencher_ | _@usuario_ |
| _preencher_ | _@usuario_ |
| _preencher_ | _@usuario_ |

---

## 1. Visão Geral do Projeto

A **SafeCash** é uma plataforma de gestão de tesouraria desenvolvida para pequenas empresas e startups gerenciarem entradas e saídas de caixa com precisão bancária. O sistema soluciona problemas críticos de integridade de dados através de:
- **Autenticação Segura**: Criptografia de senhas com **Bcrypt** e sessões stateless via **JWT (JSON Web Token)**.
- **Precisão Bancária**: Valores armazenados como **centavos inteiros positivos** (`Int`), eliminando erros de arredondamento de ponto flutuante.
- **Prevenção de Duplicidade**: Chave única por usuário (`chaveUnica`) garantindo idempotência e evitando lançamentos duplicados por duplo clique ou reenvio acidental.
- **Regra de Ouro (H1 - Soft Delete)**: Proibição estrita de exclusão física de registros; toda exclusão é lógica, marcando a data e o usuário responsável. A regra é garantida **também pelo banco** (triggers), não só pela API.
- **Trilha de Auditoria Contínua**: Registro imutável (append-only) de criação, edição e exclusão de qualquer transação com o diff das alterações e autoria.
- **Validação de Esquemas (Zod)**: Todo corpo de requisição é validado por schema antes de chegar às regras de negócio (valores negativos, decimais, tipos errados e campos desconhecidos são recusados).
- **Cálculo Consolidado Centralizado**: O frontend não calcula saldos; exibe os totais consolidados e formatados pela API REST.

---

## 2. Justificativa da Stack Tecnológica (H2, H3, H4)

A SafeCash precisa atender pequenas empresas **no computador e no celular**, com uma equipe pequena e prazo curto. O **JavaScript Fullstack (Node.js + React)** foi escolhido por estes motivos:

**Multiplataforma**
- **Uma linguagem só, do servidor ao navegador**: a mesma equipe mantém backend e frontend, sem trocar de linguagem nem duplicar conhecimento. Regras como "valor em centavos inteiros" são escritas uma vez e entendidas pelos dois lados.
- **Web e mobile com o mesmo código**: o React gera uma interface responsiva que roda em qualquer navegador (desktop, tablet, celular), sem instalar nada. Se a SafeCash quiser um app nativo no futuro, o **React Native** reaproveita componentes, lógica e a mesma API REST.
- **API REST em JSON**: o formato nativo do JavaScript. Qualquer cliente (web, app, parceiro) consome a API sem conversões.

**Requisitos técnicos**
- **Node.js + Express**: I/O não bloqueante, adequado a muitas requisições curtas e simultâneas (consultas de saldo, lançamentos). O Express 5 encaminha erros de funções `async` direto para um tratador central.
- **Prisma ORM + PostgreSQL**: banco relacional com transações ACID (`$transaction`) — a transação e o seu registro de auditoria são gravados juntos ou não são gravados. Migrations versionadas e triggers garantem a Regra de Ouro no próprio banco.
- **Zod**: validação declarativa de schemas, cumprindo o requisito de segurança de dados.
- **Bcrypt + JWT**: hash de senhas com salt e autenticação stateless com expiração configurável.

**Mercado**
- O ecossistema npm é o maior do mundo e o JavaScript Fullstack é amplamente adotado pelas empresas de tecnologia da Grande Florianópolis, o que facilita contratação e manutenção.

---

## 3. Arquitetura do Banco de Dados

O banco relacional possui as **três entidades fundamentais** modeladas no Prisma ([`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)):

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
        datetime criadoEm
    }

    Transacao {
        int id PK
        int usuarioId FK
        TipoTransacao tipo "ENTRADA | SAIDA"
        string descricao
        int valorCentavos "Guardado em centavos (ex: 200000)"
        datetime dataTransacao
        string chaveUnica "Chave de Idempotencia"
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
        json dadosAlterados "Diff detalhado das alteracoes"
    }
```

### 3.1. Rastreabilidade: quem criou e quem alterou

| Pergunta | Onde está a resposta |
| :--- | :--- |
| Quem criou a transação e quando? | `Transacao.usuarioId` + `Transacao.criadoEm` e a entrada `CRIACAO` da `Auditoria` |
| Quem alterou, quando e o quê? | Entradas `EDICAO` da `Auditoria` (`usuarioId`, `dataAcao`, diff `antes/depois`) e `Transacao.atualizadoEm` |
| Quem excluiu e quando? | `Transacao.deletadoPorId` + `Transacao.deletadoEm` e a entrada `EXCLUSAO` da `Auditoria` |

### 3.2. Regra de Ouro garantida no banco

A migration inicial ([`backend/prisma/migrations`](backend/prisma/migrations)) cria triggers no PostgreSQL. Mesmo com SQL manual, fora da API:

| Tentativa | Resultado |
| :--- | :--- |
| `DELETE FROM "Transacao"` | **Bloqueado** – exclusão física proibida |
| Alterar ou "ressuscitar" uma transação já excluída | **Bloqueado** – registro excluído fica congelado |
| `UPDATE` ou `DELETE` em `"Auditoria"` | **Bloqueado** – auditoria é somente inserção |

Além disso, todas as chaves estrangeiras usam `ON DELETE RESTRICT`: nada é apagado em cascata.

---

## 4. Documentação das Rotas da API REST (H6, H10)

Todas as rotas (exceto registro e login) exigem o header:
`Authorization: Bearer <token_jwt>`

**Formato dos erros** (toda resposta de erro segue este padrão):
```json
{
  "erro": "O valor da transação deve ser maior que zero. Valores negativos não são permitidos.",
  "erros": [{ "campo": "valorCentavos", "mensagem": "..." }]
}
```

| Status | Quando |
| :---: | :--- |
| 400 | Dados inválidos (schema), ID inválido, JSON malformado |
| 401 | Token ausente, inválido ou expirado; login incorreto |
| 404 | Transação inexistente, excluída ou de outro usuário |
| 409 | `chaveUnica` repetida ou e-mail já cadastrado |
| 500 | Erro interno (detalhes ficam só no log do servidor) |

### 4.1. Autenticação

#### `POST /api/auth/register`
Cadastra um novo usuário criptografando a senha com `bcrypt` (10 rounds).
Regras: `nome` com 3+ caracteres, `email` válido (único, retorna **409** se repetido), `senha` com 6+ caracteres. `cpf` e `telefone` são opcionais.
- **Body:**
  ```json
  {
    "nome": "Empresa Alfa",
    "email": "contato@empresaalfa.com",
    "senha": "senhaSegura123",
    "cpf": "123.456.789-00",
    "telefone": "(48) 99999-9999"
  }
  ```
- **Resposta (201):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": { "id": 1, "nome": "Empresa Alfa", "email": "contato@empresaalfa.com" }
  }
  ```

#### `POST /api/auth/login`
Autentica o usuário comparando a senha via `bcrypt.compare`.
- **Body:**
  ```json
  {
    "email": "contato@empresaalfa.com",
    "senha": "senhaSegura123"
  }
  ```
- **Resposta (200):** Retorna o JWT e os dados do usuário. Credenciais erradas retornam **401**.

#### `GET /api/me`
Retorna os dados da sessão do usuário autenticado.

---

### 4.2. Transações e Tesouraria

#### `GET /api/transacoes`
Lista todas as transações ativas do usuário logado (exclui automaticamente registros com soft delete).

#### `GET /api/transacoes/:id`
Retorna uma transação ativa do usuário (404 se não existir ou estiver excluída).

#### `POST /api/transacoes`
Cria um novo lançamento com validação estrita de centavos inteiros e prevenção de duplicidade.

| Campo | Regra |
| :--- | :--- |
| `tipo` | Obrigatório. `ENTRADA` ou `SAIDA` |
| `descricao` | Obrigatório. 1 a 255 caracteres |
| `valorCentavos` | Obrigatório. **Número inteiro > 0** e ≤ 2.147.483.647 (R$ 21.474.836,47). Recusa negativos, zero, decimais, strings e booleanos |
| `dataTransacao` | Opcional (padrão: agora). `AAAA-MM-DD` ou ISO 8601 |
| `chaveUnica` | Opcional (gerada automaticamente). Até 100 caracteres |

Campos não listados (ex: `usuarioId`, `deletadoEm`) são **recusados** com 400.

- **Body:**
  ```json
  {
    "tipo": "SAIDA",
    "descricao": "Pagamento de Aluguel",
    "valorCentavos": 200000,
    "dataTransacao": "2026-11-22T00:00:00.000Z",
    "chaveUnica": "TX-1763850000-ALUGUEL"
  }
  ```
- **Idempotência (409 Conflict):** Se a mesma `chaveUnica` for reenviada para o mesmo usuário, a API recusa a duplicação.
- **Auditoria Automática:** Registra uma entrada com `tipoAcao: 'CRIACAO'` na tabela `Auditoria`.

#### `PUT /api/transacoes/:id`
Edita um lançamento e gera uma entrada na trilha de auditoria (`tipoAcao: 'EDICAO'`) contendo o diff dos dados alterados.
Aceita qualquer combinação de `tipo`, `descricao`, `valorCentavos` e `dataTransacao` (mesmas regras do POST; ao menos um campo). A `chaveUnica` não pode ser alterada. Se nada mudar, nenhuma auditoria é gravada.

#### `DELETE /api/transacoes/:id`
Executa o **Soft Delete** (Regra de Ouro):
- Atualiza `deletadoEm = new Date()` e `deletadoPorId = req.usuario.id`.
- O registro **nunca é apagado** do banco de dados.
- Registra `tipoAcao: 'EXCLUSAO'` na tabela `Auditoria`.

#### `GET /api/transacoes/:id/auditoria`
Retorna toda a trilha de auditoria da transação (quem alterou, data e o diff detalhado), **inclusive de transações já excluídas**.

---

### 4.3. Dashboard Consolidado

#### `GET /api/dashboard`
Retorna os totais consolidados calculados diretamente pela API:
- **Resposta (200):**
  ```json
  {
    "saldoTotalCentavos": 300000,
    "receitasCentavos": 500000,
    "despesasCentavos": 200000,
    "totalTransacoesAtivas": 5,
    "saldoTotal": "R$ 3.000,00",
    "receitas": "R$ 5.000,00",
    "despesas": "R$ 2.000,00"
  }
  ```

---

## 5. Metodologia Ágil e Cronograma de Sprints (H8)

📋 **Quadro do projeto (GitHub Projects):** _colar aqui o link do quadro_

O ciclo de desenvolvimento foi organizado em 5 sprints incrementais:

| Sprint | Escopo Principal | Entregáveis |
| :---: | :--- | :--- |
| **Sprint 1** | Modelagem Relacional & Prisma | Schema com 3 entidades (`Usuario`, `Transacao`, `Auditoria`), centavos inteiros e migrations. |
| **Sprint 2** | Regras de Negócio & Segurança | Bcrypt, JWT, validação de valores positivos, prevenção de duplicidade e soft delete. |
| **Sprint 3** | API REST & Serviços | Endpoints de CRUD, cálculo de saldo consolidado e gravação de auditoria em `$transaction`. |
| **Sprint 4** | Frontend React & Experiência | Dashboard reativo, modais de cadastro/edição, máscara de R$, confirmação de exclusão e visualizador de auditoria. |
| **Sprint 5** | Limpeza, Auditoria & E2E | Remoção de arquivos legados, validação ponta a ponta e documentação técnica completa. |

---

## 6. Como Executar o Projeto

### Pré-requisitos
- **Node.js 22.18 ou superior** (o backend importa o Prisma Client gerado em TypeScript, recurso nativo do Node a partir dessa versão)
- PostgreSQL rodando localmente ou via nuvem (Neon / Supabase / Render / Railway)

### Passo a Passo

1. **Instalar Dependências:**
   ```bash
   npm run install:all
   ```

2. **Configurar as Variáveis de Ambiente:**
   Copie `backend/.env.example` para `backend/.env` e ajuste os valores:
   ```env
   PORT=3001
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/safecash
   JWT_SECRET=sua_chave_secreta_jwt_aqui
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:5173
   ```

3. **Criar as tabelas no banco (migrations):**
   ```bash
   npm run db:migrate --prefix backend
   ```
   O Prisma Client é gerado automaticamente no `npm install` (script `postinstall`).

4. **Iniciar Aplicação (Backend + Frontend):**
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3001`

5. **Rodar os testes automatizados do backend:**
   ```bash
   npm test --prefix backend
   ```

---

## 7. Estrutura do Projeto

```
backend/
├── prisma/
│   ├── schema.prisma            # Modelo relacional (Usuario, Transacao, Auditoria)
│   └── migrations/              # Migration inicial + triggers da Regra de Ouro
├── src/
│   ├── server.js                # Inicialização do servidor
│   ├── app.js                   # Configuração do Express (CORS, JSON, rotas, erros)
│   ├── routes/                  # authRoutes, transacaoRoutes
│   ├── validators/schemas.js    # Schemas Zod (validação de entrada)
│   ├── services/                # Regras de negócio (auth, transações, auditoria)
│   ├── middlewares/             # autenticação JWT e tratamento central de erros
│   ├── errors/AppError.js       # Erro de negócio com status HTTP
│   ├── utils/moeda.js           # Formatação de centavos em R$
│   └── lib/prisma.ts            # Instância do Prisma Client
└── test/                        # Testes (node:test)
frontend/
└── src/
    ├── pages/                   # Login, Cadastro, Dashboard
    ├── contexts/                # Sessão do usuário (JWT)
    ├── services/api.js          # Cliente da API REST
    └── utils/moeda.js           # Máscara de valor em R$
```
