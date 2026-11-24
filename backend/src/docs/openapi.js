/**
 * Especificação OpenAPI 3 da SafeCash API.
 * Interface interativa em /api/docs e JSON em /api/docs.json.
 */

const json = (schema) => ({ 'application/json': { schema } })
const ref = (nome) => ({ $ref: `#/components/schemas/${nome}` })
const resposta = (description, schema) => (schema ? { description, content: json(schema) } : { description })

const erros = {
  400: { $ref: '#/components/responses/Invalido' },
  401: { $ref: '#/components/responses/NaoAutenticado' },
}
const erros404 = { ...erros, 404: { $ref: '#/components/responses/NaoEncontrado' } }

const paramId = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }
const paramPagina = { name: 'pagina', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } }
const paramLimite = { name: 'limite', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
const paramData = (name, required = false) => ({
  name,
  in: 'query',
  required,
  schema: { type: 'string', format: 'date', example: '2026-11-01' },
})

const paginado = (item) => ({
  type: 'object',
  properties: { dados: { type: 'array', items: ref(item) }, paginacao: ref('Paginacao') },
})

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'SafeCash API – Tesouraria Integrada',
    version: '1.0.0',
    description:
      'Core Engine financeiro: CRUD de transações com validação de schema, idempotência, ' +
      'Soft Delete (Regra de Ouro H1), auditoria imutável, relatórios e RBAC.\n\n' +
      'Valores monetários trafegam sempre em **centavos inteiros** (R$ 2.000,00 = `200000`).\n\n' +
      'Para testar: faça login em `POST /api/auth/login`, copie o `token` e clique em **Authorize**.',
  },
  servers: [{ url: '/', description: 'Servidor atual' }],
  tags: [
    { name: 'Autenticação' },
    { name: 'Transações', description: 'CRUD inteligente com auditoria' },
    { name: 'Dashboard e Relatórios' },
    { name: 'Administração', description: 'Somente perfil ADMIN (RBAC)' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    responses: {
      Invalido: resposta('Dados inválidos', ref('Erro')),
      NaoAutenticado: resposta('Token ausente, inválido ou expirado', ref('Erro')),
      SemPermissao: resposta('Perfil sem permissão (RBAC)', ref('Erro')),
      NaoEncontrado: resposta('Recurso não encontrado', ref('Erro')),
      Conflito: resposta('Registro duplicado', ref('Erro')),
    },
    schemas: {
      Erro: {
        type: 'object',
        properties: {
          erro: { type: 'string', example: 'O valor da transação deve ser maior que zero.' },
          erros: {
            type: 'array',
            items: { type: 'object', properties: { campo: { type: 'string' }, mensagem: { type: 'string' } } },
          },
        },
      },
      Paginacao: {
        type: 'object',
        properties: {
          pagina: { type: 'integer', example: 1 },
          limite: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 37 },
          totalPaginas: { type: 'integer', example: 4 },
        },
      },
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          nome: { type: 'string' },
          email: { type: 'string' },
          perfil: { type: 'string', enum: ['ADMIN', 'USUARIO'] },
          criadoEm: { type: 'string', format: 'date-time' },
        },
      },
      Sessao: {
        type: 'object',
        properties: { token: { type: 'string' }, usuario: ref('Usuario') },
      },
      NovaTransacao: {
        type: 'object',
        required: ['tipo', 'descricao', 'valorCentavos'],
        additionalProperties: false,
        properties: {
          tipo: { type: 'string', enum: ['ENTRADA', 'SAIDA'] },
          descricao: { type: 'string', minLength: 1, maxLength: 255, example: 'Pagamento de Aluguel' },
          valorCentavos: { type: 'integer', minimum: 1, maximum: 2147483647, example: 200000 },
          dataTransacao: { type: 'string', example: '2026-11-22', description: 'AAAA-MM-DD ou ISO 8601' },
          chaveUnica: { type: 'string', maxLength: 100, example: 'TX-1763850000-ALUGUEL' },
        },
      },
      EdicaoTransacao: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          tipo: { type: 'string', enum: ['ENTRADA', 'SAIDA'] },
          descricao: { type: 'string', minLength: 1, maxLength: 255 },
          valorCentavos: { type: 'integer', minimum: 1, maximum: 2147483647 },
          dataTransacao: { type: 'string', example: '2026-11-22' },
        },
      },
      Transacao: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          usuarioId: { type: 'integer' },
          tipo: { type: 'string', enum: ['ENTRADA', 'SAIDA'] },
          descricao: { type: 'string' },
          valorCentavos: { type: 'integer', example: 200000 },
          valorFormatado: { type: 'string', example: 'R$ 2.000,00' },
          dataTransacao: { type: 'string', format: 'date-time' },
          chaveUnica: { type: 'string' },
          criadoEm: { type: 'string', format: 'date-time' },
          atualizadoEm: { type: 'string', format: 'date-time' },
          deletadoEm: { type: 'string', format: 'date-time', nullable: true },
          deletadoPorId: { type: 'integer', nullable: true },
        },
      },
      Auditoria: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          transacaoId: { type: 'integer' },
          usuarioId: { type: 'integer' },
          tipoAcao: { type: 'string', enum: ['CRIACAO', 'EDICAO', 'EXCLUSAO'] },
          dataAcao: { type: 'string', format: 'date-time' },
          dadosAlterados: { type: 'object', example: { valorCentavos: { antes: 200000, depois: 210000 } } },
          usuario: { type: 'object', properties: { id: { type: 'integer' }, nome: { type: 'string' }, email: { type: 'string' } } },
        },
      },
      Dashboard: {
        type: 'object',
        properties: {
          saldoTotalCentavos: { type: 'integer', example: 300000 },
          receitasCentavos: { type: 'integer', example: 500000 },
          despesasCentavos: { type: 'integer', example: 200000 },
          totalTransacoesAtivas: { type: 'integer', example: 5 },
          saldoTotal: { type: 'string', example: 'R$ 3.000,00' },
          receitas: { type: 'string', example: 'R$ 5.000,00' },
          despesas: { type: 'string', example: 'R$ 2.000,00' },
        },
      },
      Mes: {
        type: 'object',
        properties: {
          mes: { type: 'string', example: '2026-11' },
          entradasCentavos: { type: 'integer' },
          saidasCentavos: { type: 'integer' },
          saldoCentavos: { type: 'integer' },
          entradas: { type: 'string' },
          saidas: { type: 'string' },
          saldo: { type: 'string' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Autenticação'],
        summary: 'Cadastra usuário (o primeiro usuário do sistema vira ADMIN)',
        security: [],
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['nome', 'email', 'senha'],
            properties: {
              nome: { type: 'string', minLength: 3, example: 'Empresa Alfa' },
              email: { type: 'string', format: 'email', example: 'contato@empresaalfa.com' },
              senha: { type: 'string', minLength: 6, example: 'senhaSegura123' },
              cpf: { type: 'string', example: '123.456.789-00' },
              telefone: { type: 'string', example: '(48) 99999-9999' },
            },
          }),
        },
        responses: {
          201: resposta('Usuário criado', ref('Sessao')),
          400: { $ref: '#/components/responses/Invalido' },
          409: { $ref: '#/components/responses/Conflito' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Autenticação'],
        summary: 'Autentica e retorna o JWT',
        security: [],
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['email', 'senha'],
            properties: {
              email: { type: 'string', example: 'contato@empresaalfa.com' },
              senha: { type: 'string', example: 'senhaSegura123' },
            },
          }),
        },
        responses: { 200: resposta('Autenticado', ref('Sessao')), ...erros },
      },
    },
    '/api/me': {
      get: {
        tags: ['Autenticação'],
        summary: 'Dados do usuário autenticado',
        responses: { 200: resposta('Usuário', ref('Usuario')), 401: erros[401] },
      },
    },
    '/api/transacoes': {
      get: {
        tags: ['Transações'],
        summary: 'Lista transações ativas com filtros, busca, ordenação e paginação',
        parameters: [
          paramPagina,
          paramLimite,
          { name: 'tipo', in: 'query', schema: { type: 'string', enum: ['ENTRADA', 'SAIDA'] } },
          { name: 'busca', in: 'query', description: 'Busca na descrição (sem diferenciar maiúsculas)', schema: { type: 'string' } },
          paramData('dataInicio'),
          paramData('dataFim'),
          { name: 'valorMin', in: 'query', description: 'Em centavos', schema: { type: 'integer', minimum: 0 } },
          { name: 'valorMax', in: 'query', description: 'Em centavos', schema: { type: 'integer', minimum: 0 } },
          {
            name: 'ordenarPor',
            in: 'query',
            schema: { type: 'string', enum: ['dataTransacao', 'valorCentavos', 'descricao', 'criadoEm'], default: 'dataTransacao' },
          },
          { name: 'ordem', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: { 200: resposta('Página de transações', paginado('Transacao')), ...erros },
      },
      post: {
        tags: ['Transações'],
        summary: 'Cria transação (idempotente pela chaveUnica) e registra auditoria CRIACAO',
        requestBody: { required: true, content: json(ref('NovaTransacao')) },
        responses: {
          201: resposta('Criada', ref('Transacao')),
          ...erros,
          409: { $ref: '#/components/responses/Conflito' },
        },
      },
    },
    '/api/transacoes/{id}': {
      parameters: [paramId],
      get: {
        tags: ['Transações'],
        summary: 'Detalhe de uma transação ativa',
        responses: { 200: resposta('Transação', ref('Transacao')), ...erros404 },
      },
      put: {
        tags: ['Transações'],
        summary: 'Edita a transação e registra o diff (auditoria EDICAO)',
        requestBody: { required: true, content: json(ref('EdicaoTransacao')) },
        responses: { 200: resposta('Atualizada', ref('Transacao')), ...erros404 },
      },
      delete: {
        tags: ['Transações'],
        summary: 'Soft Delete (Regra de Ouro H1): marca data e responsável, nunca apaga',
        responses: {
          200: resposta('Excluída logicamente', { type: 'object', properties: { mensagem: { type: 'string' } } }),
          ...erros404,
        },
      },
    },
    '/api/transacoes/{id}/auditoria': {
      parameters: [paramId],
      get: {
        tags: ['Transações'],
        summary: 'Trilha de auditoria da transação (inclusive excluídas)',
        responses: { 200: resposta('Registros', { type: 'array', items: ref('Auditoria') }), ...erros404 },
      },
    },
    '/api/dashboard': {
      get: {
        tags: ['Dashboard e Relatórios'],
        summary: 'Saldo, receitas e despesas consolidados pela API',
        responses: { 200: resposta('Totais', ref('Dashboard')), 401: erros[401] },
      },
    },
    '/api/relatorios/mensal': {
      get: {
        tags: ['Dashboard e Relatórios'],
        summary: 'Entradas x saídas por mês (inclui meses sem movimento)',
        parameters: [{ name: 'meses', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 24, default: 6 } }],
        responses: { 200: resposta('Meses', { type: 'array', items: ref('Mes') }), ...erros },
      },
    },
    '/api/relatorios/extrato': {
      get: {
        tags: ['Dashboard e Relatórios'],
        summary: 'Extrato do período com saldo anterior e saldo acumulado (JSON ou CSV)',
        parameters: [
          paramData('dataInicio', true),
          paramData('dataFim', true),
          { name: 'formato', in: 'query', schema: { type: 'string', enum: ['json', 'csv'], default: 'json' } },
        ],
        responses: {
          200: {
            description: 'Extrato',
            content: {
              'application/json': { schema: { type: 'object' } },
              'text/csv': { schema: { type: 'string' } },
            },
          },
          ...erros,
        },
      },
    },
    '/api/admin/dashboard': {
      get: {
        tags: ['Administração'],
        summary: 'Totais de toda a empresa',
        responses: { 200: resposta('Totais globais', { type: 'object' }), 401: erros[401], 403: { $ref: '#/components/responses/SemPermissao' } },
      },
    },
    '/api/admin/usuarios': {
      get: {
        tags: ['Administração'],
        summary: 'Lista usuários (paginado, com busca por nome/e-mail)',
        parameters: [paramPagina, paramLimite, { name: 'busca', in: 'query', schema: { type: 'string' } }],
        responses: { 200: resposta('Página de usuários', paginado('Usuario')), ...erros, 403: { $ref: '#/components/responses/SemPermissao' } },
      },
    },
    '/api/admin/usuarios/{id}/perfil': {
      parameters: [paramId],
      patch: {
        tags: ['Administração'],
        summary: 'Altera o perfil de um usuário (não é possível rebaixar a si mesmo)',
        requestBody: {
          required: true,
          content: json({ type: 'object', required: ['perfil'], properties: { perfil: { type: 'string', enum: ['ADMIN', 'USUARIO'] } } }),
        },
        responses: { 200: resposta('Usuário atualizado', ref('Usuario')), ...erros404, 403: { $ref: '#/components/responses/SemPermissao' } },
      },
    },
    '/api/admin/auditoria': {
      get: {
        tags: ['Administração'],
        summary: 'Trilha de auditoria global (paginada)',
        parameters: [
          paramPagina,
          paramLimite,
          { name: 'tipoAcao', in: 'query', schema: { type: 'string', enum: ['CRIACAO', 'EDICAO', 'EXCLUSAO'] } },
          { name: 'usuarioId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: resposta('Página de auditoria', paginado('Auditoria')), ...erros, 403: { $ref: '#/components/responses/SemPermissao' } },
      },
    },
    '/api/admin/metricas': {
      get: {
        tags: ['Administração'],
        summary: 'Métricas de desempenho por rota (chamadas, tempo médio/máximo, erros 5xx)',
        responses: { 200: resposta('Métricas', { type: 'object' }), 401: erros[401], 403: { $ref: '#/components/responses/SemPermissao' } },
      },
    },
    '/api/health': {
      get: { tags: ['Administração'], summary: 'Verificação de saúde', security: [], responses: { 200: resposta('OK') } },
    },
  },
}
