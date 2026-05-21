"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Faq = { q: string; a: string };

export function FaqList({ items }: { items: Faq[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="not-prose divide-y divide-border/70 rounded-lg border border-border bg-surface">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="px-4">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left text-[14px] font-medium"
            >
              <span className="flex-1">{f.q}</span>
              <span
                aria-hidden
                className={cn(
                  "grid size-5 shrink-0 place-items-center text-[18px] leading-none text-faint transition-transform duration-200 ease-out",
                  isOpen && "rotate-45"
                )}
              >
                +
              </span>
            </button>

            <div
              id={`faq-panel-${i}`}
              role="region"
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <p
                  className={cn(
                    "pb-3 text-[13.5px] leading-relaxed text-muted transition-opacity duration-200",
                    isOpen ? "opacity-100" : "opacity-0"
                  )}
                >
                  {f.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
