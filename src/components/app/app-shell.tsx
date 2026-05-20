"use client";

import { useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { refreshPlans, usePlans } from "@/lib/plans-store";
import { migrateLocalStorageOnce } from "@/lib/migrate-localstorage";
import { startOfDay, toDateInputValue } from "@/lib/dates";
import { Sidebar } from "./sidebar";
import { MobileBottomNav } from "./mobile-bottom-nav";

const STORAGE_OPEN = "unumly:sidebar:open";

function readInitialOpen(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(max-width: 767px)").matches) return false;
  try {
    return window.localStorage.getItem(STORAGE_OPEN) !== "0";
  } catch {
    return true;
  }
}

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

  const [open, setOpen] = useState(readInitialOpen);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // One-time localStorage → DB migration (only runs if the user had local
  // plans from before backend was enabled). After import, refresh the
  // store from server so the new rows appear.
  useEffect(() => {
    void (async () => {
      const { imported } = await migrateLocalStorageOnce();
      if (imported > 0) await refreshPlans();
    })();
  }, []);

  // Telegram WebApp init — agar ilova Telegram Mini App ichida ishlasa,
  // viewport'ni to'liq kengaytirish va swipe-to-close ni o'chirish.
  // Klaviatura ochilganda webview o'z scroll'i bilan asosiy elementlarni
  // siljitishini kamaytiradi.
  useEffect(() => {
    let attempts = 0;
    function init() {
      const tg = (window as unknown as { Telegram?: { WebApp?: {
        ready: () => void;
        expand: () => void;
        isExpanded: boolean;
        viewportStableHeight?: number;
        viewportHeight?: number;
        onEvent?: (event: string, handler: () => void) => void;
        disableVerticalSwipes?: () => void;
      } } }).Telegram?.WebApp;
      if (!tg) {
        if (attempts++ < 30) setTimeout(init, 100);
        return;
      }
      tg.ready();
      tg.expand();
      try { tg.disableVerticalSwipes?.(); } catch { /* old clients */ }

      function syncViewport() {
        if (!tg) return;
        const stable = tg.viewportStableHeight ?? tg.viewportHeight ?? window.innerHeight;
        document.documentElement.style.setProperty("--tg-vh", `${stable}px`);
      }
      syncViewport();
      tg.onEvent?.("viewportChanged", syncViewport);
    }
    init();
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
      {/* Hamburger toggle — desktop only (mobile uses bottom tabs) */}
      <button
        type="button"
        onClick={() => toggle(!open)}
        aria-label={open ? "Sidebarni yopish" : "Sidebarni ochish"}
        title={open ? "Sidebarni yopish" : "Sidebarni ochish"}
        className="fixed left-3 top-2.5 z-50 hidden size-7 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground md:grid"
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

      <Sidebar
        todayCount={todayCount}
        open={open}
        hasMounted={hasMounted}
        onCloseRequested={() => toggle(false)}
      />
      <main
        className={cn(
          "relative flex-1 overflow-hidden",
          hasMounted && "transition-[padding] duration-300 ease-out",
          // Padding-left only on desktop when sidebar is collapsed (to leave space for hamburger).
          !open && "md:pl-10"
        )}
      >
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <MobileBottomNav todayCount={todayCount} />
    </div>
  );
}
