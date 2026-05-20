/**
 * Normalise a phone number to E.164 (`+998901234567`).
 *
 * - strips spaces, hyphens, parentheses, leading `00`
 * - prepends `+` if missing
 * - returns null if the result doesn't look like a valid E.164 number
 *   (8–15 digits after the `+`).
 */
export function normalisePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = String(input).trim();
  // strip spaces, hyphens, parentheses
  s = s.replace(/[\s\-()]/g, "");
  // 00... → +...
  if (s.startsWith("00")) s = "+" + s.slice(2);
  // bare digits → +digits
  if (/^\d+$/.test(s)) s = "+" + s;
  if (!/^\+\d{8,15}$/.test(s)) return null;
  return s;
}
