/**
 * Serviço de Auditoria do SafeCash
 * Registra a rastreabilidade de criação, edição e exclusão de transações.
 * A tabela Auditoria é append-only: o banco recusa UPDATE e DELETE (trigger).
 */
import { prisma } from '../lib/prisma.ts'

/**
 * Registra uma entrada de auditoria. Recebe o cliente da transação atômica (tx),
 * para que a alteração e o seu registro sejam gravados juntos ou não sejam gravados.
 * @param {object} tx - Cliente Prisma dentro de $transaction
 * @param {{ transacaoId: number, usuarioId: number, tipoAcao: 'CRIACAO'|'EDICAO'|'EXCLUSAO', dadosAlterados: object }} dados
 */
export function registrarAuditoria(tx, { transacaoId, usuarioId, tipoAcao, dadosAlterados }) {
  return tx.auditoria.create({
    data: { transacaoId, usuarioId, tipoAcao, dadosAlterados },
  })
}

/** Trilha de auditoria de uma transação, da ação mais recente para a mais antiga. */
export function listarAuditoriaTransacao(transacaoId) {
  return prisma.auditoria.findMany({
    where: { transacaoId },
    include: { usuario: { select: { id: true, nome: true, email: true } } },
    orderBy: [{ dataAcao: 'desc' }, { id: 'desc' }],
  })
}
