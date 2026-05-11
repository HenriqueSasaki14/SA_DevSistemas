# SafeCash — Contrato de API

> Gerado pelo time de **frontend**. Use como guia completo para implementar o backend.

---

## Visão geral

O frontend React (porta 5173) consome uma API REST em `http://localhost:3001`.
O arquivo `src/backend/routes.js` é um **mock em memória** usado para desenvolvimento frontend.
Substitua-o pela implementação real seguindo o scaffold em `src/backend/controllers/` e `src/backend/routes/`.

---

## Autenticação

- Rotas protegidas exigem header: `Authorization: Bearer <token>`
- O token é gerado no login/cadastro e salvo no `localStorage` do cliente com a chave `safecash_token`
- Na abertura do app, o frontend valida o token via `GET /api/me`
- Se `/api/me` retornar 401 → token removido, usuário redirecionado para `/login`
- Use **JWT** (`jsonwebtoken`) com `JWT_SECRET` via variável de ambiente

---

## Endpoints

### `POST /api/auth/register` — Público

**Body:**
```json
{ "nome": "string", "email": "string", "senha": "string" }
```

**201 Created:**
```json
{ "token": "string (JWT)" }
```

**Erros esperados:**
| Status | Motivo |
|--------|--------|
| 400 | Campos faltando |
| 409 | E-mail já cadastrado |

---

### `POST /api/auth/login` — Público

**Body:**
```json
{ "email": "string", "senha": "string" }
```

**200 OK:**
```json
{ "token": "string (JWT)" }
```

**Erros esperados:**
| Status | Motivo |
|--------|--------|
| 400 | Campos faltando |
| 401 | Credenciais inválidas |

---

### `GET /api/me` — Autenticado

**Headers:** `Authorization: Bearer <token>`

**200 OK:**
```json
{
  "id": 1,
  "nome": "string",
  "email": "string",
  "criadoEm": "2026-05-11T00:00:00.000Z"
}
```

**Erros esperados:**
| Status | Motivo |
|--------|--------|
| 401 | Token ausente ou inválido |

---

### `GET /api/dashboard` — Autenticado

**Headers:** `Authorization: Bearer <token>`

**200 OK:**
```json
{
  "saldoTotal":        "R$ 48.230,00",
  "saldoDelta":        "+4,2% este mês",
  "receitas":          "R$ 12.400,00",
  "receitasDelta":     "+8,1% esta semana",
  "despesas":          "R$ 3.820,00",
  "despesasDelta":     "-2,3% este mês",
  "investimentos":     "R$ 31.080,00",
  "investimentosDelta":"+6,7% no trimestre"
}
```

> Os valores podem vir do banco já formatados ou o backend pode formatar antes de enviar.
> O frontend exibe os valores exatamente como recebe — sem formatação adicional.

**Erros esperados:**
| Status | Motivo |
|--------|--------|
| 401 | Não autenticado |

---

### `GET /api/transacoes` — Autenticado

**Headers:** `Authorization: Bearer <token>`

**200 OK** (array — pode ser vazio `[]`):
```json
[
  {
    "desc": "Transferência Recebida",
    "data": "05/05/2026",
    "val":  "+R$ 3.200,00",
    "tipo": "entrada"
  }
]
```

**Valores válidos para `tipo`:**
| Valor | Cor no frontend | Ícone |
|-------|-----------------|-------|
| `entrada`    | verde | `+` |
| `saida`      | vermelho | `−` |
| `rendimento` | azul | `%` |
| `tarifa`     | cinza | `−` |

**Erros esperados:**
| Status | Motivo |
|--------|--------|
| 401 | Não autenticado |

---

## CORS

```js
cors({ origin: ['http://localhost:5173', 'https://seu-dominio.com'] })
```

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```
PORT=3001
JWT_SECRET=
DATABASE_URL=
```

---

## Scaffold

O código está organizado em:

```
src/backend/
├── controllers/
│   ├── authController.js       ← register, login, me
│   ├── dashboardController.js  ← getDashboard
│   └── transacoesController.js ← getTransacoes
├── middleware/
│   └── auth.js                 ← verificação JWT
├── routes/
│   ├── auth.js
│   ├── me.js
│   ├── dashboard.js
│   └── transacoes.js
└── routes.js                   ← MOCK (referência, não usar em prod)
```

Cada controller tem `// TODO` marcando onde plugar o banco de dados.
