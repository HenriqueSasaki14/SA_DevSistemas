import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma.ts'
import { AppError } from '../errors/AppError.js'
import { gerarToken } from '../middlewares/authMiddleware.js'

const BCRYPT_ROUNDS = 10

function dadosPublicos(usuario) {
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, criadoEm: usuario.criadoEm }
}

export async function registrarUsuario({ nome, email, senha, cpf, telefone }) {
  const jaExiste = await prisma.usuario.findUnique({ where: { email } })
  if (jaExiste) throw new AppError('Este e-mail já está cadastrado.', 409)

  const senhaHash = await bcrypt.hash(senha, BCRYPT_ROUNDS)

  // O primeiro usuário do sistema é o ADMIN (dono da empresa); os demais entram como USUARIO
  const usuario = await prisma.$transaction(async (tx) => {
    const perfil = (await tx.usuario.count()) === 0 ? 'ADMIN' : 'USUARIO'
    return tx.usuario.create({
      data: { nome, email, senhaHash, perfil, cpf: cpf || null, telefone: telefone || null },
    })
  })

  return { token: gerarToken(usuario), usuario: dadosPublicos(usuario) }
}

export async function autenticarUsuario({ email, senha }) {
  const usuario = await prisma.usuario.findUnique({ where: { email } })
  const senhaCorreta = usuario && (await bcrypt.compare(senha, usuario.senhaHash))
  if (!senhaCorreta) throw new AppError('E-mail ou senha incorretos.', 401)

  return { token: gerarToken(usuario), usuario: dadosPublicos(usuario) }
}
