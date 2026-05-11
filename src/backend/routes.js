const express = require('express')
const router = express.Router()

// Usuários em memória — substituir por banco de dados real
const USERS = [
  { id: 1, email: 'admin@safecash.com', senha: 'admin123', nome: 'Administrador' },
]

function gerarToken(payload) {
  // Base64 simples — substituir por jsonwebtoken em produção
  return Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64')
}

router.post('/auth/register', (req, res) => {
  const { nome, email, senha } = req.body ?? {}
  if (!nome || !email || !senha) {
    return res.status(400).json({ message: 'Preencha todos os campos.' })
  }
  if (USERS.find(u => u.email === email)) {
    return res.status(409).json({ message: 'E-mail já cadastrado.' })
  }
  const novoUser = { id: USERS.length + 1, email, senha, nome }
  USERS.push(novoUser)
  res.status(201).json({
    token: gerarToken({ id: novoUser.id, email: novoUser.email }),
    nome: novoUser.nome,
    email: novoUser.email,
  })
})

router.post('/auth/login', (req, res) => {
  const { email, senha } = req.body ?? {}
  if (!email || !senha) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' })
  }
  const user = USERS.find(u => u.email === email && u.senha === senha)
  if (!user) {
    return res.status(401).json({ message: 'Credenciais inválidas.' })
  }
  res.json({
    token: gerarToken({ id: user.id, email: user.email }),
    nome: user.nome,
    email: user.email,
  })
})

router.get('/me', (req, res) => {
  const auth = req.headers.authorization ?? ''
  const token = auth.replace('Bearer ', '')
  if (!token) return res.status(401).json({ message: 'Token ausente.' })
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString())
    const user = USERS.find(u => u.id === payload.id)
    if (!user) return res.status(401).json({ message: 'Usuário não encontrado.' })
    res.json({ id: user.id, nome: user.nome, email: user.email })
  } catch {
    res.status(401).json({ message: 'Token inválido.' })
  }
})

router.get('/dashboard', (req, res) => {
  res.json({
    saldoTotal: 'R$ 48.230,00',
    saldoDelta: '+4,2% este mês',
    receitas: 'R$ 12.400,00',
    receitasDelta: '+8,1% esta semana',
    despesas: 'R$ 3.820,00',
    despesasDelta: '-2,3% este mês',
    investimentos: 'R$ 31.080,00',
    investimentosDelta: '+6,7% no trimestre',
  })
})

router.get('/transacoes', (req, res) => {
  res.json([
    { desc: 'Transferência Recebida', data: '05/05/2026', val: '+R$ 3.200,00', tipo: 'entrada' },
    { desc: 'Pagamento de Fornecedor', data: '04/05/2026', val: '-R$ 1.450,00', tipo: 'saida' },
    { desc: 'Rendimento CDB', data: '03/05/2026', val: '+R$ 210,40', tipo: 'entrada' },
    { desc: 'Tarifa Bancária', data: '02/05/2026', val: '-R$ 32,90', tipo: 'saida' },
    { desc: 'PIX Recebido', data: '01/05/2026', val: '+R$ 800,00', tipo: 'entrada' },
  ])
})

module.exports = router
