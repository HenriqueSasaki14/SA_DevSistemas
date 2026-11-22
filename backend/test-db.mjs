import 'dotenv/config'
import { prisma } from './src/lib/prisma.ts'

try {
  // This actually forces a real connection
  const result = await prisma.usuario.findMany({ take: 1 })
  console.log('PRISMA_QUERY_OK: Resultado =', JSON.stringify(result))
} catch (err) {
  console.error('PRISMA_QUERY_FAIL:', err.message)
  console.error('PRISMA_QUERY_CODE:', err.code || 'N/A')
} finally {
  await prisma.$disconnect().catch(() => {})
}
