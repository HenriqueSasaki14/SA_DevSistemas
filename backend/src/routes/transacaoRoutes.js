import { Router } from 'express'
import { autenticar } from '../middlewares/authMiddleware.js'
import {
  atualizarTransacaoSchema,
  criarTransacaoSchema,
  filtrosTransacaoSchema,
  idParamSchema,
} from '../validators/schemas.js'
import {
  atualizarTransacao,
  buscarTransacaoPorId,
  criarTransacao,
  excluirTransacaoSoftDelete,
  garantirPosseTransacao,
  listarTransacoes,
} from '../services/transacaoService.js'
import { listarAuditoriaTransacao } from '../services/auditoriaService.js'

// Montado em /api/transacoes. Express 5 encaminha erros de funções async para o errorHandler.
export const transacaoRoutes = Router()
transacaoRoutes.use(autenticar)

/** GET /api/transacoes?pagina&limite&tipo&busca&dataInicio&dataFim&valorMin&valorMax&ordenarPor&ordem */
transacaoRoutes.get('/', async (req, res) => {
  const filtros = filtrosTransacaoSchema.parse(req.query)
  res.json(await listarTransacoes(req.usuario.id, filtros))
})

/** GET /api/transacoes/:id */
transacaoRoutes.get('/:id', async (req, res) => {
  const id = idParamSchema.parse(req.params.id)
  res.json(await buscarTransacaoPorId(req.usuario.id, id))
})

/** POST /api/transacoes - criação com validação de schema, idempotência e auditoria */
transacaoRoutes.post('/', async (req, res) => {
  const dados = criarTransacaoSchema.parse(req.body ?? {})
  res.status(201).json(await criarTransacao(req.usuario.id, dados))
})

/** PUT /api/transacoes/:id - edição com diff registrado na auditoria */
transacaoRoutes.put('/:id', async (req, res) => {
  const id = idParamSchema.parse(req.params.id)
  const dados = atualizarTransacaoSchema.parse(req.body ?? {})
  res.json(await atualizarTransacao(req.usuario.id, id, dados))
})

/** DELETE /api/transacoes/:id - Soft Delete (Regra de Ouro H1) */
transacaoRoutes.delete('/:id', async (req, res) => {
  const id = idParamSchema.parse(req.params.id)
  res.json(await excluirTransacaoSoftDelete(req.usuario.id, id))
})

/** GET /api/transacoes/:id/auditoria - trilha completa, inclusive de transações excluídas */
transacaoRoutes.get('/:id/auditoria', async (req, res) => {
  const id = idParamSchema.parse(req.params.id)
  await garantirPosseTransacao(req.usuario.id, id)
  res.json(await listarAuditoriaTransacao(id))
})
