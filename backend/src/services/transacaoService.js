import crypto from 'crypto'
import { prisma } from '../lib/prisma.ts'
import { AppError } from '../errors/AppError.js'
import { formatarCentavosParaReal } from '../utils/moeda.js'
import { registrarAuditoria } from './auditoriaService.js'
import { montarPaginacao, paraPrisma } from '../utils/paginacao.js'
import { fimDoDiaExclusivo, inicioDoDia } from '../utils/datas.js'

/** Adiciona o valor formatado em R$ à transação devolvida pela API. */
function comValorFormatado(transacao) {
  return { ...transacao, valorFormatado: formatarCentavosParaReal(transacao.valorCentavos) }
}

/** Gera uma chave de idempotência quando o cliente não envia uma. */
function gerarChaveUnica() {
  return crypto.randomUUID()
}

/**
 * Cria uma transação (dados já validados pelo schema) com idempotência e auditoria atômica.
 * Uma mesma chaveUnica reenviada pelo mesmo usuário gera 409 em vez de um lançamento duplicado.
 */
export async function criarTransacao(usuarioId, { tipo, descricao, valorCentavos, dataTransacao, chaveUnica }) {
  const chave = chaveUnica ?? gerarChaveUnica()

  const existente = await prisma.transacao.findUnique({
    where: { usuario_chave_unica: { usuarioId, chaveUnica: chave } },
  })
  if (existente) {
    throw new AppError(
      'Lançamento duplicado detectado. Uma transação com esta chave única já foi cadastrada.',
      409,
      { transacaoExistente: comValorFormatado(existente) },
    )
  }

  try {
    const nova = await prisma.$transaction(async (tx) => {
      const transacao = await tx.transacao.create({
        data: {
          usuarioId,
          tipo,
          descricao,
          valorCentavos,
          dataTransacao: dataTransacao ?? new Date(),
          chaveUnica: chave,
        },
      })

      await registrarAuditoria(tx, {
        transacaoId: transacao.id,
        usuarioId,
        tipoAcao: 'CRIACAO',
        dadosAlterados: {
          tipo: transacao.tipo,
          descricao: transacao.descricao,
          valorCentavos: transacao.valorCentavos,
          valorFormatado: formatarCentavosParaReal(transacao.valorCentavos),
          dataTransacao: transacao.dataTransacao,
          chaveUnica: transacao.chaveUnica,
        },
      })

      return transacao
    })

    return comValorFormatado(nova)
  } catch (err) {
    // Duas requisições simultâneas com a mesma chave: a constraint do banco barra a segunda
    if (err.code === 'P2002') {
      throw new AppError('Lançamento duplicado detectado. Uma transação com esta chave única já foi cadastrada.', 409)
    }
    throw err
  }
}

/** Converte os filtros da query string em um `where` do Prisma (sempre só as ativas do usuário). */
export function montarFiltroTransacoes(usuarioId, { tipo, busca, dataInicio, dataFim, valorMin, valorMax }) {
  const where = { usuarioId, deletadoEm: null }

  if (tipo) where.tipo = tipo
  if (busca) where.descricao = { contains: busca, mode: 'insensitive' }

  if (dataInicio || dataFim) {
    where.dataTransacao = {}
    if (dataInicio) where.dataTransacao.gte = inicioDoDia(dataInicio)
    if (dataFim) where.dataTransacao.lt = fimDoDiaExclusivo(dataFim)
  }

  if (valorMin !== undefined || valorMax !== undefined) {
    where.valorCentavos = {}
    if (valorMin !== undefined) where.valorCentavos.gte = valorMin
    if (valorMax !== undefined) where.valorCentavos.lte = valorMax
  }

  return where
}

/**
 * Lista as transações ativas com filtros, busca, ordenação e paginação.
 * Excluídas logicamente nunca aparecem.
 */
export async function listarTransacoes(usuarioId, filtros) {
  const where = montarFiltroTransacoes(usuarioId, filtros)

  const [transacoes, total] = await Promise.all([
    prisma.transacao.findMany({
      where,
      orderBy: [{ [filtros.ordenarPor]: filtros.ordem }, { id: filtros.ordem }],
      ...paraPrisma(filtros),
    }),
    prisma.transacao.count({ where }),
  ])

  return { dados: transacoes.map(comValorFormatado), paginacao: montarPaginacao(filtros, total) }
}

