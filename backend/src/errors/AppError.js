/**
 * Erro de negócio com status HTTP associado.
 * Lançado pelos serviços e convertido em resposta pelo errorHandler.
 */
export class AppError extends Error {
  constructor(mensagem, statusCode = 400, extras = {}) {
    super(mensagem)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.extras = extras
  }
}
