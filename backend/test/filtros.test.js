import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  alterarPerfilSchema,
  extratoSchema,
  filtrosTransacaoSchema,
  relatorioMensalSchema,
} from '../src/validators/schemas.js'
import { montarFiltroTransacoes } from '../src/services/transacaoService.js'
import { montarPaginacao, paraPrisma } from '../src/utils/paginacao.js'
import { fimDoDiaExclusivo, ultimosMeses } from '../src/utils/datas.js'
import { gerarCsv } from '../src/utils/csv.js'

test('filtros: aplica padrões de paginação e ordenação', () => {
  assert.deepEqual(filtrosTransacaoSchema.parse({}), { pagina: 1, limite: 10, ordenarPor: 'dataTransacao', ordem: 'desc' })
})

test('filtros: converte a query string e normaliza o tipo', () => {
  const f = filtrosTransacaoSchema.parse({ pagina: '2', limite: '5', tipo: 'saida', busca: '  aluguel ' })
  assert.equal(f.pagina, 2)
  assert.equal(f.limite, 5)
  assert.equal(f.tipo, 'SAIDA')
  assert.equal(f.busca, 'aluguel')
})

test('filtros: recusa limite > 100, página 0, ordenação desconhecida e período invertido', () => {
  for (const q of [
    { limite: '500' },
    { pagina: '0' },
    { ordenarPor: 'senhaHash' },
    { dataInicio: '2026-12-01', dataFim: '2026-01-01' },
    { valorMin: '500', valorMax: '100' },
  ]) {
    assert.equal(filtrosTransacaoSchema.safeParse(q).success, false, JSON.stringify(q))
  }
})

test('filtros: monta o where do Prisma sempre restrito ao usuário e às ativas', () => {
  const where = montarFiltroTransacoes(7, { tipo: 'ENTRADA', busca: 'venda', dataInicio: '2026-11-01', dataFim: '2026-11-30', valorMin: 100 })
  assert.equal(where.usuarioId, 7)
  assert.equal(where.deletadoEm, null)
  assert.deepEqual(where.descricao, { contains: 'venda', mode: 'insensitive' })
  assert.equal(where.dataTransacao.gte.toISOString(), '2026-11-01T00:00:00.000Z')
  assert.equal(where.dataTransacao.lt.toISOString(), '2026-12-01T00:00:00.000Z') // dataFim inclusiva
  assert.deepEqual(where.valorCentavos, { gte: 100 })
})

test('paginação: calcula skip/take e total de páginas', () => {
  assert.deepEqual(paraPrisma({ pagina: 3, limite: 10 }), { skip: 20, take: 10 })
  assert.deepEqual(montarPaginacao({ pagina: 1, limite: 10 }, 25), { pagina: 1, limite: 10, total: 25, totalPaginas: 3 })
  assert.equal(montarPaginacao({ pagina: 1, limite: 10 }, 0).totalPaginas, 1)
})

test('datas: últimos meses atravessam a virada de ano', () => {
  assert.deepEqual(ultimosMeses(3, new Date('2026-02-15T12:00:00Z')), ['2025-12', '2026-01', '2026-02'])
  assert.equal(fimDoDiaExclusivo('2026-12-31').toISOString(), '2027-01-01T00:00:00.000Z')
})

test('relatórios: limites do mensal e do extrato', () => {
  assert.equal(relatorioMensalSchema.parse({}).meses, 6)
  assert.equal(relatorioMensalSchema.safeParse({ meses: '25' }).success, false)
  assert.equal(extratoSchema.safeParse({ dataInicio: '2026-11-01' }).success, false)
  assert.equal(extratoSchema.parse({ dataInicio: '2026-11-01', dataFim: '2026-11-30' }).formato, 'json')
})

test('CSV: usa ; e escapa aspas, separadores e quebras de linha', () => {
  const csv = gerarCsv(['A', 'B'], [['Venda; "promo"', 'linha\nquebrada']])
  assert.ok(csv.startsWith('﻿A;B\r\n'))
  assert.ok(csv.includes('"Venda; ""promo"""'))
  assert.ok(csv.includes('"linha\nquebrada"'))
})

test('RBAC: só aceita perfis válidos', () => {
  assert.equal(alterarPerfilSchema.safeParse({ perfil: 'ADMIN' }).success, true)
  assert.equal(alterarPerfilSchema.safeParse({ perfil: 'ROOT' }).success, false)
})
