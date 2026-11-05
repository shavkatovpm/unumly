"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutGrid,
  Timer,
  Menu,
  Moon,
  Plus,
  Settings,
  Sun,
  Trash2,
  X,
  Archive,
} from "lucide-react";
import { cn, isEditableElement } from "@/lib/utils";
import { useTheme } from "@/lib/color-store";
import { useScrollLock } from "@/lib/use-scroll-lock";
import {
  DEFAULT_PRIMARY,
  NAV_CHANGE_EVENT,
  NAV_ITEMS,
  loadPrimaryIds,
  resolvePrimaryItems,
  type NavItemId,
} from "@/lib/mobile-nav";
import {
  triggerMobileAdd,
  useMobileSheetCloseValue,
} from "@/lib/mobile-add";
import { useProfile } from "@/lib/profile-store";
import { useProjects, useHydratedProjects } from "@/lib/projects-store";
import { CATEGORY_PALETTE } from "@/lib/category-palette";
import { ProjectFormModal } from "./loyiha/project-form-modal";
import { SettingsDialog } from "./widgets/settings-dialog";
import { Avatar } from "./widgets/avatar";
import { TodayPanelSettings } from "./bugun/today-panel";
import { PANEL_TABS, useTodayPanel } from "@/lib/today-panel";
import { useNavHiddenValue } from "@/lib/nav-hidden";

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
const BOSHQARUV_ROUTES = ["/bajarilgan", "/arxiv", "/ochirilgan"];

// Boshqaruv sheet'da ko'rsatish tartibi — asosiy nav'da BO'LMAGAN
// (o'chirilgan) barcha bo'limlar shu tartibda chiqadi (hech biri yo'qolmaydi).
const SHEET_ORDER: NavItemId[] = [
  "agenda", "reja", "odat", "maqsad", "kalendar", "bugun", "tezkor", "moliya",
];

export function MobileBottomNav({ todayCount }: { todayCount: number }) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

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

  // Bosilgan, lekin hali yuklanayotgan bo'lim. Shu payt "+" bosilsa — eski
  // sahifaning oynasi ochilmasin: yangi sahifa ochilgach o'shaning "+"i ishlaydi.
  const [pending, setPending] = useState<string | null>(null);
  const plusQueued = useRef(false);

  // Route o'zgarsa Boshqaruv sheet'ini yopamiz (dropdownlar ham reset bo'ladi).
  useEffect(() => {
    setSheetOpen(false);
    setPending(null);
    if (plusQueued.current) {
      plusQueued.current = false;
      // Yangi sahifa o'z "+" amalini effektida ulaydi — bir kadr kutamiz.
      const t = window.setTimeout(() => triggerMobileAdd(), 60);
      return () => window.clearTimeout(t);
    }
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  // Boshqaruv highlights for any route not surfaced in the primary slots.
  const primaryHrefs = new Set(primary.map((p) => p.href));
  const isBoshqaruvActive =
    !sheetOpen && !pending &&
    [...BOSHQARUV_ROUTES, "/agenda", "/reja", "/kalendar", "/odat", "/maqsad"].some(
      (href) => !primaryHrefs.has(href) && isActive(href)
    );

  const keyboardOpen = useKeyboardOpen();
  // Masalan, Pomodoro ishlayotganda — faqat taymer ko'rinsin.
  const navHidden = useNavHiddenValue();

  const sheetClose = useMobileSheetCloseValue();

  const sheet = (
    <AnimatePresence>
      {sheetOpen && (
        <BoshqaruvSheet
          onClose={() => setSheetOpen(false)}
          pathname={pathname}
          primaryHrefs={primaryHrefs}
        />
      )}
    </AnimatePresence>
  );

  const entries: GlassEntry[] = [
    ...primary.map((t) => ({
      key: t.href,
      label: t.label,
      icon: t.icon,
      href: t.href,
      active: pending ? pending === t.href : isActive(t.href),
      badge: t.showTodayCount ? todayCount : 0,
      onClick: () => { if (!isActive(t.href)) setPending(t.href); },
    })),
    {
      key: "boshqaruv",
      label: "Boshqaruv",
      icon: Menu,
      onClick: () => setSheetOpen(true),
      active: isBoshqaruvActive || sheetOpen,
      badge: 0,
    },
  ];
  const onPlus = () => {
    if (sheetClose) return sheetClose();
    if (pending && !isActive(pending)) { plusQueued.current = true; return; }
    triggerMobileAdd();
  };
  return (
    <>
      <GlassDockNav entries={entries} hidden={keyboardOpen || navHidden} plusOpen={!!sheetClose} onPlus={onPlus} />
      {sheet}
    </>
  );
}

/* ─── Glass dock — yagona mobil nav ─── */

type GlassEntry = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  active: boolean;
  badge: number;
};

