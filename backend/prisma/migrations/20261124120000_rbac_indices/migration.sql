-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('ADMIN', 'USUARIO');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "perfil" "PerfilUsuario" NOT NULL DEFAULT 'USUARIO';

-- CreateIndex
CREATE INDEX "Auditoria_transacaoId_dataAcao_idx" ON "Auditoria"("transacaoId", "dataAcao" DESC);

-- CreateIndex
CREATE INDEX "Auditoria_dataAcao_idx" ON "Auditoria"("dataAcao" DESC);

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_idx" ON "Auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "Transacao_usuarioId_deletadoEm_dataTransacao_idx" ON "Transacao"("usuarioId", "deletadoEm", "dataTransacao" DESC);


-- Bancos que já tinham usuários: o primeiro usuário cadastrado vira ADMIN
UPDATE "Usuario" SET "perfil" = 'ADMIN' WHERE "id" = (SELECT MIN("id") FROM "Usuario");
