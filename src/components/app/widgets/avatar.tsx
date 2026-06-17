"use client";

import { cn } from "@/lib/utils";

/** Foydalanuvchi avatari — Telegram profil rasmi bo'lsa o'shani, aks holda
 *  ismning birinchi harfini ko'rsatadi. `className` o'lcham/matn-o'lchamini beradi. */
export function Avatar({
  name,
  photoUrl,
  className,
}: {
  name?: string | null;
  photoUrl?: string | null;
  className?: string;
}) {
  const initial = (name?.trim()?.[0] ?? "U").toUpperCase();
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-md object-cover", className)}
      />
    );
  }
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-md bg-accent font-medium text-accent-ink", className)}>
      {initial}
    </span>
  );
}
