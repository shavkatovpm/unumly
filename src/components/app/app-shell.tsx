"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { detectMac } from "@/lib/platform";
import { CommandPalette, NAV_ROUTES } from "./command-palette";
import { refreshPlans, usePlans } from "@/lib/plans-store";
import { refreshIdeas } from "@/lib/ideas-store";
import { refreshCategories } from "@/lib/categories-store";
import { syncOccurrences } from "@/lib/habits-store";
import { migrateLocalStorageOnce } from "@/lib/migrate-localstorage";
import { startOfDay, toDateInputValue, parseTimeToMinutes } from "@/lib/dates";
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

  // Joriy vaqt (kun boshidan o'tgan daqiqalar). Har daqiqada yangilanadi —
  // shunda vaqti kelgan tasklar badge'da o'z vaqtida paydo bo'ladi.
  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Badge faqat vaqti belgilangan VA o'sha vaqt yetgan (yoki o'tgan), ammo hali
  // bajarilmagan bugungi tasklarni sanaydi. Vaqti belgilanmagan tasklar badge'ga
  // umuman qo'shilmaydi — ular uchun "vaqti keldi" tushunchasi yo'q.
  const todayCount = useMemo(
    () =>
      plans.filter(
        (p) =>
          p.scope === "DAILY" &&
          p.scheduledFor === todayIso &&
          p.status !== "DONE" &&
          !!p.time &&
          parseTimeToMinutes(p.time) <= nowMinutes
      ).length,
    [plans, todayIso, nowMinutes]
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
      const { imported, reja } = await migrateLocalStorageOnce();
      if (imported > 0) await refreshPlans();
      if (reja.categories > 0) await refreshCategories();
      if (reja.ideas > 0) await refreshIdeas();
    })();
  }, []);

  // Generate this week's habit occurrences (as Plan rows) so habits show up
  // in Bugun/Agenda/Kalendar at their scheduled time. Idempotent.
  useEffect(() => {
    void syncOccurrences();
  }, []);

  // Telegram WebApp init — agar ilova Telegram Mini App ichida ishlasa,
  // viewport'ni to'liq kengaytirish va swipe-to-close ni o'chirish.
  // Klaviatura ochilganda webview o'z scroll'i bilan asosiy elementlarni
  // siljitishini kamaytiradi.
  useEffect(() => {
    let usingTelegram = false;

    let attempts = 0;
    function initTelegram() {
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
        if (attempts++ < 30) setTimeout(initTelegram, 100);
        return;
      }
      usingTelegram = true;
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
    initTelegram();

    // Browser fallback: track visualViewport so --tg-vh shrinks when the
    // on-screen keyboard opens (Telegram Mini App pushes the same value via
    // its own event). This keeps dialog max-heights honest so inputs/buttons
    // don't fall behind the keyboard.
    const vv = window.visualViewport;
    function syncBrowserViewport() {
      if (usingTelegram) return; // Telegram is source of truth there
      const h = vv?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--tg-vh", `${h}px`);
    }
    syncBrowserViewport();
    vv?.addEventListener("resize", syncBrowserViewport);
    window.addEventListener("resize", syncBrowserViewport);
    return () => {
      vv?.removeEventListener("resize", syncBrowserViewport);
      window.removeEventListener("resize", syncBrowserViewport);
    };
  }, []);

  const toggle = useCallback((next: boolean) => {
    setOpen(next);
    // Persist only the desktop preference (mobile always starts closed)
    if (typeof window !== "undefined" && !window.matchMedia("(max-width: 767px)").matches) {
      try {
        window.localStorage.setItem(STORAGE_OPEN, next ? "1" : "0");
      } catch {
        /* ignore */
      }
    }
  }, []);

  // ── Command palette + global klaviatura shortcut'lari (faqat desktop) ──
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<"command" | "newTask" | "help">("command");
  const paletteOpenRef = useRef(paletteOpen);
  useEffect(() => {
    paletteOpenRef.current = paletteOpen;
  }, [paletteOpen]);

  const setPalette = useCallback(
    (next: boolean, mode?: "command" | "newTask" | "help") => {
      if (mode) setPaletteMode(mode);
      setPaletteOpen(next);
    },
    []
  );

  // Sidebar'dagi "⌘K" tugmasi shu hodisa orqali oynani ochadi.
  useEffect(() => {
    const onOpen = () => setPalette(true, "command");
    window.addEventListener("unumly:open-command", onOpen);
    return () => window.removeEventListener("unumly:open-command", onOpen);
  }, [setPalette]);

  useEffect(() => {
    function otherDialogOpen(): boolean {
      // Palette o'zining role="dialog"'idan tashqari boshqa modal ochiqmi?
      return !!document.querySelector('[role="dialog"]:not([data-command-palette])');
    }

    function onKey(e: KeyboardEvent) {
      const mac = detectMac();
      const mod = mac ? e.metaKey : e.ctrlKey;
      if (!mod) return; // Barcha shortcut'lar ⌘ (Mac) / Ctrl bilan boshlanadi.
      const k = e.key.toLowerCase();

      // ── ⌘K — buyruqlar oynasi (har joyda, input ichida ham) ──
      if (!e.shiftKey && k === "k") {
        e.preventDefault();
        if (paletteOpenRef.current) setPaletteOpen(false);
        else setPalette(true, "command");
        return;
      }

      // Faqat desktop; palette yoki boshqa modal ochiq bo'lsa — qolganlari yo'q.
      if (window.innerWidth < 768) return;
      if (paletteOpenRef.current || otherDialogOpen()) return;

      // ── 2-daraja: ⌘ + Shift + harf — sahifaga o'tish ──
      if (e.shiftKey) {
        const route = NAV_ROUTES.find((r) => r.key === k);
        if (route) {
          e.preventDefault();
          router.push(route.href);
        }
        return;
      }

      // ── 1-daraja: ⌘ + harf — asosiy amallar ──
      if (k === "b") {
        // Sidebar
        e.preventDefault();
        setOpen((o) => {
          const next = !o;
          try {
            if (!window.matchMedia("(max-width: 767px)").matches)
              window.localStorage.setItem(STORAGE_OPEN, next ? "1" : "0");
          } catch {
            /* ignore */
          }
          return next;
        });
      } else if (k === "i") {
        // Yangi task
        e.preventDefault();
        setPalette(true, "newTask");
      } else if (k === "/") {
        // Shortcut'lar ro'yxati
        e.preventDefault();
        setPalette(true, "help");
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, setPalette]);

  return (
    <div className="flex h-screen overflow-hidden">
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

      {/* Buyruqlar oynasi (⌘K) + klaviatura shortcut'lari — desktop */}
      <CommandPalette
        open={paletteOpen}
        mode={paletteMode}
        onOpenChange={setPalette}
        onToggleSidebar={() => toggle(!open)}
      />
    </div>
  );
}
