import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_CENTAVOS,
  atualizarTransacaoSchema,
  criarTransacaoSchema,
  idParamSchema,
  registroSchema,
} from '../src/validators/schemas.js'
import { formatarCentavosParaReal } from '../src/utils/moeda.js'

const aluguel = { tipo: 'SAIDA', descricao: 'Pagamento de Aluguel', valorCentavos: 200000 }

test('aceita o exemplo do enunciado (Aluguel R$ 2.000,00)', () => {
  const dados = criarTransacaoSchema.parse(aluguel)
  assert.equal(dados.valorCentavos, 200000)
  assert.equal(formatarCentavosParaReal(dados.valorCentavos), 'R$ 2.000,00')
})

test('recusa valores negativos, zero, decimais, strings e booleanos', () => {
  for (const valorCentavos of [-100, 0, 10.5, '200000', true, null]) {
    assert.equal(criarTransacaoSchema.safeParse({ ...aluguel, valorCentavos }).success, false, String(valorCentavos))
  }
})

test('recusa valores acima do limite da coluna INTEGER', () => {
  assert.equal(criarTransacaoSchema.safeParse({ ...aluguel, valorCentavos: MAX_CENTAVOS }).success, true)
  assert.equal(criarTransacaoSchema.safeParse({ ...aluguel, valorCentavos: MAX_CENTAVOS + 1 }).success, false)
})

test('normaliza e valida o tipo', () => {
  assert.equal(criarTransacaoSchema.parse({ ...aluguel, tipo: ' entrada ' }).tipo, 'ENTRADA')
  assert.equal(criarTransacaoSchema.safeParse({ ...aluguel, tipo: 'INVESTIMENTO' }).success, false)
})

test('exige descrição não vazia', () => {
  assert.equal(criarTransacaoSchema.safeParse({ ...aluguel, descricao: '   ' }).success, false)
})

test('valida a data e converte para Date', () => {
  assert.ok(criarTransacaoSchema.parse({ ...aluguel, dataTransacao: '2026-11-22' }).dataTransacao instanceof Date)
  assert.ok(criarTransacaoSchema.parse({ ...aluguel, dataTransacao: '2026-11-22T00:00:00.000Z' }).dataTransacao instanceof Date)
  assert.equal(criarTransacaoSchema.safeParse({ ...aluguel, dataTransacao: '22/11/2026' }).success, false)
})

test('recusa campos desconhecidos (ex: tentar forçar deletadoEm ou usuarioId)', () => {
  assert.equal(criarTransacaoSchema.safeParse({ ...aluguel, usuarioId: 99 }).success, false)
  assert.equal(atualizarTransacaoSchema.safeParse({ deletadoEm: null }).success, false)
})

test('atualização exige ao menos um campo', () => {
  assert.equal(atualizarTransacaoSchema.safeParse({}).success, false)
  assert.equal(atualizarTransacaoSchema.safeParse({ descricao: 'Novo' }).success, true)
})

test('id da rota precisa ser inteiro positivo', () => {
  assert.equal(idParamSchema.parse('42'), 42)
  for (const id of ['abc', '0', '-1', '1.5', '']) {
    assert.equal(idParamSchema.safeParse(id).success, false, id)
  }
})

test('cadastro exige e-mail válido e senha com 6+ caracteres', () => {
  const base = { nome: 'Empresa Alfa', email: 'Contato@EmpresaAlfa.com ', senha: '123456' }
  assert.equal(registroSchema.parse(base).email, 'contato@empresaalfa.com')
  assert.equal(registroSchema.safeParse({ ...base, senha: '123' }).success, false)
  assert.equal(registroSchema.safeParse({ ...base, email: 'invalido' }).success, false)
})
