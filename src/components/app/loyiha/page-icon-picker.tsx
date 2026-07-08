"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog } from "../widgets/dialog";
import {
  PAGE_ICON_CHOICES, PageIcon, SOCIAL_ICON_CHOICES,
} from "./page-icons";

/** Sahifa ikonini tanlash — hujjat mavzusiga mos umumiy ikonalar +
 *  ijtimoiy tarmoq belgilari (Instagram, Telegram, YouTube va h.k.).
 *  Bosilgan zahoti tanlanadi va oyna yopiladi. */
export function PageIconPicker({
  value,
  onClose,
  onSelect,
}: {
  value?: string | null;
  onClose: () => void;
  onSelect: (icon: string) => void;
}) {
  function pick(k: string) {
    onSelect(k);
    onClose();
  }

  return (
    <Dialog open onClose={onClose} mobilePlacement="center">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <p className="text-[16px] font-semibold tracking-[-0.01em]">Ikonani tanlash</p>
        <button type="button" onClick={onClose} aria-label="Yopish" className="-mr-1 grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><X className="size-4" /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
        <div>
          <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">Hujjat</label>
          <div className="grid grid-cols-8 gap-1.5">
            {PAGE_ICON_CHOICES.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => pick(k)}
                className={cn(
                  "grid aspect-square place-items-center rounded-lg border transition-colors",
                  value === k ? "border-accent bg-accent text-accent-ink" : "border-border text-muted hover:text-foreground"
                )}
              >
                <PageIcon k={k} className="size-4" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">Ijtimoiy tarmoq</label>
          <div className="grid grid-cols-8 gap-1.5">
            {SOCIAL_ICON_CHOICES.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => pick(k)}
                className={cn(
                  "grid aspect-square place-items-center rounded-lg border transition-colors",
                  value === k ? "border-accent bg-accent text-accent-ink" : "border-border text-muted hover:text-foreground"
                )}
              >
                <PageIcon k={k} className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
