import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import { prisma } from './lib/prisma.ts'
import { autenticar, gerarToken } from './middlewares/authMiddleware.js'
import {
  criarTransacao,
  listarTransacoesAtivas,
  buscarTransacaoPorId,
  atualizarTransacao,
  excluirTransacaoSoftDelete,
  calcularDashboard,
} from './services/transacaoService.js'
import { listarAuditoriaTransacao } from './services/auditoriaService.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ─────────────────────────────────────────────────────────────────
// Rotas de Autenticação (Bcrypt + JWT)
// ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Cadastro de novo usuário com senha criptografada via bcrypt
 */
app.post('/api/auth/register', async (req, res) => {
  const { nome, email, senha, cpf, telefone } = req.body

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios.' })
  }

  const emailNormalizado = String(email).trim().toLowerCase()

  try {
    const jaExiste = await prisma.usuario.findUnique({
      where: { email: emailNormalizado },
    })

    if (jaExiste) {
      return res.status(400).json({ erro: 'Este e-mail já está cadastrado.' })
    }

    const senhaHash = await bcrypt.hash(senha, 10)

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome: String(nome).trim(),
        email: emailNormalizado,
        senhaHash,
        cpf: cpf ? String(cpf).trim() : null,
        telefone: telefone ? String(telefone).trim() : null,
      },
    })

    const token = gerarToken(novoUsuario)

    res.status(201).json({
      token,
      usuario: {
        id: novoUsuario.id,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        criadoEm: novoUsuario.criadoEm,
      },
    })
  } catch (err) {
    console.error('Erro no cadastro:', err)
    res.status(500).json({ erro: 'Erro ao cadastrar usuário.', detalhe: err.message })
  }
})

/**
 * POST /api/auth/login
 * Autenticação do usuário e emissão do JWT
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' })
  }

  const emailNormalizado = String(email).trim().toLowerCase()

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: emailNormalizado },
    })

    if (!usuario) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' })
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash)
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' })
    }

    const token = gerarToken(usuario)

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        criadoEm: usuario.criadoEm,
      },
    })
  } catch (err) {
    console.error('Erro no login:', err)
    res.status(500).json({ erro: 'Erro ao realizar login.', detalhe: err.message })
  }
})

/**
 * GET /api/me
 * Retorna dados da sessão do usuário autenticado
 */
app.get('/api/me', autenticar, (req, res) => {
  res.json(req.usuario)
})

// ─────────────────────────────────────────────────────────────────
// Rotas de Transações (CRUD Inteligente + Soft Delete + Auditoria)
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/transacoes
 * Listagem das transações ativas (exclui soft-deleted)
 */
app.get('/api/transacoes', autenticar, async (req, res) => {
  try {
    const transacoes = await listarTransacoesAtivas({
      prisma,
      usuarioId: req.usuario.id,
    })
    res.json(transacoes)
  } catch (err) {
    console.error('Erro ao listar transações:', err)
    res.status(500).json({ erro: 'Erro ao buscar transações.', detalhe: err.message })
  }
})

/**
 * GET /api/transacoes/:id
 * Consulta detalhada de uma transação
 */
app.get('/api/transacoes/:id', autenticar, async (req, res) => {
  try {
    const transacao = await buscarTransacaoPorId({
      prisma,
      usuarioId: req.usuario.id,
      id: req.params.id,
    })
    res.json(transacao)
  } catch (err) {
    res.status(err.statusCode || 500).json({ erro: err.message })
  }
})

/**
 * POST /api/transacoes
 * Criação com centavos inteiros, verificação de duplicidade e auditoria automática
 */
app.post('/api/transacoes', autenticar, async (req, res) => {
  const { tipo, descricao, valorCentavos, valor, dataTransacao, chaveUnica } = req.body

  try {
    const nova = await criarTransacao({
      prisma,
      usuarioId: req.usuario.id,
      tipo,
      descricao,
      valorCentavos,
      valor,
      dataTransacao,
      chaveUnica,
    })
    res.status(201).json(nova)
  } catch (err) {
    res.status(err.statusCode || 400).json({
      erro: err.message,
      transacaoExistente: err.transacaoExistente || null,
    })
  }
})

/**
 * PUT /api/transacoes/:id
 * Edição de transação com registro do diff na auditoria
 */
app.put('/api/transacoes/:id', autenticar, async (req, res) => {
  try {
    const atualizada = await atualizarTransacao({
      prisma,
      usuarioId: req.usuario.id,
      id: req.params.id,
      dados: req.body,
    })
    res.json(atualizada)
  } catch (err) {
    res.status(err.statusCode || 400).json({ erro: err.message })
  }
})

/**
 * DELETE /api/transacoes/:id
 * Soft Delete com data e responsável, gravando na auditoria
 */
app.delete('/api/transacoes/:id', autenticar, async (req, res) => {
  try {
    const resultado = await excluirTransacaoSoftDelete({
      prisma,
      usuarioId: req.usuario.id,
      id: req.params.id,
    })
    res.json(resultado)
  } catch (err) {
    res.status(err.statusCode || 500).json({ erro: err.message })
  }
})

/**
 * GET /api/transacoes/:id/auditoria
 * Trilha de auditoria da transação (rastreabilidade completa)
 */
app.get('/api/transacoes/:id/auditoria', autenticar, async (req, res) => {
  try {
    // Garante que a transação pertença ao usuário
    await buscarTransacaoPorId({
      prisma,
      usuarioId: req.usuario.id,
      id: req.params.id,
    })

    const auditorias = await listarAuditoriaTransacao({
      prismaClient: prisma,
      transacaoId: req.params.id,
    })
    res.json(auditorias)
  } catch (err) {
    res.status(err.statusCode || 500).json({ erro: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────
// Rota do Dashboard (Cálculo consolidado centralizado na API)
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/dashboard
 * Retorna saldo total, receitas e despesas consolidados (ignorando soft-deleted)
 */
app.get('/api/dashboard', autenticar, async (req, res) => {
  try {
    const dashboard = await calcularDashboard({
      prisma,
      usuarioId: req.usuario.id,
    })
    res.json(dashboard)
  } catch (err) {
    console.error('Erro ao calcular dashboard:', err)
    res.status(500).json({ erro: 'Erro ao consolidar dashboard.', detalhe: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────
// Inicialização do Servidor
// ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[SafeCash API] Servidor rodando em http://localhost:${PORT}`)
})

export default app
