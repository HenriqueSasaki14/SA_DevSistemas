import crypto from 'crypto'
import { registrarAuditoria } from './auditoriaService.js'

/**
 * Formata centavos inteiros para string monetária em Real (ex: 200000 -> "R$ 2.000,00")
 * @param {number} centavos 
 * @returns {string}
 */
export function formatarCentavosParaReal(centavos) {
  const valor = (centavos || 0) / 100
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Valida e converte valor monetário para centavos inteiros positivos.
 * Garante a regra: "Cada transação terá um valor positivo guardado em centavos inteiros: R$ 2.000,00 será registrado como 200000"
 * e "impedir valores negativos em campos de valor absoluto".
 * 
 * @param {any} valor - Pode vir como `valorCentavos` (inteiro) ou `valor` (ex: "2000.00" ou 2000)
 * @returns {number} centavos inteiros estritamente positivos
 */
export function validarEConverterCentavos(valorCentavos, valorEmReais) {
  let centavos

  if (valorCentavos !== undefined && valorCentavos !== null && valorCentavos !== '') {
    const parsed = Number(valorCentavos)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error('O valor em centavos deve ser um número inteiro estritamente positivo (maior que zero).')
    }
    centavos = parsed
  } else if (valorEmReais !== undefined && valorEmReais !== null && valorEmReais !== '') {
    const parsed = Number(valorEmReais)
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error('O valor da transação deve ser positivo (maior que zero). Valores negativos não são permitidos.')
    }
    centavos = Math.round(parsed * 100)
  } else {
    throw new Error('O valor da transação é obrigatório.')
  }

  if (centavos <= 0) {
    throw new Error('O valor da transação deve ser estritamente positivo.')
  }

  return centavos
}

/**
 * Valida o tipo de transação (apenas ENTRADA ou SAIDA)
 * @param {string} tipo 
 * @returns {'ENTRADA' | 'SAIDA'}
 */
export function validarTipoTransacao(tipo) {
  if (!tipo) throw new Error('O tipo de transação é obrigatório.')
  const normalizado = String(tipo).trim().toUpperCase()
  if (normalizado !== 'ENTRADA' && normalizado !== 'SAIDA') {
    throw new Error('Tipo de transação inválido. Deve ser ENTRADA ou SAIDA.')
  }
  return normalizado
}

/**
 * Gera uma chave única padrão caso não seja informada pelo cliente
 */
export function gerarChaveUnica(usuarioId, tipo, valorCentavos, dataTransacao, descricao) {
  const base = `${usuarioId}-${tipo}-${valorCentavos}-${dataTransacao}-${descricao || ''}-${Date.now()}`
  return crypto.createHash('sha256').update(base).digest('hex').substring(0, 32)
}

/**
 * Criação de transação com verificação de idempotência (chave única) e registro de auditoria
 */
export async function criarTransacao({ prisma, usuarioId, tipo, descricao, valorCentavos, valor, dataTransacao, chaveUnica }) {
  const tipoValido = validarTipoTransacao(tipo)
  const centavosValidos = validarEConverterCentavos(valorCentavos, valor)

  if (!descricao || String(descricao).trim().length === 0) {
    throw new Error('A descrição da transação é obrigatória.')
  }

  const dataValida = dataTransacao ? new Date(dataTransacao) : new Date()
  if (isNaN(dataValida.getTime())) {
    throw new Error('Data da transação inválida.')
  }

  const chave = chaveUnica && String(chaveUnica).trim().length > 0 
    ? String(chaveUnica).trim() 
    : gerarChaveUnica(usuarioId, tipoValido, centavosValidos, dataValida.toISOString(), descricao)

  // Validação de Duplicidade / Idempotência:
  // "Uma chave única por usuário evitará lançamentos duplicados quando o mesmo cadastro for reenviado."
  const existente = await prisma.transacao.findFirst({
    where: {
      usuarioId,
      chaveUnica: chave,
    },
  })

  if (existente) {
    const erroDuplicidade = new Error('Lançamento duplicado detectado. Uma transação com esta chave única já foi cadastrada.')
    erroDuplicidade.statusCode = 409
    erroDuplicidade.transacaoExistente = existente
    throw erroDuplicidade
  }

  // Executa criação e auditoria dentro de transação atômica
  const novaTransacao = await prisma.$transaction(async (tx) => {
    const t = await tx.transacao.create({
      data: {
        usuarioId,
        tipo: tipoValido,
        descricao: String(descricao).trim(),
        valorCentavos: centavosValidos,
        dataTransacao: dataValida,
        chaveUnica: chave,
      },
    })

    await registrarAuditoria({
      prismaClient: tx,
      transacaoId: t.id,
      usuarioId,
      tipoAcao: 'CRIACAO',
      dadosAlterados: {
        tipo: t.tipo,
        descricao: t.descricao,
        valorCentavos: t.valorCentavos,
        valorFormatado: formatarCentavosParaReal(t.valorCentavos),
        dataTransacao: t.dataTransacao,
        chaveUnica: t.chaveUnica,
      },
    })

    return t
  })

  return {
    ...novaTransacao,
    valorFormatado: formatarCentavosParaReal(novaTransacao.valorCentavos),
  }
}

/**
 * Listagem comum: não traz transações excluídas logicamente
 */
export async function listarTransacoesAtivas({ prisma, usuarioId }) {
  const transacoes = await prisma.transacao.findMany({
    where: {
      usuarioId,
      deletadoEm: null, // Soft Delete respeitado
    },
    orderBy: {
      dataTransacao: 'desc',
    },
  })

  return transacoes.map((t) => ({
    ...t,
    valorFormatado: formatarCentavosParaReal(t.valorCentavos),
  }))
}

