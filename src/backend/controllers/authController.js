const jwt  = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const SALT_ROUNDS = 10

function gerarToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  })
}

// POST /api/auth/register
async function register(req, res) {
  const { nome, email, senha } = req.body ?? {}

  if (!nome || !email || !senha) {
    return res.status(400).json({ message: 'Preencha todos os campos.' })
  }

  // TODO: verificar se o e-mail já existe no banco de dados
  // const existente = await db.usuario.findByEmail(email)
  // if (existente) return res.status(409).json({ message: 'E-mail já cadastrado.' })

  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS)

  // TODO: salvar usuário no banco de dados
  // const novoUsuario = await db.usuario.create({ nome, email, senha: senhaHash })
  const novoUsuario = { id: Date.now(), nome, email, senha: senhaHash } // remover após integrar o banco

  const token = gerarToken({ id: novoUsuario.id, email: novoUsuario.email })
  return res.status(201).json({ token })
}

// POST /api/auth/login
async function login(req, res) {
  const { email, senha } = req.body ?? {}

  if (!email || !senha) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' })
  }

  // TODO: buscar usuário no banco de dados pelo e-mail
  // const usuario = await db.usuario.findByEmail(email)
  const usuario = null // remover após integrar o banco

  if (!usuario) {
    return res.status(401).json({ message: 'Credenciais inválidas.' })
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha)
  if (!senhaCorreta) {
    return res.status(401).json({ message: 'Credenciais inválidas.' })
  }

  const token = gerarToken({ id: usuario.id, email: usuario.email })
  return res.json({ token })
}

// GET /api/me  (req.usuario injetado pelo middleware autenticar)
async function me(req, res) {
  // TODO: buscar dados completos do usuário no banco pelo req.usuario.id
  // const usuario = await db.usuario.findById(req.usuario.id)
  // if (!usuario) return res.status(401).json({ message: 'Usuário não encontrado.' })

  // return res.json({
  //   id:        usuario.id,
  //   nome:      usuario.nome,
  //   email:     usuario.email,
  //   criadoEm: usuario.criadoEm,
  // })

  // Stub — remover após integrar o banco:
  return res.json({
    id:        req.usuario.id,
    nome:      'Usuário',
    email:     req.usuario.email,
    criadoEm: new Date().toISOString(),
  })
}

module.exports = { register, login, me }
