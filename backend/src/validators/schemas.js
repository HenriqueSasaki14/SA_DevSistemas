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

// ─── Filtros, paginação e busca (query string) ───────────────────

const dataSimples = z.iso.date({ error: 'Data inválida. Use o formato AAAA-MM-DD.' })

const paginacao = {
  pagina: z.coerce.number().int().min(1, 'A página deve ser maior ou igual a 1.').default(1),
  limite: z.coerce.number().int().min(1).max(100, 'O limite máximo por página é 100.').default(10),
}

export const filtrosTransacaoSchema = z
  .object({
    ...paginacao,
    tipo: tipoTransacao.optional(),
    busca: z.string().trim().max(100).optional().transform((v) => v || undefined),
    dataInicio: dataSimples.optional(),
    dataFim: dataSimples.optional(),
    valorMin: z.coerce.number().int().min(0).optional(),
    valorMax: z.coerce.number().int().min(0).optional(),
    ordenarPor: z.enum(['dataTransacao', 'valorCentavos', 'descricao', 'criadoEm']).default('dataTransacao'),
    ordem: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine((f) => !f.dataInicio || !f.dataFim || f.dataInicio <= f.dataFim, {
    message: 'A data inicial não pode ser maior que a data final.',
    path: ['dataInicio'],
  })
  .refine((f) => f.valorMin === undefined || f.valorMax === undefined || f.valorMin <= f.valorMax, {
    message: 'O valor mínimo não pode ser maior que o valor máximo.',
    path: ['valorMin'],
  })

export const relatorioMensalSchema = z.object({
  meses: z.coerce.number().int().min(1).max(24, 'O relatório mensal aceita no máximo 24 meses.').default(6),
})

export const extratoSchema = z
  .object({
    dataInicio: dataSimples,
    dataFim: dataSimples,
    formato: z.enum(['json', 'csv']).default('json'),
  })
  .refine((f) => f.dataInicio <= f.dataFim, {
    message: 'A data inicial não pode ser maior que a data final.',
    path: ['dataInicio'],
  })

// ─── Administração (RBAC) ────────────────────────────────────────

export const listarUsuariosSchema = z.object({
  ...paginacao,
  busca: z.string().trim().max(100).optional().transform((v) => v || undefined),
})

export const alterarPerfilSchema = z.strictObject({
  perfil: z.enum(['ADMIN', 'USUARIO'], { error: 'Perfil inválido. Deve ser ADMIN ou USUARIO.' }),
})

export const auditoriaGlobalSchema = z.object({
  ...paginacao,
  tipoAcao: z.enum(['CRIACAO', 'EDICAO', 'EXCLUSAO']).optional(),
  usuarioId: z.coerce.number().int().positive().optional(),
})
