const jwt = require('jsonwebtoken')

// Middleware que protege rotas autenticadas.
// Injeta req.usuario = { id, email } se o token for válido.
function autenticar(req, res, next) {
  const auth = req.headers.authorization ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Token ausente.' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.usuario = { id: payload.id, email: payload.email }
    next()
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado.' })
  }
}

module.exports = { autenticar }
