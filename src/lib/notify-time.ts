/** Allowed lead-time presets (minutes before the task). 0 = at the
 *  scheduled time exactly ("O'z vaqtida").
 *
 *  The notify cron now runs every 1 minute (moved off Neon's compute-based
 *  billing onto a DO droplet), so presets no longer need to be multiples of
 *  10 to land on a cron tick — back to the original, more granular set. */
export const LEAD_MIN_OPTIONS = [0, 5, 15, 30] as const;
export type LeadMin = (typeof LEAD_MIN_OPTIONS)[number];
export const DEFAULT_LEAD_MIN: LeadMin = 5;

/** Clamp arbitrary input to a valid LeadMin (falls back to default). */
export function sanitizeLeadMin(v: number | null | undefined): LeadMin {
  return LEAD_MIN_OPTIONS.includes(v as LeadMin) ? (v as LeadMin) : DEFAULT_LEAD_MIN;
}

/** Short label for inline display ("O'z vaqtida" / "5 daq. oldin"). */
export function formatLeadLabel(lead: number): string {
  return lead <= 0 ? "O'z vaqtida" : `${lead} daq. oldin`;
}

/** Full popover label ("O'z vaqtida" / "5 daqiqa avval"). */
export function formatLeadOptionLabel(lead: number): string {
  return lead <= 0 ? "O'z vaqtida" : `${lead} daqiqa avval`;
}

/**
 * Compute the UTC instant when a plan's reminder should fire.
 *
 * Plans store `scheduledFor` as YYYY-MM-DD (calendar date) and `time` as
 * HH:MM (local time). We treat both as Asia/Tashkent (UTC+5, no DST) and
 * convert to a UTC `Date` for the cron query. The result is then shifted
 * `leadMin` minutes earlier so the user gets the reminder ahead of time.
 *
 * Returns `null` if `time` is missing or the input is malformed.
 */
export function computeNotifyAt(
  scheduledFor: string | null | undefined,
  time: string | null | undefined,
  leadMin: number = DEFAULT_LEAD_MIN
): Date | null {
  if (!scheduledFor || !time) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledFor)) return null;
  if (!/^\d{2}:\d{2}$/.test(time)) return null;

  // Compose ISO 8601 with explicit Tashkent offset.
  const iso = `${scheduledFor}T${time}:00+05:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (leadMin > 0) d.setTime(d.getTime() - leadMin * 60_000);
  return d;
}