const GLASS =
  "border border-white/40 bg-surface/45 backdrop-blur-2xl backdrop-saturate-[1.8] dark:border-white/10";
const GLASS_SHADOW =
  "0 10px 40px -10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(255,255,255,0.08)";
const FLOAT_BOTTOM = "calc(env(safe-area-inset-bottom, 0px) + 12px)";
const hideClass = "pointer-events-none translate-y-[calc(100%+24px)] opacity-0";
const POP = { type: "spring", damping: 22, stiffness: 420 } as const;

function GlassTab({
  e,
  layoutId,
  showLabel,
}: {
  e: GlassEntry;
  layoutId: string;
  showLabel: boolean;
}) {
  const inner = (
    <>
      {e.active && (
        <motion.span
          layoutId={layoutId}
          transition={{ type: "spring", damping: 30, stiffness: 380 }}
          className="absolute inset-0 rounded-[22px] bg-surface/70 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.25)]"
        />
      )}
      <span className="relative">
        <e.icon className={cn("size-[22px]", e.active ? "stroke-[2.4]" : "stroke-[1.8]")} />
        {e.badge > 0 && (
          <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 font-mono text-[9px] tabular-nums text-background">
            {e.badge}
          </span>
        )}
      </span>
      {showLabel && (
        <span
          className={cn(
            "relative max-w-full truncate px-0.5 text-[10.5px]",
            e.active ? "font-semibold" : "font-medium"
          )}
        >
          {e.label}
        </span>
      )}
    </>
  );
  const cls = cn(
    "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] transition-colors",
    showLabel ? "py-2" : "py-3",
    e.active ? "text-foreground" : "text-muted"
  );
  return e.href ? (
    <Link href={e.href} onClick={e.onClick} aria-label={e.label} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={e.onClick} aria-label={e.label} className={cls}>
      {inner}
    </button>
  );
}

/* Glass bar + markazda ko'tarilgan "+" */
type GlassNavProps = {
  entries: GlassEntry[];
  hidden: boolean;
  /** Yelpig'ich ochiq — "+" × ga aylanadi. */
  plusOpen: boolean;
  onPlus: () => void;
};

