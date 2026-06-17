/** So'm summasini bo'shliq bilan guruhlab formatlaydi: 1250000 → "1 250 000". */
export function formatSom(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** "1 250 000 so'm" — to'liq yorliq. */
export function formatSomLabel(n: number): string {
  return `${formatSom(n)} so'm`;
}

/** "YYYY-MM" — joriy oy kaliti (Date'dan). */
export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" — sana kaliti (Date'dan, local). */
export function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

/** "2026-06" → "Iyun 2026". */
export function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return `${UZ_MONTHS[m - 1]} ${y}`;
}

/** Oy kalitini siljitish: "2026-06" + (-1) → "2026-05". */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}
