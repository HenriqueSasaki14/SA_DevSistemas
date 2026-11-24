import { Router } from 'express'
import { autenticar } from '../middlewares/authMiddleware.js'
import { loginSchema, registroSchema } from '../validators/schemas.js'
import { autenticarUsuario, registrarUsuario } from '../services/authService.js'

export const authRoutes = Router()

/** POST /api/auth/register - cadastro com senha criptografada (bcrypt) */
authRoutes.post('/auth/register', async (req, res) => {
  const dados = registroSchema.parse(req.body ?? {})
  res.status(201).json(await registrarUsuario(dados))
})

/** POST /api/auth/login - autenticação e emissão do JWT */
authRoutes.post('/auth/login', async (req, res) => {
  const dados = loginSchema.parse(req.body ?? {})
  res.json(await autenticarUsuario(dados))
})

/** GET /api/me - dados da sessão autenticada */
authRoutes.get('/me', autenticar, (req, res) => {
  res.json(req.usuario)
})
