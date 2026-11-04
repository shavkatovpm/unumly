"use client";

import { useEffect, useState } from "react";
import type { MyProfile } from "@/lib/user-settings-actions";
import { read } from "@/lib/read";

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
      void read("getMyProfile")
        .then((res) => { cache = res; for (const l of listeners) l(); })
        .catch(() => {});
    }
    return () => { listeners.delete(rerender); };
  }, []);
  return cache;
}
