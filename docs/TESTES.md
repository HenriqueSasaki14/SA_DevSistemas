# Estratégia de Testes (Etapa 9 · Arquiteto)

| Nível | Ferramenta | O que cobre | Comando |
| :-- | :-- | :-- | :-- |
| **Unitário** | `node:test` (nativo do Node) | Schemas de validação (valores negativos, limites, tipos, campos extras), filtros → `where` do Prisma, paginação, datas, CSV, RBAC | `npm test` |
| **Ponta a ponta (e2e)** | Playwright | Fluxos reais no navegador, em **desktop e celular**: cadastro, lançamento do aluguel e saldo atualizado (H5), busca/filtro, paginação, Soft Delete (H1), RBAC, validação na API | `npm run test:e2e` |
| **Banco** | SQL manual | Triggers da Regra de Ouro: `DELETE` em `Transacao` e `UPDATE` em `Auditoria` são recusados | ver abaixo |
| **Estático** | ESLint | Regras de React Hooks e boas práticas no frontend | `npm run lint` |

## Por que essa divisão

- **Regras de negócio puras** (validação, cálculo de filtros) mudam com frequência e são baratas de testar → muitos testes unitários, rodam em milissegundos, sem banco.
- **Os requisitos do enunciado** (saldo atualizar sozinho, exclusão lógica, perfis) só fazem sentido com tudo integrado → poucos testes e2e, mas cobrindo exatamente esses fluxos.
- **O e2e roda em dois tamanhos de tela** porque o sistema é multiplataforma.

## Como rodar os testes e2e

Pré-requisitos: PostgreSQL rodando, `backend/.env` configurado e migrations aplicadas.

```bash
npx playwright install chromium
npm run test:e2e
```

O Playwright sobe backend e frontend sozinho (`npm run dev`). Cada teste cria um usuário novo (`e2e-...@safecash.test`), então pode rodar quantas vezes quiser.

## Teste manual dos triggers (Regra de Ouro no banco)

```sql
DELETE FROM "Transacao" WHERE id = 1;
-- ERROR: Exclusão física proibida em "Transacao": use Soft Delete (deletadoEm).

UPDATE "Auditoria" SET "tipoAcao" = 'EDICAO';
-- ERROR: A trilha de auditoria é imutável: UPDATE não permitido.
```

## Último resultado

- Unitários: **19/19** passando.
- e2e: **12/12** passando (6 cenários × desktop e celular).
