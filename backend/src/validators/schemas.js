import { z } from 'zod'

/** Maior valor suportado pela coluna INTEGER do PostgreSQL (R$ 21.474.836,47). */
export const MAX_CENTAVOS = 2_147_483_647

const tipoTransacao = z
  .string({ error: 'O tipo de transação é obrigatório.' })
  .trim()
  .toUpperCase()
  .pipe(z.enum(['ENTRADA', 'SAIDA'], { error: 'Tipo de transação inválido. Deve ser ENTRADA ou SAIDA.' }))

const descricao = z
  .string({ error: 'A descrição da transação é obrigatória.' })
  .trim()
  .min(1, 'A descrição da transação é obrigatória.')
  .max(255, 'A descrição deve ter no máximo 255 caracteres.')

// Valor absoluto: inteiro estritamente positivo em centavos. Strings, booleanos e decimais são recusados.
const valorCentavos = z
  .number({ error: 'O valor em centavos deve ser um número inteiro.' })
  .int('O valor em centavos deve ser um número inteiro (sem casas decimais).')
  .positive('O valor da transação deve ser maior que zero. Valores negativos não são permitidos.')
  .max(MAX_CENTAVOS, 'O valor excede o limite máximo de R$ 21.474.836,47.')

// Aceita "2026-11-22" ou ISO 8601 completo ("2026-11-22T00:00:00.000Z")
const dataTransacao = z
  .union([z.iso.date(), z.iso.datetime({ offset: true })], {
    error: 'Data da transação inválida. Use o formato AAAA-MM-DD ou ISO 8601.',
  })
  .transform((valor) => new Date(valor))

const chaveUnica = z
  .string()
  .trim()
  .min(1, 'A chave única não pode ser vazia.')
  .max(100, 'A chave única deve ter no máximo 100 caracteres.')

export const criarTransacaoSchema = z.strictObject({
  tipo: tipoTransacao,
  descricao,
  valorCentavos,
  dataTransacao: dataTransacao.optional(),
  chaveUnica: chaveUnica.optional(),
})

export const atualizarTransacaoSchema = z
  .strictObject({
    tipo: tipoTransacao.optional(),
    descricao: descricao.optional(),
    valorCentavos: valorCentavos.optional(),
    dataTransacao: dataTransacao.optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, 'Informe ao menos um campo para atualizar.')

export const idParamSchema = z.coerce
  .number({ error: 'ID inválido.' })
  .int('ID inválido.')
  .positive('ID inválido.')

export const registroSchema = z.object({
  nome: z.string({ error: 'O nome é obrigatório.' }).trim().min(3, 'O nome deve ter pelo menos 3 caracteres.').max(120),
  email: z.string({ error: 'O e-mail é obrigatório.' }).trim().toLowerCase().pipe(z.email('E-mail inválido.')),
  senha: z.string({ error: 'A senha é obrigatória.' }).min(6, 'A senha deve ter pelo menos 6 caracteres.').max(72),
  cpf: z.string().trim().max(14).optional().nullable(),
  telefone: z.string().trim().max(20).optional().nullable(),
})

export const loginSchema = z.object({
  email: z.string({ error: 'O e-mail é obrigatório.' }).trim().toLowerCase().min(1, 'O e-mail é obrigatório.'),
  senha: z.string({ error: 'A senha é obrigatória.' }).min(1, 'A senha é obrigatória.'),
})
