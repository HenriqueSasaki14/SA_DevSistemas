import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from './lib/prisma.ts'

const JWT_SECRET     = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

if (!JWT_SECRET) {
  console.error('JWT_SECRET não definido. Copie backend/.env.example para backend/.env')
  process.exit(1)
}

function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id_usuario, email: usuario.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

const app = express()

app.use(cors())
app.use(express.json())

function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ')
  if (tipo !== 'Bearer' || !token)
    return res.status(401).json({ erro: 'Token não enviado' })

  let dados
  try {
    dados = jwt.verify(token, JWT_SECRET)
  } catch (err) {
    const erro =
      err.name === 'TokenExpiredError'
        ? 'Sessão expirada, faça login novamente'
        : 'Token inválido'
    return res.status(401).json({ erro })
  }

  prisma.usuario
    .findUnique({ where: { id_usuario: dados.id } })
    .then((usuario) => {
      if (!usuario) return res.status(401).json({ erro: 'Usuário não encontrado' })
      req.usuario = usuario
      next()
    })
    .catch(() => res.status(500).json({ erro: 'Erro interno' }))
}

app.post('/api/auth/register', async (req, res) => {
  const { nome, email, senha, cpf, telefone } = req.body

  if (!nome || !email || !senha || !cpf || !telefone)
    return res.status(400).json({ erro: 'Preencha todos os campos (nome, email, senha, cpf, telefone)' })

  const jaExiste = await prisma.usuario.findUnique({ where: { email } })
  if (jaExiste)
    return res.status(400).json({ erro: 'E-mail já cadastrado' })

  const senhaCriptografada = await bcrypt.hash(senha, 10)

  const novoUsuario = await prisma.usuario.create({
    data: { nome, email, senha: senhaCriptografada, cpf, telefone },
  })

  const token = gerarToken(novoUsuario)

  res.status(201).json({
    token,
    usuario: { id: novoUsuario.id_usuario, nome: novoUsuario.nome, email: novoUsuario.email },
  })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body

  if (!email || !senha)
    return res.status(400).json({ erro: 'Preencha todos os campos' })

  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario)
    return res.status(401).json({ erro: 'E-mail ou senha incorretos' })

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha)
  if (!senhaCorreta)
    return res.status(401).json({ erro: 'E-mail ou senha incorretos' })

  const token = gerarToken(usuario)

  res.json({
    token,
    usuario: { id: usuario.id_usuario, nome: usuario.nome, email: usuario.email },
  })
})

app.get('/api/me', autenticar, (req, res) => {
  const { id_usuario, nome, email, cpf, telefone } = req.usuario
  res.json({ id: id_usuario, nome, email, cpf, telefone })
})

app.get('/api/usuarios', autenticar, async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { deleted: null },
      select: { id_usuario: true, nome: true, email: true, cpf: true, telefone: true },
    })
    res.json(usuarios)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar usuários', detalhe: err.message })
  }
})

app.get('/api/usuarios/:id', autenticar, async (req, res) => {
  try {
    const usuario = await prisma.usuario.findFirst({
      where: { id_usuario: Number(req.params.id), deleted: null },
      select: { id_usuario: true, nome: true, email: true, cpf: true, telefone: true },
    })
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' })
    res.json(usuario)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar usuário', detalhe: err.message })
  }
})

app.put('/api/usuarios/:id', autenticar, async (req, res) => {
  const { nome, email, cpf, telefone, senha } = req.body
  const data = {}

  if (nome)     data.nome     = nome
  if (email)    data.email    = email
  if (cpf)      data.cpf      = cpf
  if (telefone) data.telefone = telefone
  if (senha)    data.senha    = await bcrypt.hash(senha, 10)

  try {
    const atualizado = await prisma.usuario.update({
      where: { id_usuario: Number(req.params.id) },
      data,
      select: { id_usuario: true, nome: true, email: true, cpf: true, telefone: true },
    })
    res.json(atualizado)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar usuário', detalhe: err.message })
  }
})

app.delete('/api/usuarios/:id', autenticar, async (req, res) => {
  try {
    await prisma.usuario.update({
      where: { id_usuario: Number(req.params.id) },
      data: { deleted: new Date() },
    })
    res.json({ mensagem: 'Usuário removido com sucesso' })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover usuário', detalhe: err.message })
  }
})

app.get('/api/categorias', autenticar, async (req, res) => {
  try {
    const categorias = await prisma.categoria.findMany({ orderBy: { id: 'asc' } })
    res.json(categorias)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar categorias', detalhe: err.message })
  }
})

app.get('/api/categorias/:id', autenticar, async (req, res) => {
  try {
    const categoria = await prisma.categoria.findUnique({
      where: { id: Number(req.params.id) },
    })
    if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada' })
    res.json(categoria)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar categoria', detalhe: err.message })
  }
})

