"use client";

import {
  Calendar as CalendarIcon,
  ClipboardList,
  HandCoins,
  Inbox,
  ListChecks,
  Repeat,
  Target,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Items that can sit in the mobile bottom nav's primary slots.
 *  "Boshqaruv" is always pinned on the right and is NOT configurable. */
export type NavItemId = "bugun" | "agenda" | "tezkor" | "reja" | "kalendar" | "odat" | "maqsad" | "moliya" | "qarz";

export type NavItem = {
  id: NavItemId;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Show the live "Bugun" count badge on this item. */
  showTodayCount?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { id: "bugun",    href: "/bugun",    label: "Bugun",    icon: Inbox,         showTodayCount: true },
  { id: "agenda",   href: "/agenda",   label: "Agenda",   icon: ListChecks },
  { id: "tezkor",   href: "/tezkor",   label: "Tezkor",   icon: Zap },
  { id: "reja",     href: "/reja",     label: "Reja",     icon: ClipboardList },
  { id: "kalendar", href: "/kalendar", label: "Kalendar", icon: CalendarIcon },
  { id: "odat",     href: "/odat",     label: "Odat",     icon: Repeat },
  { id: "maqsad",   href: "/maqsad",   label: "Maqsad",   icon: Target },
  { id: "moliya",   href: "/moliya",   label: "Moliya",   icon: Wallet },
  { id: "qarz",     href: "/qarz",     label: "Qarz",     icon: HandCoins },
];

export const STORAGE_PRIMARY = "unumly:mobilenav:primary";
export const DEFAULT_PRIMARY: NavItemId[] = ["bugun", "agenda", "tezkor"];

/** Min/max configurable slots (Boshqaruv is pinned on top of these). */
export const MIN_PRIMARY = 2;
export const MAX_PRIMARY = 4;

/** Fired on the window whenever the primary selection changes, so any
 *  mounted nav can re-read without a page reload. */
export const NAV_CHANGE_EVENT = "unumly:mobilenav:change";

function isValidId(id: unknown): id is NavItemId {
  return typeof id === "string" && NAV_ITEMS.some((i) => i.id === id);
}

export function loadPrimaryIds(): NavItemId[] {
  if (typeof window === "undefined") return DEFAULT_PRIMARY;
  try {
    const raw = window.localStorage.getItem(STORAGE_PRIMARY);
    if (!raw) return DEFAULT_PRIMARY;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_PRIMARY;
    const cleaned = parsed.filter(isValidId).slice(0, MAX_PRIMARY);
    return cleaned.length >= MIN_PRIMARY ? cleaned : DEFAULT_PRIMARY;
  } catch {
    return DEFAULT_PRIMARY;
  }
}

export function savePrimaryIds(ids: NavItemId[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PRIMARY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(NAV_CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

export function resolvePrimaryItems(ids: NavItemId[]): NavItem[] {
  return ids
    .map((id) => NAV_ITEMS.find((i) => i.id === id))
    .filter((i): i is NavItem => Boolean(i));
}
