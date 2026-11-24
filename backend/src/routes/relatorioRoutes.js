import { Router } from 'express'
import { autenticar } from '../middlewares/authMiddleware.js'
import { extratoSchema, relatorioMensalSchema } from '../validators/schemas.js'
import { calcularDashboard } from '../services/transacaoService.js'
import { extrato, relatorioMensal } from '../services/relatorioService.js'

export const dashboardRoutes = Router()
dashboardRoutes.use(autenticar)

/** GET /api/dashboard - saldo consolidado calculado pela API */
dashboardRoutes.get('/', async (req, res) => {
  res.json(await calcularDashboard(req.usuario.id))
})

export const relatorioRoutes = Router()
relatorioRoutes.use(autenticar)

/** GET /api/relatorios/mensal?meses=6 - entradas x saídas por mês (alimenta o gráfico) */
relatorioRoutes.get('/mensal', async (req, res) => {
  const params = relatorioMensalSchema.parse(req.query)
  res.json(await relatorioMensal(req.usuario.id, params))
})

/** GET /api/relatorios/extrato?dataInicio&dataFim&formato=json|csv - extrato com saldo acumulado */
relatorioRoutes.get('/extrato', async (req, res) => {
  const params = extratoSchema.parse(req.query)
  const resultado = await extrato(req.usuario.id, params)

  if (params.formato === 'csv') {
    res.type('text/csv; charset=utf-8')
    res.attachment(`extrato-${params.dataInicio}-a-${params.dataFim}.csv`)
    return res.send(resultado)
  }
  res.json(resultado)
})
