"use client";

import type { Plan } from "@/lib/types";
import { importPlans } from "@/lib/plans-actions";

const OLD_PLANS_KEY = "unumly:plans:v1";
const FLAG_KEY = "unumly:migrated:v1";

/**
 * One-time migration: pushes any `localStorage` plans to the user's DB
 * account, then clears the local data. Idempotent and safe to call on
 * every authenticated mount.
 */
export async function migrateLocalStorageOnce(): Promise<{ imported: number }> {
  if (typeof window === "undefined") return { imported: 0 };

  try {
    if (window.localStorage.getItem(FLAG_KEY)) return { imported: 0 };
  } catch {
    return { imported: 0 };
  }

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(OLD_PLANS_KEY);
  } catch {
    return { imported: 0 };
  }
  if (!raw) {
    // Nothing to migrate — still set the flag so we don't keep checking
    try { window.localStorage.setItem(FLAG_KEY, "1"); } catch { /**/ }
    return { imported: 0 };
  }

  let plans: Plan[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) plans = parsed as Plan[];
  } catch {
    return { imported: 0 };
  }
  if (plans.length === 0) {
    try { window.localStorage.setItem(FLAG_KEY, "1"); } catch { /**/ }
    return { imported: 0 };
  }

  try {
    const result = await importPlans(
      plans.map((p) => ({
        id: p.id,
        title: p.title,
        notes: p.notes,
        scope: p.scope,
        scheduledFor: p.scheduledFor,
        time: p.time,
        duration: p.duration,
        priority: p.priority,
      }))
    );
    try {
      window.localStorage.setItem(FLAG_KEY, "1");
      window.localStorage.removeItem(OLD_PLANS_KEY);
    } catch { /**/ }
    return result;
  } catch {
    // Will retry on next mount
    return { imported: 0 };
  }
}
