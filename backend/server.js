require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const db = require('./db')

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
if (!JWT_SECRET) {
  console.error('JWT_SECRET não definido. Copie backend/.env.example para backend/.env')
  process.exit(1)
}

function gerarToken(usuario) {
  return jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// ── Middleware: verifica o token JWT ──────────────────────────────
function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ')
  if (tipo !== 'Bearer' || !token) return res.status(401).json({ erro: 'Token não enviado' })

  let dados
  try {
    dados = jwt.verify(token, JWT_SECRET)
  } catch (err) {
    const erro = err.name === 'TokenExpiredError' ? 'Sessão expirada, faça login novamente' : 'Token inválido'
    return res.status(401).json({ erro })
  }

  const usuario = db.prepare('SELECT id, nome, email FROM usuarios WHERE id = ?').get(dados.id)
  if (!usuario) return res.status(401).json({ erro: 'Usuário não encontrado' })

  req.usuario = usuario
  next()
}

// ── POST /api/auth/cadastro ───────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { nome, email, senha } = req.body

  if (!nome || !email || !senha)
    return res.status(400).json({ erro: 'Preencha todos os campos' })

  const jaExiste = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email)
  if (jaExiste)
    return res.status(400).json({ erro: 'E-mail já cadastrado' })

  const senhaCriptografada = await bcrypt.hash(senha, 10)
  const resultado = db.prepare(
    'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)'
  ).run(nome, email, senhaCriptografada)

  const token = gerarToken({ id: resultado.lastInsertRowid, email })

  res.status(201).json({ token, usuario: { id: resultado.lastInsertRowid, nome, email } })
})

// ── POST /api/auth/login ──────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body

  if (!email || !senha)
    return res.status(400).json({ erro: 'Preencha todos os campos' })

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email)
  if (!usuario)
    return res.status(401).json({ erro: 'E-mail ou senha incorretos' })

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha)
  if (!senhaCorreta)
    return res.status(401).json({ erro: 'E-mail ou senha incorretos' })

  const token = gerarToken(usuario)

  res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } })
})

// ── GET /api/me ───────────────────────────────────────────────────
app.get('/api/me', autenticar, (req, res) => {
  res.json(req.usuario)
})

// ── GET /api/dashboard ───────────────────────────────────────────
app.get('/api/dashboard', autenticar, (req, res) => {
  res.json({
    saldoTotal:        'R$ 12.450,00',
    saldoDelta:        '2,3% este mês',
    receitas:          'R$ 5.200,00',
    receitasDelta:     '8,1%',
    despesas:          'R$ 1.890,00',
    despesasDelta:     '3,4%',
    investimentos:     'R$ 7.140,00',
    investimentosDelta:'1,2%',
  })
})

// ── GET /api/transacoes ───────────────────────────────────────────
app.get('/api/transacoes', autenticar, (req, res) => {
  res.json([
    { desc: 'Salário',         data: '01/05/2026', val: 'R$ 5.200,00', tipo: 'entrada'    },
    { desc: 'Aluguel',         data: '05/05/2026', val: 'R$ 1.200,00', tipo: 'saida'      },
    { desc: 'Rendimento CDB',  data: '10/05/2026', val: 'R$ 142,00',   tipo: 'rendimento' },
    { desc: 'Supermercado',    data: '11/05/2026', val: 'R$ 380,00',   tipo: 'saida'      },
    { desc: 'Taxa manutenção', data: '11/05/2026', val: 'R$ 12,90',    tipo: 'tarifa'     },
  ])
})

// ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend rodando em http://localhost:${PORT}`))
