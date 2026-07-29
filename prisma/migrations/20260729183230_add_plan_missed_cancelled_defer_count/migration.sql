-- AlterEnum: MISSED va CANCELLED qo'shildi.
-- MISSED odatda yozilmaydi (o'qishda hisoblanadi), CANCELLED esa
-- "Kerak emas ekan" tugmasi orqali haqiqiy saqlanadigan holat.
ALTER TYPE "PlanStatus" ADD VALUE 'MISSED';
ALTER TYPE "PlanStatus" ADD VALUE 'CANCELLED';

-- AlterTable: kechiktirish hisoblagichi.
ALTER TABLE "Plan" ADD COLUMN     "deferCount" INTEGER NOT NULL DEFAULT 0;
