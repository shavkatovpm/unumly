-- AddColumn: mark when default Odat (habit) categories have been seeded once.
ALTER TABLE "User" ADD COLUMN "habitCategoriesSeeded" BOOLEAN NOT NULL DEFAULT false;

-- Existing users who already have habit categories OR habits should NOT be
-- re-seeded — mark them as already seeded so their (possibly deleted) defaults
-- don't reappear.
UPDATE "User" u SET "habitCategoriesSeeded" = true
WHERE EXISTS (SELECT 1 FROM "HabitCategory" hc WHERE hc."userId" = u."id")
   OR EXISTS (SELECT 1 FROM "Habit" h WHERE h."userId" = u."id");
