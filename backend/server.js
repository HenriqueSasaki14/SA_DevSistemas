require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const db = require('./db')

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// ── Middleware: verifica o token JWT ──────────────────────────────
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ erro: 'Token não enviado' })

  const token = authHeader.split(' ')[1]
  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET)
    req.usuario = dados
    next()
  } catch {
    res.status(401).json({ erro: 'Token inválido' })
  }
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

  const token = jwt.sign(
    { id: resultado.lastInsertRowid, email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

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

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } })
})

// ── GET /api/me ───────────────────────────────────────────────────
app.get('/api/me', autenticar, (req, res) => {
  const usuario = db.prepare('SELECT id, nome, email FROM usuarios WHERE id = ?').get(req.usuario.id)
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' })
  res.json(usuario)
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
