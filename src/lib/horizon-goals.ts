/* Davriy maqsadlar — sof yordamchilar (server va klient uchun umumiy).
   Davr `periodStart` (YYYY-MM-DD) bilan aniqlanadi: hafta — dushanba,
   oy — 1-sana, 3 oylik — chorak boshi (yan/apr/iyul/okt), yil — 1-yanvar. */

import type { GoalHorizon } from "@/lib/types";

export const HORIZONS: { id: GoalHorizon; label: string; adjective: string }[] = [
  { id: "WEEK", label: "Hafta", adjective: "Haftalik" },
  { id: "MONTH", label: "Oy", adjective: "Oylik" },
  { id: "QUARTER", label: "3 oy", adjective: "3 oylik" },
  { id: "YEAR", label: "Yil", adjective: "Yillik" },
];

export const horizonMeta = (h: GoalHorizon) => HORIZONS.find((x) => x.id === h)!;

/** Har bir daraja o'zidan bir pog'ona yuqoridagi maqsadlarga tayanadi. */
export function parentHorizon(h: GoalHorizon): GoalHorizon | null {
  return h === "WEEK" ? "MONTH" : h === "MONTH" ? "QUARTER" : h === "QUARTER" ? "YEAR" : null;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function todayIso(): string {
  return toIso(new Date());
}

/** Berilgan sana tushadigan davrning boshi. */
export function periodStartOf(h: GoalHorizon, iso: string): string {
  const d = fromIso(iso);
  if (h === "WEEK") {
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return toIso(d);
  }
  if (h === "MONTH") return toIso(new Date(d.getFullYear(), d.getMonth(), 1));
  if (h === "QUARTER") return toIso(new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1));
  return toIso(new Date(d.getFullYear(), 0, 1));
}

/** Oldingi/keyingi davr boshi. */
export function shiftPeriod(h: GoalHorizon, start: string, delta: number): string {
  const d = fromIso(start);
  if (h === "WEEK") d.setDate(d.getDate() + 7 * delta);
  else if (h === "MONTH") d.setMonth(d.getMonth() + delta);
  else if (h === "QUARTER") d.setMonth(d.getMonth() + 3 * delta);
  else d.setFullYear(d.getFullYear() + delta);
  return toIso(d);
}

/** Bir pog'ona past daraja; haftalikdan keyin — kunlik task (null). */
export function lowerHorizon(h: GoalHorizon): GoalHorizon | null {
  return h === "YEAR" ? "QUARTER" : h === "QUARTER" ? "MONTH" : h === "MONTH" ? "WEEK" : null;
}

/** Pastga o'tkazish tugmasi matni: harakat va bajarilgan holat. */
export const MOVE_LABELS: Record<GoalHorizon, { action: string; moved: string }> = {
  WEEK: { action: "Bugunga", moved: "Bugunda" },
  MONTH: { action: "Haftaga", moved: "Haftada" },
  QUARTER: { action: "Oyga", moved: "Oyda" },
  YEAR: { action: "3 oyga", moved: "3 oyda" },
};

/** Pastga o'tkazilganda qaysi davrga tushadi: manba davri hozir bo'lsa —
 *  joriy davr, aks holda manba davrining boshi. */
export function moveTargetPeriod(h: GoalHorizon, start: string, today: string): string | null {
  const lower = lowerHorizon(h);
  if (!lower) return null;
  return periodStartOf(lower, periodStartOf(h, today) === start ? today : start);
}

const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Qisqa sana: "5-noyabr". */
export function shortDate(iso: string): string {
  const d = fromIso(iso);
  return `${d.getDate()}-${MONTHS[d.getMonth()]}`;
}

/** Davr sarlavhasi: sana diapazoni / oy / chorak / yil. */
export function periodRange(h: GoalHorizon, start: string): string {
  const d = fromIso(start);
  if (h === "WEEK") {
    const end = fromIso(start);
    end.setDate(end.getDate() + 6);
    return d.getMonth() === end.getMonth()
      ? `${d.getDate()}–${end.getDate()}-${MONTHS[end.getMonth()]}`
      : `${d.getDate()}-${MONTHS[d.getMonth()]} – ${end.getDate()}-${MONTHS[end.getMonth()]}`;
  }
  if (h === "MONTH") return `${cap(MONTHS[d.getMonth()])} ${d.getFullYear()}`;
  if (h === "QUARTER") {
    const end = new Date(d.getFullYear(), d.getMonth() + 2, 1);
    return `${cap(MONTHS[d.getMonth()])} – ${MONTHS[end.getMonth()]} ${d.getFullYear()}`;
  }
  return String(d.getFullYear());
}

/** Joriy davrga nisbatan nom: "Bu hafta", "Keyingi oy" va h.k. */
export function periodName(h: GoalHorizon, start: string, today: string): string {
  const cur = periodStartOf(h, today);
  const unit = h === "WEEK" ? "hafta" : h === "MONTH" ? "oy" : h === "QUARTER" ? "chorak" : "yil";
  if (start === cur) return `Bu ${unit}`;
  if (start === shiftPeriod(h, cur, 1)) return `Keyingi ${unit}`;
  if (start === shiftPeriod(h, cur, -1)) return `O'tgan ${unit}`;
  return cap(unit);
}
