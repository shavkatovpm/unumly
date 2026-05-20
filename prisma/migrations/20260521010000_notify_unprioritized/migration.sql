-- Add notifyUnprioritized column (default true). Existing rows pick up the
-- default automatically.
ALTER TABLE "User"
  ADD COLUMN "notifyUnprioritized" BOOLEAN NOT NULL DEFAULT true;
