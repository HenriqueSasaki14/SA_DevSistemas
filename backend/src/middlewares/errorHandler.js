import { ZodError } from 'zod'
import { AppError } from '../errors/AppError.js'

/**
 * Tratamento centralizado de erros.
 * Nunca devolve detalhes internos (stack, SQL, Prisma) para o cliente.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const erros = err.issues.map((issue) => ({ campo: issue.path.join('.') || null, mensagem: issue.message }))
    return res.status(400).json({ erro: erros[0].mensagem, erros })
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ erro: err.message, ...err.extras })
  }

  // JSON malformado no corpo da requisição
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'Corpo da requisição não é um JSON válido.' })
  }

  // Violação de unicidade (ex: corrida entre duas requisições com a mesma chave)
  if (err.code === 'P2002') {
    return res.status(409).json({ erro: 'Registro duplicado.' })
  }

  console.error('[SafeCash API] Erro não tratado:', err)
  return res.status(500).json({ erro: 'Erro interno do servidor.' })
}
