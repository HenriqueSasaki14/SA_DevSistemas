import 'dotenv/config'
import { app } from './app.js'

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`[SafeCash API] Servidor rodando em http://localhost:${PORT}`)
})
