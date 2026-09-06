-- /workspace: loyiha va tasklarni shu kesimga qo'shish uchun bayroq/tartib
-- ustunlari, task uchun aktiv (Jarayonda) holat va taxminiy davomiylik.
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "inWorkspaceAt" TIMESTAMP(3),
ADD COLUMN     "workspaceOrder" INTEGER;

-- AlterTable
ALTER TABLE "ProjectTask" ADD COLUMN     "durationHours" INTEGER,
ADD COLUMN     "inProgress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inWorkspaceAt" TIMESTAMP(3),
ADD COLUMN     "workspaceOrder" INTEGER;
