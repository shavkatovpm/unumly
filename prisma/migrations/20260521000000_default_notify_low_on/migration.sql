-- Change default of notifyLow to true (was false)
ALTER TABLE "User" ALTER COLUMN "notifyLow" SET DEFAULT true;

-- Backfill existing users so they get LOW reminders too by default.
-- Anyone who explicitly disabled it can turn it back off in settings.
UPDATE "User" SET "notifyLow" = true WHERE "notifyLow" = false;
