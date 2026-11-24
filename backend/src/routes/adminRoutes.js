import { Router } from 'express'
import { autenticar, autorizar } from '../middlewares/authMiddleware.js'
import { obterMetricas } from '../middlewares/metricas.js'
import {
  alterarPerfilSchema,
  auditoriaGlobalSchema,
  idParamSchema,
  listarUsuariosSchema,
} from '../validators/schemas.js'
import { alterarPerfil, auditoriaGlobal, dashboardGlobal, listarUsuarios } from '../services/adminService.js'

// Montado em /api/admin. Todas as rotas exigem login + perfil ADMIN (RBAC).
export const adminRoutes = Router()
adminRoutes.use(autenticar, autorizar('ADMIN'))

/** GET /api/admin/dashboard - totais de toda a empresa */
adminRoutes.get('/dashboard', async (req, res) => {
  res.json(await dashboardGlobal())
})

/** GET /api/admin/usuarios?pagina&limite&busca */
adminRoutes.get('/usuarios', async (req, res) => {
  res.json(await listarUsuarios(listarUsuariosSchema.parse(req.query)))
})

/** PATCH /api/admin/usuarios/:id/perfil - promove/rebaixa um usuário */
adminRoutes.patch('/usuarios/:id/perfil', async (req, res) => {
  const id = idParamSchema.parse(req.params.id)
  const { perfil } = alterarPerfilSchema.parse(req.body ?? {})
  res.json(await alterarPerfil(req.usuario.id, id, perfil))
})

/** GET /api/admin/auditoria?pagina&limite&tipoAcao&usuarioId - trilha global */
adminRoutes.get('/auditoria', async (req, res) => {
  res.json(await auditoriaGlobal(auditoriaGlobalSchema.parse(req.query)))
})

/** GET /api/admin/metricas - desempenho das rotas (chamadas, tempo médio e máximo, erros) */
adminRoutes.get('/metricas', (req, res) => {
  res.json(obterMetricas())
})
