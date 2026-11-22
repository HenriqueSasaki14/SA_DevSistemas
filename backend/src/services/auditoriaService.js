/**
 * Serviço de Auditoria do SafeCash
 * Registra a rastreabilidade completa de criação, edição e exclusão de transações.
 */

/**
 * Registra uma entrada na tabela Auditoria
 * @param {object} params
 * @param {object} params.prismaClient - Instância do Prisma (ou transação tx)
 * @param {number} params.transacaoId - ID da transação afetada
 * @param {number} params.usuarioId - ID do usuário que executou a ação
 * @param {'CRIACAO' | 'EDICAO' | 'EXCLUSAO'} params.tipoAcao - Tipo da ação executada
 * @param {object} params.dadosAlterados - Snapshot ou diff dos dados alterados
 */
export async function registrarAuditoria({ prismaClient, transacaoId, usuarioId, tipoAcao, dadosAlterados }) {
  if (!transacaoId || !usuarioId || !tipoAcao) {
    throw new Error('Parâmetros obrigatórios para auditoria ausentes.')
  }

  return await prismaClient.auditoria.create({
    data: {
      transacaoId,
      usuarioId,
      tipoAcao,
      dataAcao: new Date(),
      dadosAlterados: typeof dadosAlterados === 'string' ? JSON.parse(dadosAlterados) : dadosAlterados,
    },
  })
}

/**
 * Consulta a trilha de auditoria de uma transação específica
 * @param {object} params
 * @param {object} params.prismaClient
 * @param {number} params.transacaoId
 */
export async function listarAuditoriaTransacao({ prismaClient, transacaoId }) {
  return await prismaClient.auditoria.findMany({
    where: { transacaoId: Number(transacaoId) },
    include: {
      usuario: {
        select: { id: true, nome: true, email: true },
      },
    },
    orderBy: { dataAcao: 'desc' },
  })
}
