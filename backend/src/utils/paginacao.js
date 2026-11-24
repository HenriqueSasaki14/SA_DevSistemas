/**
 * Converte pagina/limite em skip/take do Prisma.
 * @param {{ pagina: number, limite: number }} params
 */
export function paraPrisma({ pagina, limite }) {
  return { skip: (pagina - 1) * limite, take: limite }
}

/**
 * Monta o bloco de paginação devolvido pela API.
 * @returns {{ pagina: number, limite: number, total: number, totalPaginas: number }}
 */
export function montarPaginacao({ pagina, limite }, total) {
  return { pagina, limite, total, totalPaginas: Math.max(1, Math.ceil(total / limite)) }
}
