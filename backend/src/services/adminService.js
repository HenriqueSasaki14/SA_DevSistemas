import { prisma } from '../lib/prisma.ts'
import { AppError } from '../errors/AppError.js'
import { formatarCentavosParaReal } from '../utils/moeda.js'
import { montarPaginacao, paraPrisma } from '../utils/paginacao.js'

const camposPublicosUsuario = { id: true, nome: true, email: true, perfil: true, criadoEm: true }

/** Lista os usuários com a quantidade de transações ativas de cada um. */
export async function listarUsuarios({ busca, ...paginacao }) {
  const where = busca
    ? { OR: [{ nome: { contains: busca, mode: 'insensitive' } }, { email: { contains: busca, mode: 'insensitive' } }] }
    : {}

  const [usuarios, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      select: {
        ...camposPublicosUsuario,
        _count: { select: { transacoes: { where: { deletadoEm: null } } } },
      },
      orderBy: { id: 'asc' },
      ...paraPrisma(paginacao),
    }),
    prisma.usuario.count({ where }),
  ])

  const dados = usuarios.map(({ _count, ...u }) => ({ ...u, transacoesAtivas: _count.transacoes }))
  return { dados, paginacao: montarPaginacao(paginacao, total) }
}

/** Promove ou rebaixa um usuário. Um admin não pode rebaixar a si mesmo (o sistema nunca fica sem admin). */
export async function alterarPerfil(adminId, usuarioId, perfil) {
  if (adminId === usuarioId && perfil !== 'ADMIN') {
    throw new AppError('Você não pode remover o seu próprio perfil de administrador.', 400)
  }

  const existe = await prisma.usuario.count({ where: { id: usuarioId } })
  if (!existe) throw new AppError('Usuário não encontrado.', 404)

  return prisma.usuario.update({ where: { id: usuarioId }, data: { perfil }, select: camposPublicosUsuario })
}

/** Trilha de auditoria de toda a empresa, paginada e filtrável. */
export async function auditoriaGlobal({ tipoAcao, usuarioId, ...paginacao }) {
  const where = {}
  if (tipoAcao) where.tipoAcao = tipoAcao
  if (usuarioId) where.usuarioId = usuarioId

  const [registros, total] = await Promise.all([
    prisma.auditoria.findMany({
      where,
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
        transacao: { select: { id: true, descricao: true } },
      },
      orderBy: [{ dataAcao: 'desc' }, { id: 'desc' }],
      ...paraPrisma(paginacao),
    }),
    prisma.auditoria.count({ where }),
  ])

  return { dados: registros, paginacao: montarPaginacao(paginacao, total) }
}

/** Visão consolidada de todos os usuários (somente transações ativas). */
export async function dashboardGlobal() {
  const ativas = { deletadoEm: null }
  const [entradas, saidas, transacoesAtivas, transacoesExcluidas, usuarios] = await Promise.all([
    prisma.transacao.aggregate({ where: { ...ativas, tipo: 'ENTRADA' }, _sum: { valorCentavos: true } }),
    prisma.transacao.aggregate({ where: { ...ativas, tipo: 'SAIDA' }, _sum: { valorCentavos: true } }),
    prisma.transacao.count({ where: ativas }),
    prisma.transacao.count({ where: { deletadoEm: { not: null } } }),
    prisma.usuario.count(),
  ])

  const receitasCentavos = entradas._sum.valorCentavos ?? 0
  const despesasCentavos = saidas._sum.valorCentavos ?? 0
  return {
    usuarios,
    transacoesAtivas,
    transacoesExcluidas,
    receitasCentavos,
    despesasCentavos,
    saldoTotalCentavos: receitasCentavos - despesasCentavos,
    receitas: formatarCentavosParaReal(receitasCentavos),
    despesas: formatarCentavosParaReal(despesasCentavos),
    saldoTotal: formatarCentavosParaReal(receitasCentavos - despesasCentavos),
  }
}
