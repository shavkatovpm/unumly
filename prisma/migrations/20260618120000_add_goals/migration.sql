-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'DONE', 'ARCHIVED');

-- AlterTable: Plan ↔ GoalStep link (one-off occurrence per step)
ALTER TABLE "Plan" ADD COLUMN "goalStepId" TEXT;

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "deadline" VARCHAR(10),
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "order" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubGoal" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalStep" (
    "id" TEXT NOT NULL,
    "subGoalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_goalStepId_key" ON "Plan"("goalStepId");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "SubGoal_goalId_idx" ON "SubGoal"("goalId");

-- CreateIndex
CREATE INDEX "GoalStep_subGoalId_idx" ON "GoalStep"("subGoalId");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_goalStepId_fkey" FOREIGN KEY ("goalStepId") REFERENCES "GoalStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubGoal" ADD CONSTRAINT "SubGoal_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalStep" ADD CONSTRAINT "GoalStep_subGoalId_fkey" FOREIGN KEY ("subGoalId") REFERENCES "SubGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
