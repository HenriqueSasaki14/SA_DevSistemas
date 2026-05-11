require('dotenv').config()
const express = require('express')
const cors = require('cors')

// ─────────────────────────────────────────────────────────────────
// MOCK (desenvolvimento frontend) — substituir pelas linhas abaixo
// quando o backend estiver pronto:
//
//   const authRoutes       = require('./src/backend/routes/auth')
//   const meRoutes         = require('./src/backend/routes/me')
//   const dashboardRoutes  = require('./src/backend/routes/dashboard')
//   const transacoesRoutes = require('./src/backend/routes/transacoes')
// ─────────────────────────────────────────────────────────────────
const routes = require('./src/backend/routes') // mock atual

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// Mock — trocar pelo bloco comentado abaixo após integrar o banco:
app.use('/api', routes)

// app.use('/api/auth',       authRoutes)
// app.use('/api/me',         meRoutes)
// app.use('/api/dashboard',  dashboardRoutes)
// app.use('/api/transacoes', transacoesRoutes)

app.listen(PORT, () => {
  console.log(`SafeCash API rodando em http://localhost:${PORT}`)
})