/**
 * Busca detalhes de uma transação ativa
 */
export async function buscarTransacaoPorId({ prisma, usuarioId, id }) {
  const transacao = await prisma.transacao.findFirst({
    where: {
      id: Number(id),
      usuarioId,
      deletadoEm: null,
    },
  })

  if (!transacao) {
    const err = new Error('Transação não encontrada.')
    err.statusCode = 404
    throw err
  }

  return {
    ...transacao,
    valorFormatado: formatarCentavosParaReal(transacao.valorCentavos),
  }
}

/**
 * Edição de transação com registro de auditoria
 */
export async function atualizarTransacao({ prisma, usuarioId, id, dados }) {
  const transacaoAtual = await buscarTransacaoPorId({ prisma, usuarioId, id })

  const updateData = {}
  const diff = {}

  if (dados.tipo !== undefined) {
    const tipoValido = validarTipoTransacao(dados.tipo)
    if (tipoValido !== transacaoAtual.tipo) {
      updateData.tipo = tipoValido
      diff.tipo = { antes: transacaoAtual.tipo, depois: tipoValido }
    }
  }

  if (dados.descricao !== undefined) {
    const descTrim = String(dados.descricao).trim()
    if (!descTrim) throw new Error('A descrição não pode ser vazia.')
    if (descTrim !== transacaoAtual.descricao) {
      updateData.descricao = descTrim
      diff.descricao = { antes: transacaoAtual.descricao, depois: descTrim }
    }
  }

  if (dados.valorCentavos !== undefined || dados.valor !== undefined) {
    const centavos = validarEConverterCentavos(dados.valorCentavos, dados.valor)
    if (centavos !== transacaoAtual.valorCentavos) {
      updateData.valorCentavos = centavos
      diff.valorCentavos = {
        antes: transacaoAtual.valorCentavos,
        depois: centavos,
        antesFormatado: formatarCentavosParaReal(transacaoAtual.valorCentavos),
        depoisFormatado: formatarCentavosParaReal(centavos),
      }
    }
  }

  if (dados.dataTransacao !== undefined) {
    const novaData = new Date(dados.dataTransacao)
    if (isNaN(novaData.getTime())) throw new Error('Data de transação inválida.')
    updateData.dataTransacao = novaData
    diff.dataTransacao = { antes: transacaoAtual.dataTransacao, depois: novaData }
  }

  // Se não houve alterações reais, retorna a transação existente
  if (Object.keys(updateData).length === 0) {
    return transacaoAtual
  }

  const transacaoAtualizada = await prisma.$transaction(async (tx) => {
    const t = await tx.transacao.update({
      where: { id: transacaoAtual.id },
      data: updateData,
    })

    await registrarAuditoria({
      prismaClient: tx,
      transacaoId: t.id,
      usuarioId,
      tipoAcao: 'EDICAO',
      dadosAlterados: diff,
    })

    return t
  })

  return {
    ...transacaoAtualizada,
    valorFormatado: formatarCentavosParaReal(transacaoAtualizada.valorCentavos),
  }
}

/**
 * Exclusão Lógica (Soft Delete):
 * "O sistema não deve permitir a exclusão física de registros (apenas marcação de "excluído") para manter a rastreabilidade (H1)."
 * "A exclusão será por Soft Delete: o sistema marca a data e o responsável, sem apagar o registro do banco."
 */
export async function excluirTransacaoSoftDelete({ prisma, usuarioId, id }) {
  const transacao = await buscarTransacaoPorId({ prisma, usuarioId, id })

  await prisma.$transaction(async (tx) => {
    await tx.transacao.update({
      where: { id: transacao.id },
      data: {
        deletadoEm: new Date(),
        deletadoPorId: usuarioId,
      },
    })

    await registrarAuditoria({
      prismaClient: tx,
      transacaoId: transacao.id,
      usuarioId,
      tipoAcao: 'EXCLUSAO',
      dadosAlterados: {
        motivo: 'Exclusão lógica via interface (Soft Delete)',
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
 * Cálculo centralizado do saldo pelo backend:
 * "O frontend não calculará o saldo por conta própria: exibirá os totais enviados pela API."
 * "Entrada soma no saldo e saída subtrai. O saldo será a soma das entradas ativas menos a soma das saídas ativas."
 * "Na listagem comum e no cálculo do saldo, transações excluídas não aparecerão."
 */
export async function calcularDashboard({ prisma, usuarioId }) {
  const baseWhere = {
    usuarioId,
    deletadoEm: null, // Exclusões lógicas não entram no saldo
  }

  const [entradasAgregadas, saidasAgregadas, quantidadeAtivas] = await Promise.all([
    prisma.transacao.aggregate({
      where: { ...baseWhere, tipo: 'ENTRADA' },
      _sum: { valorCentavos: true },
    }),
    prisma.transacao.aggregate({
      where: { ...baseWhere, tipo: 'SAIDA' },
      _sum: { valorCentavos: true },
    }),
    prisma.transacao.count({
      where: baseWhere,
    }),
  ])

  const receitasCentavos = entradasAgregadas._sum.valorCentavos || 0
  const despesasCentavos = saidasAgregadas._sum.valorCentavos || 0
  const saldoTotalCentavos = receitasCentavos - despesasCentavos

  return {
    saldoTotalCentavos,
    receitasCentavos,
    despesasCentavos,
    totalTransacoesAtivas: quantidadeAtivas,
    saldoTotal: formatarCentavosParaReal(saldoTotalCentavos),
    receitas: formatarCentavosParaReal(receitasCentavos),
    despesas: formatarCentavosParaReal(despesasCentavos),
    investimentos: 'R$ 0,00', // Campo reservado para extensões futuras
  }
}
