"use client";

import type { AppData } from "@/app/api/app-data/route";

/* Ilovaga kirishda barcha bo'limlar ma'lumoti bitta so'rovda keladi — store'lar
   shu javobdan to'ldiriladi. Server action emas: action'lar ketma-ket navbatda
   ishlaydi, bu so'rov esa navigatsiya va boshqa action'larni to'sib qo'ymaydi.
   Xatoda `null` — har bir store o'z action'i bilan yuklashga qaytadi. */

let request: Promise<AppData | null> | null = null;

export function appData(): Promise<AppData | null> {
  request ??= fetch("/api/app-data")
    .then((res) => (res.ok ? (res.json() as Promise<AppData>) : null))
    .catch(() => null);
  return request;
}
