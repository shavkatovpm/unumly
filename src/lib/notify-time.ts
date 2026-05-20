/**
 * Compute the UTC instant when a plan's reminder should fire.
 *
 * Plans store `scheduledFor` as YYYY-MM-DD (calendar date) and `time` as
 * HH:MM (local time). We treat both as Asia/Tashkent (UTC+5, no DST) and
 * convert to a UTC `Date` for the cron query.
 *
 * Returns `null` if `time` is missing or the input is malformed.
 */
export function computeNotifyAt(
  scheduledFor: string | null | undefined,
  time: string | null | undefined
): Date | null {
  if (!scheduledFor || !time) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledFor)) return null;
  if (!/^\d{2}:\d{2}$/.test(time)) return null;

  // Compose ISO 8601 with explicit Tashkent offset.
  const iso = `${scheduledFor}T${time}:00+05:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
