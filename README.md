# SafeCash – Sistema de Tesouraria Integrada (FinTech Flow)

> **Situação de Aprendizagem | Prof. Willer Barros | Arquiteto de Software**  
> Core Engine financeiro fullstack para controle de fluxo de caixa, integridade bancária e rastreabilidade com auditoria completa.

---

## 1. Visão Geral do Projeto

A **SafeCash** é uma plataforma de gestão de tesouraria desenvolvida para pequenas empresas e startups gerenciarem entradas e saídas de caixa com precisão bancária. O sistema soluciona problemas críticos de integridade de dados através de:
- **Autenticação Segura**: Criptografia de senhas com **Bcrypt** e sessões stateless via **JWT (JSON Web Token)**.
- **Precisão Bancária**: Valores armazenados como **centavos inteiros positivos** (`Int`), eliminando erros de arredondamento de ponto flutuante.
- **Prevenção de Duplicidade**: Chave única por usuário (`chaveUnica`) garantindo idempotência e evitando lançamentos duplicados por duplo clique ou reenvio acidental.
- **Regra de Ouro (H1 - Soft Delete)**: Proibição estrita de exclusão física de registros do banco de dados; toda exclusão é lógica, marcando a data e o usuário responsável.
- **Trilha de Auditoria Contínua**: Registro imutável de criação, edição e exclusão de qualquer transação com o diff das alterações e autoria.
- **Cálculo Consolidado Centralizado**: O frontend não calcula saldos; exibe os totais consolidados e formatados pela API REST.

---

## 2. Justificativa da Stack Tecnológica (H2, H3, H4)

O ecossistema **Fullstack JavaScript** foi selecionado estrategicamente:
- **Backend (Node.js + Express)**: Arquitetura baseada em eventos e I/O não bloqueante, ideal para APIs financeiras de alta concorrência. Unifica a linguagem entre cliente e servidor, agilizando validações e reduzindo custo de contexto.
- **Prisma ORM + PostgreSQL**: Tipagem estática de ponta a ponta, migrations seguras e suporte nativo a transações atômicas ACID (`$transaction`), cruciais para a consistência bancária e auditoria.
- **Frontend (React + Vite)**: Interface administrativa responsiva (Web e Mobile), renderização reativa do dashboard em tempo real e experiência de uso veloz e moderna.
- **Segurança (Bcrypt & JWT)**: Práticas consolidadas de mercado com hash salgado de senhas e autorização baseada em tokens com expiração configurável.

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

---

## 4. Documentação das Rotas da API REST (H6, H10)

Todas as rotas (exceto registro e login) exigem o header:
`Authorization: Bearer <token_jwt>`

### 4.1. Autenticação

#### `POST /api/auth/register`
Cadastra um novo usuário criptografando a senha com `bcrypt` (10 rounds).
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
- **Resposta (200):** Retorna o JWT e os dados do usuário.

#### `GET /api/me`
Retorna os dados da sessão do usuário autenticado.

---

### 4.2. Transações e Tesouraria

#### `GET /api/transacoes`
Lista todas as transações ativas do usuário logado (exclui automaticamente registros com soft delete).

#### `POST /api/transacoes`
Cria um novo lançamento com validação estrita de centavos inteiros e prevenção de duplicidade.
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

#### `DELETE /api/transacoes/:id`
Executa o **Soft Delete** (Regra de Ouro):
- Atualiza `deletadoEm = new Date()` e `deletadoPorId = req.usuario.id`.
- O registro **nunca é apagado** do banco de dados.
- Registra `tipoAcao: 'EXCLUSAO'` na tabela `Auditoria`.

#### `GET /api/transacoes/:id/auditoria`
Retorna toda a trilha de auditoria da transação (quem alterou, data e o diff detalhado).

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
    "despesas": "R$ 2.000,00",
    "investimentos": "R$ 0,00"
  }
  ```

---

## 5. Metodologia Ágil e Cronograma de Sprints (H8)

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
- Node.js 20+ instalado
- PostgreSQL rodando localmente ou via nuvem (Neon / Supabase / Render / Railway)

### Passo a Passo

1. **Instalar Dependências:**
   ```bash
   npm run install:all
   ```

2. **Configurar as Variáveis de Ambiente:**
   Crie o arquivo `backend/.env` (baseado em `backend/.env.example`):
   ```env
   PORT=3001
   JWT_SECRET=sua_chave_secreta_jwt_aqui
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/safecash
   JWT_EXPIRES_IN=7d
   ```

3. **Gerar o Prisma Client e Executar Migrations:**
   ```bash
   cd backend
   npx prisma generate
   # Se já estiver com o PostgreSQL rodando:
   # npx prisma migrate deploy
   cd ..
   ```

4. **Iniciar Aplicação (Backend + Frontend):**
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3001`
