/* Reja mobil ko'rinishi uchun qisqa sana/davomiylik matnlari. */

import { fromDateInputValue, startOfDay, toDateInputValue } from "@/lib/dates";

const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const DAY = 86_400_000;

/** "bugun" / "kecha" / "3 kun oldin" / "26-oktabr". */
export function relAgo(isoTime: string): string {
  const t = new Date(isoTime);
  const d = Math.round((startOfDay().getTime() - startOfDay(t).getTime()) / DAY);
  if (d <= 0) return "bugun";
  if (d === 1) return "kecha";
  if (d < 7) return `${d} kun oldin`;
  return `${t.getDate()}-${MONTHS[t.getMonth()]}`;
}

/** "Bugun" / "Ertaga" / "12-noy" — kichik katak uchun. */
export function shortDay(iso: string, today: Date): string {
  if (iso === toDateInputValue(today)) return "Bugun";
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (iso === toDateInputValue(tomorrow)) return "Ertaga";
  const d = fromDateInputValue(iso);
  return `${d.getDate()}-${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** "Bugunga" / "Ertaga" / "12-noyabrga" — o'tkazish yo'nalishi. */
export function toDay(iso: string, today: Date): string {
  const s = shortDay(iso, today);
  if (s === "Ertaga") return s;
  if (s === "Bugun") return "Bugunga";
  const d = fromDateInputValue(iso);
  return `${d.getDate()}-${MONTHS[d.getMonth()]}ga`;
}

export function durLabel(m: number): string {
  if (m < 60) return `${m} daq`;
  if (m % 60 === 0) return `${m / 60} soat`;
  return `${Math.floor(m / 60)} s ${m % 60} daq`;
}
