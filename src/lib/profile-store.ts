"use client";

import { useEffect, useState } from "react";
import { getMyProfile, type MyProfile } from "@/lib/user-settings-actions";

/* Joriy foydalanuvchi profilini bir marta yuklab, ilova bo'ylab ulashadi
   (sidebar + mobil Boshqaruv paneli avatari uchun). */
let cache: MyProfile | null = null;
let fetched = false;
const listeners = new Set<() => void>();

export function useProfile(): MyProfile | null {
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    if (!fetched) {
      fetched = true;
      void getMyProfile()
        .then((res) => { cache = res; for (const l of listeners) l(); })
        .catch(() => {});
    }
    return () => { listeners.delete(rerender); };
  }, []);
  return cache;
}
