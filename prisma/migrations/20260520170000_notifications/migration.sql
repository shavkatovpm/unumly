-- AlterTable: add notification fields to Plan
ALTER TABLE "Plan" ADD COLUMN "notifyAt"   TIMESTAMP(3);
ALTER TABLE "Plan" ADD COLUMN "notifiedAt" TIMESTAMP(3);

-- CreateIndex for cron query (cheap filter on due, not yet notified, active)
CREATE INDEX "Plan_notifyAt_notifiedAt_status_idx" ON "Plan"("notifyAt", "notifiedAt", "status");

-- CreateTable: BotMessage (Telegram messages sent for a Plan)
CREATE TABLE "BotMessage" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "messageId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotMessage_planId_chatId_messageId_key" ON "BotMessage"("planId", "chatId", "messageId");
CREATE INDEX "BotMessage_planId_idx" ON "BotMessage"("planId");

ALTER TABLE "BotMessage"
    ADD CONSTRAINT "BotMessage_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
