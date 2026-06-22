import type { Debt } from "./types";

/* Qarz muddati eslatmasi — derivatsiya (alohida ma'lumot saqlanmaydi).
   Qarz hal qilinganda eslatma avtomatik yo'qoladi. */

/** Muddatdan oldin necha kun ko'rinsin — mavjud vaqtga moslashuvchan variantlar.
 *  (Muddat yaqin bo'lsa, faqat sig'adigan variantlar chiqadi.) */
export function debtLeadOptions(daysUntilDue: number): { value: number; label: string }[] {
  // Har bir lead variant kamida 2× vaqt bo'lgandagina chiqadi (lead muddatga
  // juda yaqin/yaratilgan kunга tushib qolmasligi uchun).
  const opts = [{ value: 0, label: "Muddat kuni" }];
  if (daysUntilDue >= 2) opts.push({ value: 1, label: "1 kun oldin" });
  if (daysUntilDue >= 6) opts.push({ value: 3, label: "3 kun oldin" });
  if (daysUntilDue >= 14) opts.push({ value: 7, label: "1 hafta oldin" });
  return opts;
}

/** YYYY-MM-DD ni `days` kunga suradi (kalendar bo'yicha). */
export function shiftIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** Ikki YYYY-MM-DD orasidagi kunlar farqi (b - a). */
export function daysBetween(aIso: string, bIso: string): number {
  const [ay, am, ad] = aIso.split("-").map(Number);
  const [by, bm, bd] = bIso.split("-").map(Number);
  return Math.round(
    (new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86400000
  );
}

export type DebtReminder = {
  debt: Debt;
  overdue: boolean; // muddat o'tib ketgan
  outstanding: number; // qolgan summa (so'm)
};

/** `todayIso` kuni ko'rinishi kerak bo'lgan faol qarz eslatmalari.
 *  Shart: agendaReminder yoqilgan · muddat bor · hal qilinmagan · lead oynasi
 *  boshlangan · kechiktirilmagan · qolgan summa > 0. */
export function debtRemindersForToday(debts: Debt[], todayIso: string): DebtReminder[] {
  const out: DebtReminder[] = [];
  for (const d of debts) {
    if (!d.agendaReminder || !d.dueDate || d.settledAt) continue;
    const showFrom = shiftIso(d.dueDate, -(d.reminderLeadDays ?? 0));
    if (todayIso < showFrom) continue; // lead oynasi hali boshlanmagan
    if (d.snoozedUntil && todayIso < d.snoozedUntil) continue; // kechiktirilgan
    const outstanding = d.amount - d.paidAmount;
    if (outstanding <= 0) continue;
    out.push({ debt: d, overdue: todayIso > d.dueDate, outstanding });
  }
  // Muddat o'tganlar tepada, keyin muddatga yaqinligi bo'yicha.
  out.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return (a.debt.dueDate ?? "").localeCompare(b.debt.dueDate ?? "");
  });
  return out;
}
