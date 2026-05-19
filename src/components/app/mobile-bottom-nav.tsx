"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ClipboardList,
  Inbox,
  ListChecks,
  Menu,
  Moon,
  Repeat,
  Settings,
  Sparkles,
  Sun,
  Target,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/color-store";

type CustomItem = { id: string; label: string };

const STORAGE_CUSTOM = "unumly:sidebar:custom";
const STORAGE_HIDDEN = "unumly:sidebar:hidden";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

const PRIMARY = [
  { href: "/bugun",    label: "Bugun",    icon: Inbox },
  { href: "/agenda",   label: "Agenda",   icon: ListChecks },
  { href: "/kalendar", label: "Kalendar", icon: CalendarIcon },
];

// Routes that live inside the Boshqaruv group (used to highlight the tab)
const BOSHQARUV_ROUTES = ["/reja"];

export function MobileBottomNav({ todayCount }: { todayCount: number }) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  const isBoshqaruvActive = BOSHQARUV_ROUTES.some(isActive);

  // Klaviatura ochilishini focus orqali aniqlash — bu iOS visual viewport
  // o'zgarishidan oldin sodir bo'ladi, shuning uchun nav klaviatura
  // animatsiyasi boshlanmasdan oldin yashirinadi.
  useEffect(() => {
    function isTextEntry(el: Element | null): boolean {
      if (!el) return false;
      if (el instanceof HTMLInputElement) {
        const t = el.type;
        return t !== "button" && t !== "submit" && t !== "checkbox" && t !== "radio" && t !== "file";
      }
      if (el instanceof HTMLTextAreaElement) return true;
      if (el instanceof HTMLElement && el.isContentEditable) return true;
      return false;
    }
    function onFocusIn(e: FocusEvent) {
      if (isTextEntry(e.target as Element)) setKeyboardOpen(true);
    }
    function onFocusOut() {
      setTimeout(() => {
        if (!isTextEntry(document.activeElement)) setKeyboardOpen(false);
      }, 0);
    }
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-surface md:hidden",
          "transition-[transform,opacity] duration-200 ease-out",
          keyboardOpen && "pointer-events-none translate-y-full opacity-0"
        )}
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -4px 20px -10px rgba(0,0,0,0.15)",
        }}
      >
        {PRIMARY.map((t) => {
          const active = isActive(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 transition-colors",
                active ? "text-foreground" : "text-faint hover:text-muted"
              )}
            >
              <div className="relative">
                <t.icon
                  className={cn(
                    "size-[22px]",
                    active ? "stroke-[2.4]" : "stroke-[1.8]"
                  )}
                />
                {t.label === "Bugun" && todayCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 font-mono text-[9px] tabular-nums text-background">
                    {todayCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10.5px] font-medium",
                  active && "font-semibold"
                )}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={() => setSheetOpen(true)}
          className={cn(
            "flex flex-col items-center gap-0.5 py-2.5 transition-colors",
            isBoshqaruvActive || sheetOpen
              ? "text-foreground"
              : "text-faint hover:text-muted"
          )}
        >
          <Menu
            className={cn(
              "size-[22px]",
              isBoshqaruvActive || sheetOpen ? "stroke-[2.4]" : "stroke-[1.8]"
            )}
          />
          <span
            className={cn(
              "text-[10.5px] font-medium",
              (isBoshqaruvActive || sheetOpen) && "font-semibold"
            )}
          >
            Boshqaruv
          </span>
        </button>
      </nav>

      <AnimatePresence>
        {sheetOpen && (
          <BoshqaruvSheet onClose={() => setSheetOpen(false)} pathname={pathname} />
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Bottom sheet for "Boshqaruv" tab ─── */

function BoshqaruvSheet({
  onClose,
  pathname,
}: {
  onClose: () => void;
  pathname: string;
}) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "noir";
  const [custom, setCustom] = useState<CustomItem[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    setCustom(readJSON<CustomItem[]>(STORAGE_CUSTOM, []));
    setHidden(readJSON<string[]>(STORAGE_HIDDEN, []));
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface shadow-2xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Drag handle */}
        <button
          onClick={onClose}
          aria-label="Yopish"
          className="flex w-full items-center justify-center py-2.5"
        >
          <span className="h-1 w-10 rounded-full bg-faint/60" />
        </button>

        <header className="flex items-center justify-between border-b border-border px-5 pb-3">
          <p className="text-[16px] font-semibold tracking-[-0.01em]">Boshqaruv</p>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Boshqaruv links */}
        <div className="px-3 py-2">
          <SheetLink
            href="/reja"
            label="Reja"
            icon={ClipboardList}
            active={isActive("/reja")}
            onNavigate={onClose}
          />
          {!hidden.includes("odat") && (
            <SheetItem label="Odat" icon={Repeat} badge="tez orada" />
          )}
          {!hidden.includes("maqsad") && (
            <SheetItem label="Maqsad" icon={Target} badge="tez orada" />
          )}
        </div>

        {/* Maxsus loyihalar */}
        {custom.length > 0 && (
          <div className="border-t border-border px-3 py-2">
            <p className="px-2 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
              Maxsus
            </p>
            {custom.map((c) => (
              <SheetItem key={c.id} label={c.label} icon={Sparkles} />
            ))}
          </div>
        )}

        {/* Profile + theme + settings */}
        <div className="border-t border-border bg-subtle/30 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-background p-3">
            <div className="grid size-10 place-items-center rounded-md bg-foreground text-[13px] font-medium text-background">
              U
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium">Sizning ish stolingiz</p>
              <p className="text-[11px] text-faint">Lokal rejim</p>
            </div>
            <button
              onClick={toggle}
              aria-label={isDark ? "Yorug' rejim" : "Qorong'u rejim"}
              className="grid size-9 place-items-center rounded-md text-muted hover:bg-hover hover:text-foreground"
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button
              aria-label="Sozlamalar"
              className="grid size-9 place-items-center rounded-md text-muted hover:bg-hover hover:text-foreground"
            >
              <Settings className="size-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function SheetLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-3 text-[14px] transition-colors",
        active
          ? "bg-subtle text-foreground"
          : "text-muted hover:bg-hover hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0 text-faint" strokeWidth={2} />
      <span className="flex-1 font-medium">{label}</span>
    </Link>
  );
}

function SheetItem({
  label,
  icon: Icon,
  badge,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
}) {
  return (
    <button
      type="button"
      disabled
      className="flex w-full cursor-not-allowed items-center gap-3 rounded-md px-3 py-3 text-left text-[14px] text-faint/80"
    >
      <Icon className="size-4 shrink-0 text-faint/70" strokeWidth={2} />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-faint">
          {badge}
        </span>
      )}
    </button>
  );
}
