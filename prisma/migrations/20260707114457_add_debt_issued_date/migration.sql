-- Qarz qachon berilgan/olingan sanasi. Mavjud yozuvlar uchun createdAt sanasidan
-- backfill qilinadi, keyin ustun majburiy (NOT NULL) qilinadi.
ALTER TABLE "Debt" ADD COLUMN "issuedDate" VARCHAR(10);
UPDATE "Debt" SET "issuedDate" = TO_CHAR("createdAt", 'YYYY-MM-DD');
ALTER TABLE "Debt" ALTER COLUMN "issuedDate" SET NOT NULL;
