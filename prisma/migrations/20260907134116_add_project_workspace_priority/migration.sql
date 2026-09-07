-- Workspace grid'idagi muhimlik darajasi (1-3, default 1, 3 = eng muhim).
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "workspacePriority" INTEGER NOT NULL DEFAULT 1;
