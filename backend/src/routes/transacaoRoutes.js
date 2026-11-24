import { Router } from 'express'
import { autenticar } from '../middlewares/authMiddleware.js'
import { atualizarTransacaoSchema, criarTransacaoSchema, idParamSchema } from '../validators/schemas.js'
import {
  atualizarTransacao,
  buscarTransacaoPorId,
  calcularDashboard,
  criarTransacao,
  excluirTransacaoSoftDelete,
  garantirPosseTransacao,
  listarTransacoesAtivas,
} from '../services/transacaoService.js'
import { listarAuditoriaTransacao } from '../services/auditoriaService.js'

export const transacaoRoutes = Router()
transacaoRoutes.use(autenticar)

// Express 5 encaminha erros de funções async direto para o errorHandler

/** GET /api/transacoes - transações ativas (sem as excluídas logicamente) */
transacaoRoutes.get('/transacoes', async (req, res) => {
  res.json(await listarTransacoesAtivas(req.usuario.id))
})

/** GET /api/transacoes/:id */
transacaoRoutes.get('/transacoes/:id', async (req, res) => {
  const id = idParamSchema.parse(req.params.id)
  res.json(await buscarTransacaoPorId(req.usuario.id, id))
})

/** POST /api/transacoes - criação com validação de schema, idempotência e auditoria */
transacaoRoutes.post('/transacoes', async (req, res) => {
  const dados = criarTransacaoSchema.parse(req.body ?? {})
  res.status(201).json(await criarTransacao(req.usuario.id, dados))
})

/** PUT /api/transacoes/:id - edição com diff registrado na auditoria */
transacaoRoutes.put('/transacoes/:id', async (req, res) => {
  const id = idParamSchema.parse(req.params.id)
  const dados = atualizarTransacaoSchema.parse(req.body ?? {})
  res.json(await atualizarTransacao(req.usuario.id, id, dados))
})

/** DELETE /api/transacoes/:id - Soft Delete (Regra de Ouro H1) */
transacaoRoutes.delete('/transacoes/:id', async (req, res) => {
  const id = idParamSchema.parse(req.params.id)
  res.json(await excluirTransacaoSoftDelete(req.usuario.id, id))
})

/** GET /api/transacoes/:id/auditoria - trilha completa, inclusive de transações excluídas */
transacaoRoutes.get('/transacoes/:id/auditoria', async (req, res) => {
  const id = idParamSchema.parse(req.params.id)
  await garantirPosseTransacao(req.usuario.id, id)
  res.json(await listarAuditoriaTransacao(id))
})

/** GET /api/dashboard - saldo consolidado calculado pela API */
transacaoRoutes.get('/dashboard', async (req, res) => {
  res.json(await calcularDashboard(req.usuario.id))
})