app.post('/api/categorias', autenticar, async (req, res) => {
  const { nome } = req.body
  if (!nome) return res.status(400).json({ erro: 'Campo nome é obrigatório' })

  try {
    const nova = await prisma.categoria.create({ data: { nome } })
    res.status(201).json(nova)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar categoria', detalhe: err.message })
  }
})

app.put('/api/categorias/:id', autenticar, async (req, res) => {
  const { nome } = req.body
  if (!nome) return res.status(400).json({ erro: 'Campo nome é obrigatório' })

  try {
    const atualizada = await prisma.categoria.update({
      where: { id: Number(req.params.id) },
      data: { nome },
    })
    res.json(atualizada)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar categoria', detalhe: err.message })
  }
})

app.delete('/api/categorias/:id', autenticar, async (req, res) => {
  try {
    await prisma.categoria.delete({ where: { id: Number(req.params.id) } })
    res.json({ mensagem: 'Categoria removida com sucesso' })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover categoria', detalhe: err.message })
  }
})

app.get('/api/transacoes', autenticar, async (req, res) => {
  try {
    const transacoes = await prisma.transacao.findMany({
      where: { usuario_id: req.usuario.id_usuario, deleted_quando: null },
      include: { categoria: true },
      orderBy: { data_transacao: 'desc' },
    })
    res.json(transacoes)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar transações', detalhe: err.message })
  }
})

app.get('/api/transacoes/:id', autenticar, async (req, res) => {
  try {
    const transacao = await prisma.transacao.findFirst({
      where: {
        id: Number(req.params.id),
        usuario_id: req.usuario.id_usuario,
        deleted_quando: null,
      },
      include: { categoria: true },
    })
    if (!transacao) return res.status(404).json({ erro: 'Transação não encontrada' })
    res.json(transacao)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar transação', detalhe: err.message })
  }
})

app.post('/api/transacoes', autenticar, async (req, res) => {
  const { categoria_id, descricao, valor, tipo, data_transacao } = req.body

  if (!categoria_id || !valor || !tipo || !data_transacao)
    return res.status(400).json({ erro: 'Campos obrigatórios: categoria_id, valor, tipo, data_transacao' })

  try {
    const nova = await prisma.transacao.create({
      data: {
        usuario_id:     req.usuario.id_usuario,
        categoria_id:   Number(categoria_id),
        descricao:      descricao || null,
        valor:          Number(valor),
        tipo,
        data_transacao: new Date(data_transacao),
      },
      include: { categoria: true },
    })
    res.status(201).json(nova)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar transação', detalhe: err.message })
  }
})

app.put('/api/transacoes/:id', autenticar, async (req, res) => {
  const { categoria_id, descricao, valor, tipo, data_transacao } = req.body
  const data = {}

  if (categoria_id !== undefined) data.categoria_id   = Number(categoria_id)
  if (descricao    !== undefined) data.descricao      = descricao
  if (valor        !== undefined) data.valor          = Number(valor)
  if (tipo         !== undefined) data.tipo           = tipo
  if (data_transacao)             data.data_transacao = new Date(data_transacao)

  try {
    const existente = await prisma.transacao.findFirst({
      where: { id: Number(req.params.id), usuario_id: req.usuario.id_usuario, deleted_quando: null },
    })
    if (!existente) return res.status(404).json({ erro: 'Transação não encontrada' })

    const atualizada = await prisma.transacao.update({
      where: { id: Number(req.params.id) },
      data,
      include: { categoria: true },
    })
    res.json(atualizada)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar transação', detalhe: err.message })
  }
})

app.delete('/api/transacoes/:id', autenticar, async (req, res) => {
  try {
    const existente = await prisma.transacao.findFirst({
      where: { id: Number(req.params.id), usuario_id: req.usuario.id_usuario, deleted_quando: null },
    })
    if (!existente) return res.status(404).json({ erro: 'Transação não encontrada' })

    await prisma.transacao.update({
      where: { id: Number(req.params.id) },
      data: { deleted_quando: new Date() },
    })
    res.json({ mensagem: 'Transação removida com sucesso' })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover transação', detalhe: err.message })
  }
})

app.get('/api/dashboard', autenticar, async (req, res) => {
  try {
    const uid  = req.usuario.id_usuario
    const base = { usuario_id: uid, deleted_quando: null }

    const [receitas, despesas] = await Promise.all([
      prisma.transacao.aggregate({ where: { ...base, tipo: 'entrada' }, _sum: { valor: true } }),
      prisma.transacao.aggregate({ where: { ...base, tipo: 'saida'   }, _sum: { valor: true } }),
    ])

    const totalReceitas = Number(receitas._sum.valor || 0)
    const totalDespesas = Number(despesas._sum.valor || 0)
    const saldoTotal    = totalReceitas - totalDespesas

    res.json({
      saldoTotal: saldoTotal.toFixed(2),
      receitas:   totalReceitas.toFixed(2),
      despesas:   totalDespesas.toFixed(2),
    })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar dashboard', detalhe: err.message })
  }
})

app.listen(3000, () => console.log('Backend rodando em http://localhost:3000'))