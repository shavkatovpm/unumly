-- CreateEnum
CREATE TYPE "GoalHorizon" AS ENUM ('WEEK', 'MONTH', 'QUARTER', 'YEAR');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "horizonGoalId" TEXT,
ADD COLUMN     "horizonStepId" TEXT;

-- CreateTable
CREATE TABLE "HorizonGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "horizon" "GoalHorizon" NOT NULL,
    "periodStart" VARCHAR(10) NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "sourceStepId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HorizonGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorizonGoalStep" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HorizonGoalStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HorizonGoal_userId_horizon_periodStart_idx" ON "HorizonGoal"("userId", "horizon", "periodStart");

-- CreateIndex
CREATE INDEX "HorizonGoal_parentId_idx" ON "HorizonGoal"("parentId");

-- CreateIndex
CREATE INDEX "HorizonGoal_sourceStepId_idx" ON "HorizonGoal"("sourceStepId");

-- CreateIndex
CREATE INDEX "HorizonGoalStep_goalId_idx" ON "HorizonGoalStep"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_horizonGoalId_key" ON "Plan"("horizonGoalId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_horizonStepId_key" ON "Plan"("horizonStepId");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_horizonGoalId_fkey" FOREIGN KEY ("horizonGoalId") REFERENCES "HorizonGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_horizonStepId_fkey" FOREIGN KEY ("horizonStepId") REFERENCES "HorizonGoalStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorizonGoal" ADD CONSTRAINT "HorizonGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorizonGoal" ADD CONSTRAINT "HorizonGoal_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "HorizonGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorizonGoal" ADD CONSTRAINT "HorizonGoal_sourceStepId_fkey" FOREIGN KEY ("sourceStepId") REFERENCES "HorizonGoalStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorizonGoalStep" ADD CONSTRAINT "HorizonGoalStep_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "HorizonGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

