import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function setup() {
  const client = await pool.connect()
  try {
    // Check tables
    const res = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)
    console.log('Tabelas existentes:', res.rows.map(r => r.tablename))

    // Check enums
    const enums = await client.query(`SELECT typname FROM pg_type WHERE typname IN ('TipoTransacao', 'TipoAcaoAuditoria')`)
    console.log('Tipos enum:', enums.rows.map(r => r.typname))

    // Create enums if not exist
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoTransacao') THEN CREATE TYPE "TipoTransacao" AS ENUM ('ENTRADA', 'SAIDA'); END IF; END $$;`)
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoAcaoAuditoria') THEN CREATE TYPE "TipoAcaoAuditoria" AS ENUM ('CRIACAO', 'EDICAO', 'EXCLUSAO'); END IF; END $$;`)

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Usuario" (
        "id" SERIAL PRIMARY KEY,
        "nome" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "senhaHash" TEXT NOT NULL,
        "cpf" TEXT,
        "telefone" TEXT,
        "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS "Transacao" (
        "id" SERIAL PRIMARY KEY,
        "usuarioId" INTEGER NOT NULL REFERENCES "Usuario"("id"),
        "tipo" "TipoTransacao" NOT NULL,
        "descricao" TEXT NOT NULL,
        "valorCentavos" INTEGER NOT NULL,
        "dataTransacao" TIMESTAMP(3) NOT NULL,
        "chaveUnica" TEXT NOT NULL,
        "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deletadoEm" TIMESTAMP(3),
        "deletadoPorId" INTEGER REFERENCES "Usuario"("id"),
        UNIQUE ("usuarioId", "chaveUnica")
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS "Auditoria" (
        "id" SERIAL PRIMARY KEY,
        "transacaoId" INTEGER NOT NULL REFERENCES "Transacao"("id") ON DELETE CASCADE,
        "usuarioId" INTEGER NOT NULL REFERENCES "Usuario"("id"),
        "tipoAcao" "TipoAcaoAuditoria" NOT NULL,
        "dataAcao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "dadosAlterados" JSONB NOT NULL
      );
    `)

    // Verify
    const res2 = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)
    console.log('\nTabelas após setup:', res2.rows.map(r => r.tablename))

    // Clean test data from previous runs
    await client.query(`DELETE FROM "Auditoria"`)
    await client.query(`DELETE FROM "Transacao"`)
    await client.query(`DELETE FROM "Usuario" WHERE "email" LIKE '%teste-safecash%'`)

    console.log('\nSETUP_OK: Banco preparado para testes')
  } catch (err) {
    console.error('SETUP_FAIL:', err.message)
  } finally {
    client.release()
    await pool.end()
  }
}

setup()