function GlassDockNav({ entries, hidden, plusOpen, onPlus }: GlassNavProps) {
  const mid = Math.ceil(entries.length / 2);
  return (
    <nav
      className={cn(
        "fixed inset-x-3 z-30 flex items-center rounded-[28px] p-1.5 md:hidden",
        "transition-[transform,opacity] duration-200 ease-out",
        GLASS,
        hidden && hideClass
      )}
      style={{ bottom: FLOAT_BOTTOM, boxShadow: GLASS_SHADOW }}
    >
      {/* Chap/o'ng tomonga alohida layoutId — faol fon "+" ustidan sirpanib o'tmaydi */}
      {entries.slice(0, mid).map((e) => (
        <GlassTab key={e.key} e={e} layoutId="glass-dock-active-left" showLabel />
      ))}
      <div className="flex w-16 shrink-0 justify-center">
        <button
          type="button"
          onClick={onPlus}
          aria-label={plusOpen ? "Yopish" : "Qo'shish"}
          className="-mt-9 grid size-14 place-items-center rounded-full bg-foreground text-background shadow-[0_10px_24px_-6px_rgba(0,0,0,0.5)] ring-[5px] ring-white/40 backdrop-blur transition-transform active:scale-95 dark:ring-white/10"
        >
          <motion.span animate={{ rotate: plusOpen ? 45 : 0 }} transition={POP} className="grid">
            <Plus className="size-6" strokeWidth={2.4} />
          </motion.span>
        </button>
      </div>
      {entries.slice(mid).map((e) => (
        <GlassTab key={e.key} e={e} layoutId="glass-dock-active-right" showLabel />
      ))}
    </nav>
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
  const profile = useProfile();
  const [hidden, setHidden] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const { projects, create: createProject } = useProjects();
  const hydratedProjects = useHydratedProjects();
  const dragControls = useDragControls();
  // Loyihalar/Arxiv — accordion: bir vaqtda faqat bittasi ochiq. Sheet har
  // ochilganda yopiq holatda boshlanadi — navigatsiyadan keyin ochiq qolmaydi.
  const [openSection, setOpenSection] = useState<"loyiha" | "arxiv" | null>(null);
  // "Bugun paneli" sozlamasi shu panel ichida alohida sahifa bo'lib ochiladi.
  const [view, setView] = useState<"main" | "panel">("main");
  const todayPanel = useTodayPanel();
  const panelLabels = todayPanel.visible.map((id) => PANEL_TABS.find((t) => t.id === id)!.label);
  const toggleSection = (s: "loyiha" | "arxiv") => setOpenSection((cur) => (cur === s ? null : s));

  // Lock background scroll while sheet is open — also locks any
  // [data-scroll-lock-on-focus] containers (Bugun/Agenda/Kalendar).
  useScrollLock(true);

  useEffect(() => {
    setHidden(readJSON<string[]>(STORAGE_HIDDEN, []));
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Boshqaruv sheet'da ko'rinadigan bo'limlar (asosiy nav'da bo'lmagan).
  const visibleItems = SHEET_ORDER
    .map((id) => NAV_ITEMS.find((i) => i.id === id))
    .filter(
      (item): item is NonNullable<typeof item> =>
        !!item && !primaryHrefs.has(item.href) && !hidden.includes(item.id)
    );

  // Bo'limlar — 3 ustunli bir xil katakchalar; Pomodoro doim shu yerda.
  const tiles = [...visibleItems, { id: "pomodoro", href: "/pomodoro", label: "Pomodoro", icon: Timer }];
  const tileCls = (active: boolean) =>
    cn(
      "flex h-[86px] flex-col items-center justify-center gap-2 rounded-[20px] border transition-colors active:bg-hover",
      active ? "border-foreground/30 bg-subtle text-foreground" : "border-border bg-surface text-foreground"
    );
  const rowCls = (active: boolean) =>
    cn("flex min-h-[52px] w-full items-center gap-3 px-3.5 text-left text-[15px] font-medium transition-colors active:bg-hover", active && "bg-subtle");

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
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[min(92vh,calc(var(--tg-vh,100dvh)-var(--modal-safe-top)))] flex-col rounded-t-[30px] bg-background shadow-2xl md:hidden"
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          <AnimatePresence mode="wait" initial={false}>
            {view === "panel" ? (
              <motion.div key="panel" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
                <div className="mb-3 flex items-center gap-2">
                  <button type="button" onClick={() => setView("main")} aria-label="Orqaga" className="grid size-10 place-items-center rounded-full bg-subtle"><ChevronLeft className="size-5" /></button>
                  <p className="text-[18px] font-bold tracking-[-0.01em]">Bugun paneli</p>
                </div>
                <TodayPanelSettings />
              </motion.div>
            ) : (
              <motion.div key="main" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
                <div className="flex items-center justify-between px-1">
                  <p className="text-[20px] font-bold tracking-[-0.02em]">Boshqaruv</p>
                  <button onClick={onClose} aria-label="Yopish" className="grid size-10 place-items-center rounded-full bg-subtle text-foreground">
                    <X className="size-5" />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {tiles.map((item) => (
                    <Link key={item.id} href={item.href} onClick={onClose} className={tileCls(isActive(item.href))}>
                      <item.icon className="size-[22px] shrink-0" strokeWidth={1.9} />
                      <span className="text-[13.5px] font-semibold">{item.label}</span>
                    </Link>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  <SheetFold label="Loyihalar" icon={FolderKanban} count={hydratedProjects ? projects.length : undefined} open={openSection === "loyiha"} onToggle={() => toggleSection("loyiha")}>
                    <Link href="/loyiha" onClick={onClose} className={rowCls(pathname === "/loyiha")}>
                      <LayoutGrid className="size-[18px] shrink-0 text-muted" />
                      <span className="flex-1 truncate">Barchasi</span>
                      <ChevronRight className="size-4 shrink-0 text-faint" />
                    </Link>
                    {hydratedProjects && projects.map((p) => (
                      <Link key={p.id} href={`/loyiha/${p.id}`} onClick={onClose} className={rowCls(isActive(`/loyiha/${p.id}`))}>
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color ? CATEGORY_PALETTE[p.color].oklch : "var(--faint)" }} />
                        <span className="flex-1 truncate">{p.title}</span>
                        <ChevronRight className="size-4 shrink-0 text-faint" />
                      </Link>
                    ))}
                    <button type="button" onClick={() => setShowCreateProject(true)} className={cn(rowCls(false), "text-muted")}>
                      <Plus className="size-[18px] shrink-0" /> Yangi loyiha
                    </button>
                  </SheetFold>
                  <SheetFold label="Tarix" icon={Archive} open={openSection === "arxiv"} onToggle={() => toggleSection("arxiv")}>
                    {[
                      { href: "/bajarilgan", label: "Bajarilgan", icon: CheckCircle2 },
                      { href: "/arxiv", label: "Arxiv", icon: Archive },
                      { href: "/ochirilgan", label: "O'chirilgan", icon: Trash2 },
                    ].map((it) => (
                      <Link key={it.href} href={it.href} onClick={onClose} className={rowCls(isActive(it.href))}>
                        <it.icon className="size-[18px] shrink-0 text-muted" />
                        <span className="flex-1">{it.label}</span>
                        <ChevronRight className="size-4 shrink-0 text-faint" />
                      </Link>
                    ))}
                  </SheetFold>
                  <button type="button" onClick={() => setView("panel")} className="flex min-h-[58px] w-full items-center gap-3 rounded-[20px] border border-border bg-surface px-3.5 text-left active:bg-hover">
                    <BarChart3 className="size-5 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15.5px] font-semibold">Bugun paneli</span>
                      <span className="block truncate text-[12.5px] text-faint">{panelLabels.length ? panelLabels.join(" · ") : "O'chiq"}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-faint" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profil + mavzu + sozlamalar — doim pastda */}
        <div className="shrink-0 px-4 pb-3 pt-1">
          <div className="flex items-center gap-3 rounded-[20px] bg-subtle/70 p-2.5 pl-3">
            <Avatar name={profile?.name} photoUrl={profile?.photoUrl} className="size-10 text-[14px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{profile?.name ?? "Ish stoli"}</p>
              <p className="text-[12px] text-faint">Telegram</p>
            </div>
            <button
              onClick={toggleMode}
              aria-label={isDark ? "Yorug' rejim" : "Qorong'u rejim"}
              className="grid size-10 place-items-center rounded-full bg-surface text-foreground"
            >
              {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Sozlamalar"
              className="grid size-10 place-items-center rounded-full bg-surface text-foreground"
            >
              <Settings className="size-5" />
            </button>
          </div>
        </div>
      </motion.div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {showCreateProject && (
        <ProjectFormModal
          onClose={() => setShowCreateProject(false)}
          onSubmit={({ title, icon, color }) => {
            createProject({ title, icon, color });
            setShowCreateProject(false);
          }}
        />
      )}
    </>
  );
}

/* Boshqaruv'dagi ochiladigan guruh (Loyihalar, Tarix). */
function SheetFold({ label, icon: Icon, count, open, onToggle, children }: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-surface">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-[54px] w-full items-center gap-3 px-3.5 text-left">
        <Icon className="size-5 shrink-0 text-muted" />
        <span className="flex-1 text-[15.5px] font-semibold">{label}</span>
        {count !== undefined && <span className="text-[13px] tabular-nums text-faint">{count}</span>}
        <ChevronDown className={cn("size-4 shrink-0 text-faint transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="border-t border-border [&>*+*]:border-t [&>*+*]:border-border/70">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Telefon klaviaturasi ochiqmi — nav shu paytda yashirinadi.
   - Fokus input'ga tushganda nav darhol yashirinadi (klaviatura animatsiyasidan
     oldin), lekin ~0.8s ichida klaviatura chiqmasa — qaytadi.
   - Keyin faqat viewport haqiqatan qisqargan paytda yashirin turadi: Android
     "orqaga" bilan klaviatura yopilib input fokusda qolsa ham nav qaytadi.
   - Fokusdagi input DOM'dan olib tashlansa (WebKit/Telegram'da focusout
     chiqmasligi mumkin) — davriy tekshiruv uni ushlaydi.
   Ilgari faqat focusin/focusout'ga tayanilgani uchun ba'zan nav reload'gacha
   yo'qolib qolardi. */
const KEYBOARD_MIN_PX = 120;

function useKeyboardOpen(): boolean {
  const [editable, setEditable] = useState(false);
  const [justFocused, setJustFocused] = useState(false);
  const [viewportShrunk, setViewportShrunk] = useState(false);

  useEffect(() => {
    let focusTimer: number | undefined;
    const sync = () => setEditable(isEditableElement(document.activeElement));
    function onFocusIn(e: FocusEvent) {
      if (!isEditableElement(e.target as Element)) return;
      setEditable(true);
      setJustFocused(true);
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => setJustFocused(false), 800);
    }
    function onFocusOut() {
      window.setTimeout(sync, 0);
    }
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // Viewport qisqarishi — iOS'da visualViewport, Android/Telegram'da innerHeight.
  useEffect(() => {
    let baseline = 0;
    let baseWidth = window.innerWidth;
    const vv = window.visualViewport;
    function measure() {
      const h = Math.min(window.innerHeight, vv ? vv.height : window.innerHeight);
      // Burilish (orientation) — bazani qayta o'lchaymiz.
      if (window.innerWidth !== baseWidth) { baseWidth = window.innerWidth; baseline = 0; }
      if (!isEditableElement(document.activeElement) || !baseline) baseline = Math.max(baseline, h);
      setViewportShrunk(baseline - h > KEYBOARD_MIN_PX);
    }
    const raf = window.requestAnimationFrame(measure);
    vv?.addEventListener("resize", measure);
    window.addEventListener("resize", measure);
    document.addEventListener("focusin", measure);
    document.addEventListener("focusout", measure);
    return () => {
      window.cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", measure);
      window.removeEventListener("resize", measure);
      document.removeEventListener("focusin", measure);
      document.removeEventListener("focusout", measure);
    };
  }, []);

  // Fokusdagi element olib tashlansa/blur bo'lmasa ham holat yangilansin.
  useEffect(() => {
    if (!editable) return;
    const id = window.setInterval(() => {
      if (!isEditableElement(document.activeElement)) setEditable(false);
    }, 500);
    return () => window.clearInterval(id);
  }, [editable]);

  return editable && (justFocused || viewportShrunk);
}
