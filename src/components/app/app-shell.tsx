"use client";

import { useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlans } from "@/lib/plans-store";
import { startOfDay, toDateInputValue } from "@/lib/dates";
import { Sidebar } from "./sidebar";

const STORAGE_OPEN = "unumly:sidebar:open";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { plans } = usePlans();
  const todayIso = useMemo(() => toDateInputValue(startOfDay()), []);
  const todayCount = useMemo(
    () =>
      plans.filter(
        (p) => p.scope === "DAILY" && p.scheduledFor === todayIso && p.status !== "DONE"
      ).length,
    [plans, todayIso]
  );

  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) {
      setOpen(false);
      return;
    }
    try {
      const v = window.localStorage.getItem(STORAGE_OPEN);
      if (v === "0") setOpen(false);
    } catch {
      /* ignore */
    }
  }, []);

  function toggle(next: boolean) {
    setOpen(next);
    // Persist only the desktop preference (mobile always starts closed)
    if (typeof window !== "undefined" && !window.matchMedia("(max-width: 767px)").matches) {
      try {
        window.localStorage.setItem(STORAGE_OPEN, next ? "1" : "0");
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Hamburger toggle — fixed top-left, morphs between Menu and X */}
      <button
        type="button"
        onClick={() => toggle(!open)}
        aria-label={open ? "Sidebarni yopish" : "Sidebarni ochish"}
        title={open ? "Sidebarni yopish" : "Sidebarni ochish"}
        className="fixed left-3 top-2.5 z-50 grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground"
      >
        <Menu
          className={cn(
            "absolute size-4 transition-all duration-200",
            open ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
          )}
        />
        <X
          className={cn(
            "absolute size-4 transition-all duration-200",
            open ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
          )}
        />
      </button>

      <Sidebar todayCount={todayCount} open={open} onCloseRequested={() => toggle(false)} />
      <main
        className={cn(
          "relative flex-1 overflow-hidden transition-[padding] duration-300 ease-out",
          // Padding-left only on desktop when sidebar is collapsed (to leave space for hamburger).
          // On mobile, hamburger floats so always leave a bit of room.
          "pl-10 md:pl-0",
          !open && "md:pl-10"
        )}
      >
        {children}
      </main>
    </div>
  );
}
