-- Qarzga valyuta maydoni (UZS default, USD/EUR ham mumkin).
ALTER TABLE "Debt" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'UZS';
