-- Loyiha (Project) ichidagi "Reja" bo'limi uchun: Idea/Category endi
-- ixtiyoriy ravishda bitta loyihaga tegishli bo'lishi mumkin (NULL = shaxsiy,
-- asosiy Reja bilan bir xil).
ALTER TABLE "Idea" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Category" ADD COLUMN "projectId" TEXT;

CREATE INDEX "Idea_projectId_idx" ON "Idea"("projectId");
CREATE INDEX "Category_projectId_idx" ON "Category"("projectId");

ALTER TABLE "Idea" ADD CONSTRAINT "Idea_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
