"use client";

import { Loader2 } from "lucide-react";

/** Small inline loader for view content while plans are first fetched. */
export function ListLoader({ label = "Yuklanmoqda…" }: { label?: string }) {
  return (
    <div className="fade-in flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <Loader2 className="size-5 animate-spin text-faint" />
      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
        {label}
      </p>
    </div>
  );
}
