-- Add notifyLeadMin column (default 5). Bot fires the reminder this many
-- minutes before the task's scheduled time.
ALTER TABLE "User"
  ADD COLUMN "notifyLeadMin" INTEGER NOT NULL DEFAULT 5;
