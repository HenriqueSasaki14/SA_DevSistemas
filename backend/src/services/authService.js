import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma.ts'
import { AppError } from '../errors/AppError.js'
import { gerarToken } from '../middlewares/authMiddleware.js'

const BCRYPT_ROUNDS = 10

function dadosPublicos(usuario) {
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, criadoEm: usuario.criadoEm }
}

export async function registrarUsuario({ nome, email, senha, cpf, telefone }) {
  const jaExiste = await prisma.usuario.findUnique({ where: { email } })
  if (jaExiste) throw new AppError('Este e-mail já está cadastrado.', 409)

  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senhaHash: await bcrypt.hash(senha, BCRYPT_ROUNDS),
      cpf: cpf || null,
      telefone: telefone || null,
    },
  })

  return { token: gerarToken(usuario), usuario: dadosPublicos(usuario) }
}

export async function autenticarUsuario({ email, senha }) {
  const usuario = await prisma.usuario.findUnique({ where: { email } })
  const senhaCorreta = usuario && (await bcrypt.compare(senha, usuario.senhaHash))
  if (!senhaCorreta) throw new AppError('E-mail ou senha incorretos.', 401)

  return { token: gerarToken(usuario), usuario: dadosPublicos(usuario) }
}
