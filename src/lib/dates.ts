import type { PlanScope } from "@/lib/types";

const UZ_MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

const UZ_WEEKDAYS = [
  "yakshanba", "dushanba", "seshanba", "chorshanba",
  "payshanba", "juma", "shanba",
];

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

export function endOfWeek(d = new Date()) {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function startOfMonth(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function endOfMonth(d = new Date()) {
  const x = startOfMonth(d);
  x.setMonth(x.getMonth() + 1);
  x.setMilliseconds(-1);
  return x;
}

export function startOfYear(d = new Date()) {
  const x = startOfDay(d);
  x.setMonth(0, 1);
  return x;
}

export function endOfYear(d = new Date()) {
  const x = startOfYear(d);
  x.setFullYear(x.getFullYear() + 1);
  x.setMilliseconds(-1);
  return x;
}

export function scopeRange(scope: PlanScope, d = new Date()) {
  switch (scope) {
    case "DAILY":   return { from: startOfDay(d),   to: endOfDay(d) };
    case "WEEKLY":  return { from: startOfWeek(d),  to: endOfWeek(d) };
    case "MONTHLY": return { from: startOfMonth(d), to: endOfMonth(d) };
    case "YEARLY":  return { from: startOfYear(d),  to: endOfYear(d) };
  }
}

export function formatUzDate(d = new Date()) {
  const day = d.getDate();
  const month = UZ_MONTHS[d.getMonth()];
  const weekday = UZ_WEEKDAYS[d.getDay()];
  return `${day}-${month}, ${weekday}`;
}

export function formatUzMonth(d = new Date()) {
  return `${UZ_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

export function formatScopeHeading(scope: PlanScope, d = new Date()) {
  switch (scope) {
    case "DAILY":   return formatUzDate(d);
    case "WEEKLY":  {
      const from = startOfWeek(d);
      const to = endOfWeek(d);
      return `${from.getDate()}–${to.getDate()} ${UZ_MONTHS[to.getMonth()]}`;
    }
    case "MONTHLY": return formatUzMonth(d);
    case "YEARLY":  return String(d.getFullYear());
  }
}

export function toDateInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getCalendarGrid(d: Date) {
  // Returns 6 rows × 7 days of Date objects for the month containing d.
  // Monday-first weeks.
  const first = startOfMonth(d);
  const firstWeekday = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(start.getDate() - firstWeekday);

  const grid: Date[][] = [];
  for (let row = 0; row < 6; row++) {
    const week: Date[] = [];
    for (let col = 0; col < 7; col++) {
      const cell = new Date(start);
      cell.setDate(start.getDate() + row * 7 + col);
      week.push(cell);
    }
    grid.push(week);
  }
  return grid;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatTime(time: string | undefined) {
  if (!time) return "";
  return time;
}

export function parseTimeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function formatDateLong(d: Date) {
  return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`;
}

export function fromDateInputValue(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export type OccupiedSlot = { time: string; title: string };

/**
 * Returns every 15-minute HH:MM slot occupied by the given plans on the given
 * date, together with the title of the plan occupying it (so the time
 * picker can show *what* is already scheduled there). Pass `excludeId` to
 * skip a plan (useful when editing — so the plan does not block its own
 * time).
 */
export function occupiedTimeSlots(
  plans: { id: string; scope?: string; status?: string; scheduledFor?: string; time?: string; duration?: number; title?: string }[],
  dateIso: string,
  excludeId?: string
): OccupiedSlot[] {
  const out: OccupiedSlot[] = [];
  for (const p of plans) {
    if (p.scope !== "DAILY") continue;
    if (p.scheduledFor !== dateIso) continue;
    if (!p.time) continue;
    // Completed tasks free up their time slot so the user can reuse it.
    if (p.status === "DONE") continue;
    if (excludeId && p.id === excludeId) continue;
    const [h, m] = p.time.split(":").map(Number);
    const start = h * 60 + m;
    const dur = p.duration ?? 15;
    for (let t = start; t < start + dur; t += 15) {
      const sh = Math.floor(t / 60);
      const sm = t % 60;
      out.push({ time: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`, title: p.title ?? "" });
    }
  }
  return out;
}
