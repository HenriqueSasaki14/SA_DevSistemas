/**
 * Métricas de desempenho em memória: quantidade de chamadas, tempo médio,
 * tempo máximo e erros por rota. Expostas para o ADMIN em GET /api/admin/metricas
 * e no header X-Response-Time de cada resposta.
 */
const estatisticas = new Map()
const iniciadoEm = new Date()

export function metricas(req, res, next) {
  const inicio = process.hrtime.bigint()

  // Registra o header antes do envio
  const writeHead = res.writeHead
  res.writeHead = function (...args) {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6
    res.setHeader('X-Response-Time', `${ms.toFixed(1)}ms`)
    return writeHead.apply(this, args)
  }

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6
    // Usa o padrão da rota (/api/transacoes/:id) para agrupar, não a URL com o ID
    const rota = (req.route ? `${req.baseUrl}${req.route.path}` : req.path).replace(/(.)\/$/, '$1')
    const chave = `${req.method} ${rota}`

    const atual = estatisticas.get(chave) ?? { chamadas: 0, totalMs: 0, maxMs: 0, erros: 0 }
    atual.chamadas += 1
    atual.totalMs += ms
    atual.maxMs = Math.max(atual.maxMs, ms)
    if (res.statusCode >= 500) atual.erros += 1
    estatisticas.set(chave, atual)
  })

  next()
}

export function obterMetricas() {
  const rotas = [...estatisticas.entries()]
    .map(([rota, s]) => ({
      rota,
      chamadas: s.chamadas,
      mediaMs: Number((s.totalMs / s.chamadas).toFixed(2)),
      maxMs: Number(s.maxMs.toFixed(2)),
      erros5xx: s.erros,
    }))
    .sort((a, b) => b.chamadas - a.chamadas)

  return { iniciadoEm, uptimeSegundos: Math.round(process.uptime()), rotas }
}
