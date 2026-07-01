-- Odat: Agendada ko'rinish/ko'rinmaslik toggle.
ALTER TABLE "Habit" ADD COLUMN "showInAgenda" BOOLEAN NOT NULL DEFAULT true;
