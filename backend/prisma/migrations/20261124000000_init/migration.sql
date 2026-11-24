-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "TipoAcaoAuditoria" AS ENUM ('CRIACAO', 'EDICAO', 'EXCLUSAO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "cpf" TEXT,
    "telefone" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transacao" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoTransacao" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "dataTransacao" TIMESTAMP(3) NOT NULL,
    "chaveUnica" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "deletadoEm" TIMESTAMP(3),
    "deletadoPorId" INTEGER,

    CONSTRAINT "Transacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" SERIAL NOT NULL,
    "transacaoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipoAcao" "TipoAcaoAuditoria" NOT NULL,
    "dataAcao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dadosAlterados" JSONB NOT NULL,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Transacao_usuarioId_chaveUnica_key" ON "Transacao"("usuarioId", "chaveUnica");

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_deletadoPorId_fkey" FOREIGN KEY ("deletadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "Transacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────
-- Regra de Ouro (H1) garantida pelo próprio banco de dados
-- Mesmo fora da API (SQL manual, scripts, outro sistema), nenhum
-- registro financeiro ou de auditoria pode ser apagado fisicamente.
-- ─────────────────────────────────────────────────────────────────

-- Bloqueia DELETE físico em Transacao
CREATE FUNCTION bloquear_exclusao_fisica() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Exclusão física proibida em "%": use Soft Delete (deletadoEm).', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transacao_sem_delete_fisico
  BEFORE DELETE ON "Transacao"
  FOR EACH ROW EXECUTE FUNCTION bloquear_exclusao_fisica();

-- Transação já excluída logicamente fica congelada (não pode ser editada nem "ressuscitada")
CREATE FUNCTION bloquear_edicao_transacao_excluida() RETURNS trigger AS $$
BEGIN
  IF OLD."deletadoEm" IS NOT NULL THEN
    RAISE EXCEPTION 'Transação % foi excluída e não pode ser alterada.', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transacao_excluida_imutavel
  BEFORE UPDATE ON "Transacao"
  FOR EACH ROW EXECUTE FUNCTION bloquear_edicao_transacao_excluida();

-- Auditoria é somente inserção (append-only): sem UPDATE e sem DELETE
CREATE FUNCTION bloquear_alteracao_auditoria() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'A trilha de auditoria é imutável: % não permitido.', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auditoria_imutavel
  BEFORE UPDATE OR DELETE ON "Auditoria"
  FOR EACH ROW EXECUTE FUNCTION bloquear_alteracao_auditoria();
