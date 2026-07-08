-- Yig'im maqsadlari uchun hissa tarixi (har bir qo'shish/yechish alohida yozuv).
CREATE TABLE "GoalContribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalContribution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GoalContribution_goalId_idx" ON "GoalContribution"("goalId");
CREATE INDEX "GoalContribution_userId_idx" ON "GoalContribution"("userId");

ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "FinancialGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mavjud (funksiya qo'shilishidan oldingi) yig'ilgan summalarni bitta
-- "boshlang'ich" tarix yozuvi sifatida backfill qilish — tarix bo'sh
-- ko'rinmasligi uchun.
INSERT INTO "GoalContribution" ("id", "userId", "goalId", "amount", "date", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "userId", "id", "savedAmount", TO_CHAR("createdAt", 'YYYY-MM-DD'), "createdAt", "createdAt"
FROM "FinancialGoal"
WHERE "savedAmount" != 0;
