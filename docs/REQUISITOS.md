# Requisitos – SafeCash (Etapa 1 · Arquiteto)

## Requisitos Funcionais (RF)

| ID | Requisito | Onde está implementado |
| :-- | :-- | :-- |
| RF01 | O usuário deve se cadastrar com nome, e-mail e senha (CPF e telefone opcionais). | `POST /api/auth/register`, tela `/register` |
| RF02 | O usuário deve se autenticar com e-mail e senha e receber um token JWT. | `POST /api/auth/login`, tela `/login` |
| RF03 | O usuário deve cadastrar transações de ENTRADA ou SAÍDA com descrição, valor e data. | `POST /api/transacoes`, modal "Novo Lançamento" |
| RF04 | O usuário deve listar as suas transações ativas. | `GET /api/transacoes` |
| RF05 | O usuário deve editar uma transação. | `PUT /api/transacoes/:id` |
| RF06 | O usuário deve excluir uma transação **sem que ela seja apagada do banco** (Soft Delete). | `DELETE /api/transacoes/:id` |
| RF07 | O sistema deve exibir saldo, total de entradas e total de saídas, atualizados a cada operação. | `GET /api/dashboard`, cartão de saldo |
| RF08 | O sistema deve impedir lançamentos duplicados (mesma chave única reenviada). | `chaveUnica` + 409 Conflict |
| RF09 | O sistema deve registrar quem criou, editou e excluiu cada transação, quando e o que mudou. | Tabela `Auditoria`, `GET /api/transacoes/:id/auditoria` |
| RF10 | O usuário deve buscar transações pela descrição e filtrar por tipo, período e valor. | `GET /api/transacoes?busca&tipo&dataInicio&dataFim&valorMin&valorMax` |
| RF11 | A listagem deve ser paginada e ordenável. | `?pagina&limite&ordenarPor&ordem` |
| RF12 | O sistema deve exibir um gráfico de entradas × saídas por mês. | `GET /api/relatorios/mensal`, componente `GraficoMensal` |
| RF13 | O usuário deve exportar o extrato de um período (com saldo acumulado) em CSV. | `GET /api/relatorios/extrato?formato=csv` |
| RF14 | O administrador deve ver os totais de toda a empresa, os usuários e a auditoria global. | `/api/admin/*`, tela `/admin` |
| RF15 | O administrador deve conceder ou remover o perfil ADMIN de outros usuários. | `PATCH /api/admin/usuarios/:id/perfil` |

## Requisitos Não Funcionais (RNF)

| ID | Categoria | Requisito | Como é garantido |
| :-- | :-- | :-- | :-- |
| RNF01 | Integridade | Nenhum registro financeiro pode ser apagado fisicamente (Regra de Ouro H1). | Soft Delete na API **e** triggers no PostgreSQL que bloqueiam `DELETE` |
| RNF02 | Integridade | A auditoria é imutável. | Trigger bloqueia `UPDATE`/`DELETE` em `Auditoria`; FKs `ON DELETE RESTRICT` |
| RNF03 | Precisão | Valores monetários sem erro de arredondamento. | Centavos inteiros (`Int`); nunca `float` |
| RNF04 | Consistência | Uma operação e a sua auditoria são gravadas juntas ou não são gravadas. | `prisma.$transaction` (ACID) |
| RNF05 | Segurança | Senhas nunca são guardadas em texto puro. | `bcrypt` com 10 rounds |
| RNF06 | Segurança | Rotas protegidas exigem token válido; recursos administrativos exigem perfil ADMIN. | Middlewares `autenticar` + `autorizar('ADMIN')` (RBAC) |
| RNF07 | Segurança | Toda entrada é validada por schema; campos desconhecidos são recusados. | Zod (`strictObject`) |
| RNF08 | Segurança | Erros internos não expõem detalhes (SQL, stack). | `errorHandler` central |
| RNF09 | Isolamento | Um usuário nunca vê dados de outro. | Todo `where` inclui `usuarioId` do token |
| RNF10 | Usabilidade | A interface funciona em desktop e celular (multiplataforma). | Layout responsivo testado em 390 px e 1280 px |
| RNF11 | Desempenho | Listagens respondem em tempo constante mesmo com muitos registros. | Paginação (máx. 100 por página) + índices compostos |
| RNF12 | Observabilidade | Tempo de resposta de cada rota é medido. | Middleware `metricas`, header `X-Response-Time`, `GET /api/admin/metricas` |
| RNF13 | Manutenibilidade | Código organizado em camadas, com lint e testes automatizados. | rotas → validators → services; ESLint; `node:test` + Playwright |
| RNF14 | Documentação | A API é documentada de forma interativa. | Swagger em `/api/docs` |
