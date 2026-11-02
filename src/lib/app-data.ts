"use client";

import type { AppData } from "@/app/api/app-data/route";

/* Ilovaga kirishda bo'limlar ma'lumoti navbat bilan keladi: avval tasklar,
   keyin moliya, keyin qolganlari — store'lar shu javoblardan to'ldiriladi.
   Server action emas: action'lar ketma-ket navbatda ishlaydi, bu so'rovlar esa
   navigatsiya va boshqa action'larni to'sib qo'ymaydi. Xatoda `null` — har bir
   store o'z action'i bilan yuklashga qaytadi. */

type Part = keyof AppData;

function fetchPart<P extends Part>(part: P): Promise<AppData[P] | null> {
  return fetch(`/api/app-data?part=${part}`)
    .then((res) => (res.ok ? (res.json() as Promise<AppData[P]>) : null))
    .catch(() => null);
}

let requests: { [P in Part]: Promise<AppData[P] | null> } | null = null;

export function appData<P extends Part>(part: P): Promise<AppData[P] | null> {
  if (!requests) {
    const tasks = fetchPart("tasks");
    const finance = tasks.then(() => fetchPart("finance"));
    const rest = finance.then(() => fetchPart("rest"));
    requests = { tasks, finance, rest };
  }
  return requests[part];
}
