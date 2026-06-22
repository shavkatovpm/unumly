-- Qarz uchun Agenda eslatmasi: toggle + lead (kun) + snooze.
ALTER TABLE "Debt" ADD COLUMN "agendaReminder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Debt" ADD COLUMN "reminderLeadDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Debt" ADD COLUMN "snoozedUntil" VARCHAR(10);
