import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import { authRoutes } from './routes/authRoutes.js'
import { transacaoRoutes } from './routes/transacaoRoutes.js'
import { dashboardRoutes, relatorioRoutes } from './routes/relatorioRoutes.js'
import { adminRoutes } from './routes/adminRoutes.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { metricas } from './middlewares/metricas.js'
import { openapi } from './docs/openapi.js'

export const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '100kb' }))
app.use(metricas)

// Documentação interativa (Swagger / OpenAPI 3)
app.get('/api/docs.json', (req, res) => res.json(openapi))
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'SafeCash API' }))

// Verificação de saúde (usada pelo serviço de deploy)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api', authRoutes)
app.use('/api/transacoes', transacaoRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/relatorios', relatorioRoutes)
app.use('/api/admin', adminRoutes)

app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }))
app.use(errorHandler)
