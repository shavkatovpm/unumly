-- CreateEnum
CREATE TYPE "DebtType" AS ENUM ('BORROWED', 'LENT');

-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DebtType" NOT NULL,
    "counterparty" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "paidAmount" BIGINT NOT NULL DEFAULT 0,
    "dueDate" VARCHAR(10),
    "note" TEXT,
    "notifyAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Debt_userId_idx" ON "Debt"("userId");

-- CreateIndex
CREATE INDEX "Debt_notifyAt_notifiedAt_settledAt_idx" ON "Debt"("notifyAt", "notifiedAt", "settledAt");

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

