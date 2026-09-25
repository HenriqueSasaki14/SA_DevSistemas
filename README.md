# SafeCash — SA_DevSistemas

```
backend/    API Express (SQLite + JWT) — porta 3001
  models/   models Sequelize (PostgreSQL) — sincronizar com `npm run sync`
frontend/   React + Vite — porta 5173 (redireciona /api para o backend)
```

## Como rodar

Requisito: Node.js 20+.

```bash
npm run install:all                     # instala dependências da raiz, backend e frontend
cp backend/.env.example backend/.env    # depois troque o JWT_SECRET
npm run dev                             # sobe backend e frontend juntos
```

Abra http://localhost:5173.

Também dá para subir separado: `npm run backend` e `npm run frontend`.
