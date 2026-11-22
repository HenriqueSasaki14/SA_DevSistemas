import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.ts'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET não definido no arquivo .env')
  process.exit(1)
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

/**
 * Gera um token JWT com base nos dados do usuário
 * @param {{ id: number, email: string }} usuario 
 * @returns {string} token
 */
export function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

/**
 * Middleware para validar o token JWT nas rotas protegidas
 */
export async function autenticar(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const [tipo, token] = authHeader.split(' ')

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Token não enviado. Faça login para continuar.' })
  }

  let decoded
  try {
    decoded = jwt.verify(token, JWT_SECRET)
  } catch (err) {
    const mensagem =
      err.name === 'TokenExpiredError'
        ? 'Sessão expirada. Faça login novamente.'
        : 'Token de autenticação inválido.'
    return res.status(401).json({ erro: mensagem })
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { id: true, nome: true, email: true, criadoEm: true },
    })

    if (!usuario) {
      return res.status(401).json({ erro: 'Usuário não encontrado ou inativo.' })
    }

    req.usuario = usuario
    next()
  } catch (err) {
    return res.status(500).json({ erro: 'Falha na autenticação do usuário.', detalhe: err.message })
  }
}
