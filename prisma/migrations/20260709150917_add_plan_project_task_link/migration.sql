-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "projectTaskId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Plan_projectTaskId_key" ON "Plan"("projectTaskId");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_projectTaskId_fkey" FOREIGN KEY ("projectTaskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
