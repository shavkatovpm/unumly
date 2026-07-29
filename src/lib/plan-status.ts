/** Reja holatini o'qish paytida hisoblash — cron yo'q, hech narsa yozilmaydi.
 *
 *  DB'dagi `status` foydalanuvchi qo'ygan haqiqiy holat (TODO / DONE /
 *  CANCELLED). MISSED va ARCHIVED esa hech qachon saqlanmaydi: ular
 *  `scheduledFor` bilan bugungi sana orasidagi farqdan kelib chiqadi.
 *  Shuning uchun kun almashganda hech qanday fon vazifasi kerak emas —
 *  keyingi o'qishda holat o'zi to'g'rilanadi.
 *
 *  Client+server ikkalasida ishlaydi ("use server" emas), sana solishtiruvi
 *  esa doim Asia/Tashkent bo'yicha — server qaysi zonada turishidan qat'i
 *  nazar natija bir xil bo'lsin.
 */

import type { PlanStatus } from "@/lib/types";

/** Necha kundan keyin bajarilmagan reja arxivga tushadi. */
export const ARCHIVE_AFTER_DAYS = 7;

/** Shu songa yetgach "Bugunga ko'chirish" tugmasi bloklanadi. */
export const DEFER_LIMIT = 3;

/** Asia/Tashkent — UTC+5, yil bo'yi o'zgarmaydi (DST yo'q). */
const TASHKENT_OFFSET_MS = 5 * 60 * 60_000;

/** Toshkent vaqti bo'yicha bugungi sana, YYYY-MM-DD. */
export function todayInTashkent(now: Date = new Date()): string {
  const tz = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  const y = tz.getUTCFullYear();
  const m = String(tz.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tz.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD → UTC yarim tunidagi ms. Zona siljishisiz kun farqini
 *  hisoblash uchun (ikkala sana ham bir xil usulda parse qilinadi). */
function dayMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

/** `from` dan `to` gacha to'liq kunlar soni (to > from bo'lsa musbat). */
export function daysBetween(from: string, to: string): number {
  return Math.round((dayMs(to) - dayMs(from)) / 86_400_000);
}

type StatusInput = {
  status: PlanStatus;
  scheduledFor: string;
};

/**
 * Ko'rsatiladigan holat.
 *
 *   DONE / CANCELLED / ARCHIVED  → o'zgarmaydi (foydalanuvchi qarori)
 *   scheduledFor >= bugun        → TODO (yoki IN_PROGRESS saqlangan bo'lsa)
 *   scheduledFor < bugun, <7 kun → MISSED
 *   scheduledFor < bugun, >=7 kun→ ARCHIVED
 */
export function effectiveStatus(
  plan: StatusInput,
  today: string = todayInTashkent()
): PlanStatus {
  if (plan.status === "DONE" || plan.status === "CANCELLED" || plan.status === "ARCHIVED") {
    return plan.status;
  }

  // Bugun va kelajak — hali muddati o'tmagan. Saqlangan MISSED (masalan
  // qo'lda qo'yilgan) ham sana kelajakka ko'chirilgach TODO'ga qaytadi.
  if (plan.scheduledFor >= today) {
    return plan.status === "IN_PROGRESS" ? "IN_PROGRESS" : "TODO";
  }

  return daysBetween(plan.scheduledFor, today) >= ARCHIVE_AFTER_DAYS
    ? "ARCHIVED"
    : "MISSED";
}

/**
 * Sana o'zgarishi "kechiktirish" sanaladimi?
 *
 * Faqat muddati kelgan yoki o'tgan ish kechroqqa surilganda. Kelajakdagi
 * rejani boshqa kunga tartiblash (dushanba → seshanba) kechiktirish emas.
 */
export function isDeferral(
  oldScheduledFor: string,
  newScheduledFor: string,
  today: string = todayInTashkent()
): boolean {
  return oldScheduledFor <= today && newScheduledFor > oldScheduledFor;
}

/** Kartochkadagi yozuv: necha marta ko'chirilgani ("2-marta ko'chirilyapti").
 *  Hali ko'chirilmagan bo'lsa — yozuv yo'q. */
export function deferLabel(deferCount: number): string | null {
  if (deferCount <= 0) return null;
  return `${deferCount}-marta ko'chirilyapti`;
}
