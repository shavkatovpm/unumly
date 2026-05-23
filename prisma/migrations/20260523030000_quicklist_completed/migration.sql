-- Whole-list "done" marker. Set when user taps "Bajardim" in the list
-- detail; list disappears from main Tezkor view and shows up in the
-- Bajarilgan archive.
ALTER TABLE "QuickList"
  ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE INDEX "QuickList_userId_completedAt_idx" ON "QuickList"("userId", "completedAt");
