import { prisma } from '../lib/prisma.ts'
import { formatarCentavosParaReal } from '../utils/moeda.js'
import { fimDoDiaExclusivo, inicioDoDia, inicioDoMes, ultimosMeses } from '../utils/datas.js'
import { gerarCsv } from '../utils/csv.js'

/**
 * Relatório mensal: entradas, saídas e saldo de cada mês (inclui meses sem movimento).
 * A soma é feita no banco (GROUP BY), aproveitando o índice (usuarioId, deletadoEm, dataTransacao).
 */
export async function relatorioMensal(usuarioId, { meses }) {
  const listaMeses = ultimosMeses(meses)
  const inicio = inicioDoMes(listaMeses[0])

  const linhas = await prisma.$queryRaw`
    SELECT to_char(date_trunc('month', "dataTransacao"), 'YYYY-MM') AS mes,
           "tipo"::text AS tipo,
           SUM("valorCentavos")::bigint AS total
      FROM "Transacao"
     WHERE "usuarioId" = ${usuarioId}
       AND "deletadoEm" IS NULL
       AND "dataTransacao" >= ${inicio}
     GROUP BY 1, 2`

  const porMes = Object.fromEntries(listaMeses.map((mes) => [mes, { ENTRADA: 0, SAIDA: 0 }]))
  for (const { mes, tipo, total } of linhas) {
    if (porMes[mes]) porMes[mes][tipo] = Number(total)
  }

  return listaMeses.map((mes) => {
    const { ENTRADA: entradasCentavos, SAIDA: saidasCentavos } = porMes[mes]
    const saldoCentavos = entradasCentavos - saidasCentavos
    return {
      mes,
      entradasCentavos,
      saidasCentavos,
      saldoCentavos,
      entradas: formatarCentavosParaReal(entradasCentavos),
      saidas: formatarCentavosParaReal(saidasCentavos),
      saldo: formatarCentavosParaReal(saldoCentavos),
    }
  })
}

/** Soma (entradas - saídas) das transações ativas que atendem ao filtro de data. */
async function saldoAte(usuarioId, dataTransacao) {
  const base = { usuarioId, deletadoEm: null, dataTransacao }
  const [entradas, saidas] = await Promise.all([
    prisma.transacao.aggregate({ where: { ...base, tipo: 'ENTRADA' }, _sum: { valorCentavos: true } }),
    prisma.transacao.aggregate({ where: { ...base, tipo: 'SAIDA' }, _sum: { valorCentavos: true } }),
  ])
  return (entradas._sum.valorCentavos ?? 0) - (saidas._sum.valorCentavos ?? 0)
}

/**
 * Extrato do período com saldo acumulado linha a linha (como um extrato bancário).
 * Retorna JSON ou CSV.
 */
export async function extrato(usuarioId, { dataInicio, dataFim, formato }) {
  const inicio = inicioDoDia(dataInicio)
  const fim = fimDoDiaExclusivo(dataFim)

  const [saldoAnteriorCentavos, transacoes] = await Promise.all([
    saldoAte(usuarioId, { lt: inicio }),
    prisma.transacao.findMany({
      where: { usuarioId, deletadoEm: null, dataTransacao: { gte: inicio, lt: fim } },
      orderBy: [{ dataTransacao: 'asc' }, { id: 'asc' }],
    }),
  ])

  let saldo = saldoAnteriorCentavos
  const lancamentos = transacoes.map((t) => {
    saldo += t.tipo === 'ENTRADA' ? t.valorCentavos : -t.valorCentavos
    return {
      id: t.id,
      data: t.dataTransacao.toISOString().slice(0, 10),
      tipo: t.tipo,
      descricao: t.descricao,
      valorCentavos: t.valorCentavos,
      saldoAcumuladoCentavos: saldo,
      valor: formatarCentavosParaReal(t.valorCentavos),
      saldoAcumulado: formatarCentavosParaReal(saldo),
    }
  })

  const resultado = {
    periodo: { dataInicio, dataFim },
    saldoAnteriorCentavos,
    saldoFinalCentavos: saldo,
    saldoAnterior: formatarCentavosParaReal(saldoAnteriorCentavos),
    saldoFinal: formatarCentavosParaReal(saldo),
    lancamentos,
  }

  if (formato === 'csv') {
    return gerarCsv(
      ['Data', 'Tipo', 'Descrição', 'Valor', 'Saldo acumulado'],
      [
        [dataInicio, '', 'SALDO ANTERIOR', '', resultado.saldoAnterior],
        ...lancamentos.map((l) => [l.data, l.tipo, l.descricao, l.valor, l.saldoAcumulado]),
        [dataFim, '', 'SALDO FINAL', '', resultado.saldoFinal],
      ],
    )
  }
  return resultado
}
