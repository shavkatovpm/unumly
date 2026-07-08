"use client";

/**
 * Onboarding holatini localStorage'da saqlash. Har bir bo'lim (yoki global
 * tanishuv) bir marta ko'rsatiladi. Test bosqichida faqat "welcome" va
 * "coach:bugun" ishlatiladi; keyin boshqa bo'limlarga ham qo'shiladi.
 */

const PREFIX = "unumly:onboarding:";

export function hasSeen(key: string): boolean {
  if (typeof window === "undefined") return true; // SSR: ko'rsatmaymiz
  try {
    return window.localStorage.getItem(PREFIX + key) === "1";
  } catch {
    return true;
  }
}

export function markSeen(key: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, "1");
  } catch {
    /* ignore */
  }
}

/** Test/qayta ko'rish uchun — konsoldan chaqirish mumkin. */
export function resetOnboarding(...keys: string[]): void {
  try {
    if (keys.length === 0) {
      // Barcha onboarding kalitlarini tozalash
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(PREFIX)) window.localStorage.removeItem(k);
      }
    } else {
      for (const k of keys) window.localStorage.removeItem(PREFIX + k);
    }
  } catch {
    /* ignore */
  }
}
