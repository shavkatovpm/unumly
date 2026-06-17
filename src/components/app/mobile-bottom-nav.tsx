"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Menu,
  Moon,
  Repeat,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/color-store";
import { useScrollLock } from "@/lib/use-scroll-lock";
import {
  DEFAULT_PRIMARY,
  NAV_CHANGE_EVENT,
  loadPrimaryIds,
  resolvePrimaryItems,
} from "@/lib/mobile-nav";
import { SettingsDialog } from "./widgets/settings-dialog";

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

// Routes that always live inside the Boshqaruv sheet (never primary slots).
const BOSHQARUV_ROUTES = ["/bajarilgan", "/ochirilgan"];

export function MobileBottomNav({ todayCount }: { todayCount: number }) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // Configurable primary slots (Boshqaruv is always pinned on the right).
  const [primaryIds, setPrimaryIds] = useState(DEFAULT_PRIMARY);
  useEffect(() => {
    const sync = () => setPrimaryIds(loadPrimaryIds());
    sync();
    window.addEventListener(NAV_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(NAV_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const primary = resolvePrimaryItems(primaryIds);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  // Boshqaruv highlights for any route not surfaced in the primary slots.
  const primaryHrefs = new Set(primary.map((p) => p.href));
  const isBoshqaruvActive =
    !sheetOpen &&
    [...BOSHQARUV_ROUTES, "/reja", "/kalendar", "/odat", "/maqsad"].some(
      (href) => !primaryHrefs.has(href) && isActive(href)
    );

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
          "fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-surface md:hidden",
          "transition-[transform,opacity] duration-200 ease-out",
          keyboardOpen && "pointer-events-none translate-y-full opacity-0"
        )}
        style={{
          gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -4px 20px -10px rgba(0,0,0,0.15)",
        }}
      >
        {primary.map((t) => {
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
                {t.showTodayCount && todayCount > 0 && (
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
          <BoshqaruvSheet
            onClose={() => setSheetOpen(false)}
            pathname={pathname}
            primaryHrefs={primaryHrefs}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Bottom sheet for "Boshqaruv" tab ─── */

function BoshqaruvSheet({
  onClose,
  pathname,
  primaryHrefs,
}: {
  onClose: () => void;
  pathname: string;
  primaryHrefs: Set<string>;
}) {
  const { isDark, toggleMode } = useTheme();
  const [hidden, setHidden] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dragControls = useDragControls();
  // Arxiv/Maxsus — accordion: bir vaqtda faqat bittasi ochiq.
  // Joriy route Arxiv ichida bo'lsa — Arxiv ochiq boshlanadi.
  const [openSection, setOpenSection] = useState<"arxiv" | "maxsus" | null>(
    pathname.startsWith("/bajarilgan") || pathname.startsWith("/ochirilgan") ? "arxiv" : null
  );
  const toggleSection = (s: "arxiv" | "maxsus") => setOpenSection((cur) => (cur === s ? null : s));

  // Lock background scroll while sheet is open — also locks any
  // [data-scroll-lock-on-focus] containers (Bugun/Agenda/Kalendar).
  useScrollLock(true);

  useEffect(() => {
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
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          // Swipe-down to close: enough distance OR enough velocity
          if (info.offset.y > 80 || info.velocity.y > 500) {
            onClose();
          }
        }}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-2xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Drag handle — swipe-close (drag faqat shu yerdan boshlanadi) yoki tap-to-close */}
        <button
          onClick={onClose}
          onPointerDown={(e) => dragControls.start(e)}
          aria-label="Yopish"
          className="flex w-full shrink-0 touch-none items-center justify-center py-2"
        >
          <span className="h-1 w-10 rounded-full bg-faint/60" />
        </button>

        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-2.5">
          <p className="text-[16px] font-semibold tracking-[-0.01em]">Boshqaruv</p>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="grid size-9 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Scroll qilinadigan tana — kontent uzun bo'lsa pastki elementlar ham ko'rinadi */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">

        {/* Boshqaruv links — items already in the primary nav are hidden here */}
        <div className="space-y-2 px-3 py-2.5">
          {!primaryHrefs.has("/reja") && (
            <SheetLink
              href="/reja"
              label="Reja"
              icon={ClipboardList}
              active={isActive("/reja")}
              onNavigate={onClose}
            />
          )}
          {!primaryHrefs.has("/kalendar") && (
            <SheetLink
              href="/kalendar"
              label="Kalendar"
              icon={CalendarIcon}
              active={isActive("/kalendar")}
              onNavigate={onClose}
            />
          )}
          {!hidden.includes("odat") && !primaryHrefs.has("/odat") && (
            <SheetLink
              href="/odat"
              label="Odat"
              icon={Repeat}
              active={isActive("/odat")}
              onNavigate={onClose}
            />
          )}
          {!hidden.includes("maqsad") && !primaryHrefs.has("/maqsad") && (
            <SheetLink
              href="/maqsad"
              label="Maqsad"
              icon={Target}
              active={isActive("/maqsad")}
              onNavigate={onClose}
            />
          )}
        </div>

        {/* Arxiv — dropdown */}
        <SheetCollapsible label="Arxiv" open={openSection === "arxiv"} onToggle={() => toggleSection("arxiv")}>
          <SheetLink
            href="/bajarilgan"
            label="Bajarilgan"
            icon={CheckCircle2}
            active={isActive("/bajarilgan")}
            onNavigate={onClose}
            secondary
          />
          <SheetLink
            href="/ochirilgan"
            label="O'chirilgan"
            icon={Trash2}
            active={isActive("/ochirilgan")}
            onNavigate={onClose}
            secondary
          />
        </SheetCollapsible>

        {/* Maxsus — dropdown (Loyiha) */}
        <SheetCollapsible label="Maxsus" open={openSection === "maxsus"} onToggle={() => toggleSection("maxsus")}>
          <SheetItem label="Loyiha" icon={Sparkles} badge="tez orada" secondary />
        </SheetCollapsible>

        {/* Profile + theme + settings */}
        <div className="border-t border-border bg-subtle/30 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-background p-3">
            <div className="grid size-10 place-items-center rounded-md bg-foreground text-[14px] font-medium text-background">
              U
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium">Ish stoli</p>
              <p className="text-[11px] text-faint">Lokal rejim</p>
            </div>
            <button
              onClick={toggleMode}
              aria-label={isDark ? "Yorug' rejim" : "Qorong'u rejim"}
              className="grid size-11 place-items-center rounded-md text-muted hover:bg-hover hover:text-foreground"
            >
              {isDark ? <Sun className="size-[22px]" /> : <Moon className="size-[22px]" />}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Sozlamalar"
              className="grid size-11 place-items-center rounded-md text-muted hover:bg-hover hover:text-foreground"
            >
              <Settings className="size-[22px]" />
            </button>
          </div>
        </div>
        </div>
      </motion.div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

function SheetLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  secondary = false,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  onNavigate?: () => void;
  /** Ikkinchi darajali (Arxiv) — ixchamroq, kartasiz, xira. */
  secondary?: boolean;
}) {
  if (secondary) {
    // Tepadagi asosiy kartaga o'xshash, ammo kichikroq.
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg border px-3.5 py-3 text-[15px] transition-colors",
          active
            ? "border-foreground/30 bg-subtle text-foreground"
            : "border-border bg-surface text-muted hover:bg-hover hover:text-foreground"
        )}
      >
        <span className="flex-1 text-left font-medium">{label}</span>
        <Icon className="size-[19px] shrink-0 text-faint" strokeWidth={2} />
      </Link>
    );
  }
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3.5 rounded-xl border px-[18px] py-[18px] text-[19px] transition-colors",
        active
          ? "border-foreground/30 bg-subtle text-foreground"
          : "border-border bg-surface text-muted hover:bg-hover hover:text-foreground"
      )}
    >
      <span className="flex-1 text-left font-medium">{label}</span>
      <Icon className="size-[25px] shrink-0 text-faint" strokeWidth={2} />
    </Link>
  );
}

function SheetItem({
  label,
  icon: Icon,
  badge,
  secondary = false,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
  secondary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled
      className={cn(
        "flex w-full cursor-not-allowed items-center border border-border bg-surface/50 text-left text-faint/80",
        secondary
          ? "gap-3 rounded-lg px-3.5 py-3 text-[15px]"
          : "gap-3.5 rounded-xl px-[18px] py-[18px] text-[19px]"
      )}
    >
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-faint">
          {badge}
        </span>
      )}
      <Icon className={cn("shrink-0 text-faint/70", secondary ? "size-[19px]" : "size-[25px]")} strokeWidth={2} />
    </button>
  );
}

/* Yopiladigan bo'lim (dropdown) — Arxiv/Maxsus uchun. */
function SheetCollapsible({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border px-3 py-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-faint transition-colors hover:text-foreground"
      >
        <span className="text-[10.5px] font-medium uppercase tracking-[0.15em]">{label}</span>
        <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