/** Busca uma transação ativa do usuário ou lança 404. */
export async function buscarTransacaoPorId(usuarioId, id) {
  const transacao = await prisma.transacao.findFirst({
    where: { id, usuarioId, deletadoEm: null },
  })
  if (!transacao) throw new AppError('Transação não encontrada.', 404)
  return comValorFormatado(transacao)
}

/** Monta o diff { campo: { antes, depois } } apenas dos campos realmente alterados. */
function calcularDiff(atual, novosDados) {
  const diff = {}
  for (const [campo, novoValor] of Object.entries(novosDados)) {
    const valorAtual = atual[campo]
    const igual = novoValor instanceof Date
      ? novoValor.getTime() === new Date(valorAtual).getTime()
      : novoValor === valorAtual
    if (!igual) diff[campo] = { antes: valorAtual, depois: novoValor }
  }

  if (diff.valorCentavos) {
    diff.valorCentavos.antesFormatado = formatarCentavosParaReal(diff.valorCentavos.antes)
    diff.valorCentavos.depoisFormatado = formatarCentavosParaReal(diff.valorCentavos.depois)
  }
  return diff
}

/** Edita uma transação e grava o diff na auditoria, de forma atômica. */
export async function atualizarTransacao(usuarioId, id, dados) {
  const atual = await buscarTransacaoPorId(usuarioId, id)
  const diff = calcularDiff(atual, dados)

  if (Object.keys(diff).length === 0) return atual

  const dadosAlterados = Object.fromEntries(Object.entries(diff).map(([campo, { depois }]) => [campo, depois]))

  const atualizada = await prisma.$transaction(async (tx) => {
    const transacao = await tx.transacao.update({ where: { id: atual.id }, data: dadosAlterados })
    await registrarAuditoria(tx, { transacaoId: transacao.id, usuarioId, tipoAcao: 'EDICAO', dadosAlterados: diff })
    return transacao
  })

  return comValorFormatado(atualizada)
}

/**
 * Exclusão lógica (Regra de Ouro - H1): marca data e responsável, nunca apaga o registro.
 * O banco também bloqueia DELETE físico via trigger (ver migration inicial).
 */
export async function excluirTransacaoSoftDelete(usuarioId, id) {
  const transacao = await buscarTransacaoPorId(usuarioId, id)

  await prisma.$transaction(async (tx) => {
    await tx.transacao.update({
      where: { id: transacao.id },
      data: { deletadoEm: new Date(), deletadoPorId: usuarioId },
    })

    await registrarAuditoria(tx, {
      transacaoId: transacao.id,
      usuarioId,
      tipoAcao: 'EXCLUSAO',
      dadosAlterados: {
        motivo: 'Exclusão lógica (Soft Delete)',
        estadoNoMomentoDaExclusao: {
          tipo: transacao.tipo,
          descricao: transacao.descricao,
          valorCentavos: transacao.valorCentavos,
          dataTransacao: transacao.dataTransacao,
        },
      },
    })
  })

  return { mensagem: 'Transação excluída com sucesso (Soft Delete com auditoria).' }
}

/**
 * Saldo consolidado calculado no backend: entradas ativas menos saídas ativas.
 * O frontend apenas exibe estes valores.
 */
export async function calcularDashboard(usuarioId) {
  const ativas = { usuarioId, deletadoEm: null }

  const [entradas, saidas, totalTransacoesAtivas] = await Promise.all([
    prisma.transacao.aggregate({ where: { ...ativas, tipo: 'ENTRADA' }, _sum: { valorCentavos: true } }),
    prisma.transacao.aggregate({ where: { ...ativas, tipo: 'SAIDA' }, _sum: { valorCentavos: true } }),
    prisma.transacao.count({ where: ativas }),
  ])

  const receitasCentavos = entradas._sum.valorCentavos ?? 0
  const despesasCentavos = saidas._sum.valorCentavos ?? 0
  const saldoTotalCentavos = receitasCentavos - despesasCentavos

  return {
    saldoTotalCentavos,
    receitasCentavos,
    despesasCentavos,
    totalTransacoesAtivas,
    saldoTotal: formatarCentavosParaReal(saldoTotalCentavos),
    receitas: formatarCentavosParaReal(receitasCentavos),
    despesas: formatarCentavosParaReal(despesasCentavos),
  }
}

/**
 * Garante que a transação pertence ao usuário, incluindo as excluídas logicamente
 * (a auditoria de um registro excluído continua consultável - rastreabilidade).
 */
export async function garantirPosseTransacao(usuarioId, id) {
  const existe = await prisma.transacao.count({ where: { id, usuarioId } })
  if (!existe) throw new AppError('Transação não encontrada.', 404)
}
