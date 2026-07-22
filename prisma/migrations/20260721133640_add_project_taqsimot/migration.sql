-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "category" TEXT,
ADD COLUMN     "targetHours" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "weeklyCapacity" JSONB,
ADD COLUMN     "categoryPct" JSONB;

-- CreateTable
CREATE TABLE "ProjectFocusLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "weekStart" VARCHAR(10) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFocusLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectFocusLog_projectId_idx" ON "ProjectFocusLog"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFocusLog_projectId_weekStart_key" ON "ProjectFocusLog"("projectId", "weekStart");

-- AddForeignKey
ALTER TABLE "ProjectFocusLog" ADD CONSTRAINT "ProjectFocusLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
