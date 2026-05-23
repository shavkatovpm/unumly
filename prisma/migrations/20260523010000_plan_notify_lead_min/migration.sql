-- Per-task reminder lead time override. NULL = use User.notifyLeadMin.
ALTER TABLE "Plan"
  ADD COLUMN "notifyLeadMin" INTEGER;
