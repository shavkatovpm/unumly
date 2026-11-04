"use client";

import type { Readers } from "@/lib/read-registry";

/* Ma'lumot o'qish — oddiy GET (/api/read). Server action emas: action'lar
   navigatsiya bilan bitta navbatda ishlaydi va sahifadan chiqqandan keyin tugasa,
   ilovani o'sha sahifaga qaytarib yuboradi. Xatoda reject — store'lar ushlaydi. */
export async function read<K extends keyof Readers>(
  fn: K,
  ...args: Parameters<Readers[K]>
): Promise<Awaited<ReturnType<Readers[K]>>> {
  const qs = new URLSearchParams({ fn });
  // Oxiridagi undefined'lar tashlanadi (JSON'da null bo'lib ketmasin).
  const list: unknown[] = [...args];
  while (list.length && list[list.length - 1] === undefined) list.pop();
  if (list.length) qs.set("args", JSON.stringify(list));
  const res = await fetch(`/api/read?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`read ${fn}: ${res.status}`);
  return res.json();
}
