/** Client+server safe utilities for Tezkor. Kept separate from
 *  tezkor-actions.ts because that file is "use server" — only async
 *  exports survive the RSC build there. */

const UZ_MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

/** Default UZ-formatted list name: "Ro'yhat — 23-may 14:30" (Tashkent TZ). */
export function defaultListName(now: Date = new Date()): string {
  // Format in Asia/Tashkent (UTC+5) regardless of server zone.
  const tz = new Date(now.getTime() + 5 * 60 * 60_000);
  const day = tz.getUTCDate();
  const m = UZ_MONTHS[tz.getUTCMonth()];
  const hh = String(tz.getUTCHours()).padStart(2, "0");
  const mm = String(tz.getUTCMinutes()).padStart(2, "0");
  return `Ro'yhat — ${day}-${m} ${hh}:${mm}`;
}
