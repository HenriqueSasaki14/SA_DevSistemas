import express from 'express'
import cors from 'cors'
import { authRoutes } from './routes/authRoutes.js'
import { transacaoRoutes } from './routes/transacaoRoutes.js'
import { errorHandler } from './middlewares/errorHandler.js'

export const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '100kb' }))

app.use('/api', authRoutes)
app.use('/api', transacaoRoutes)

app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }))
app.use(errorHandler)
