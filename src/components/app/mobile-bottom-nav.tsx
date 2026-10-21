"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  LayoutGrid,
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
  useMobileAddChoicesValue,
  type MobileAddChoice,
} from "@/lib/mobile-add";
import { useProfile } from "@/lib/profile-store";
import { useProjects, useHydratedProjects } from "@/lib/projects-store";
import { CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import type { Project } from "@/lib/types";
import { ProjectIcon } from "./loyiha-icons";
import { ProjectFormModal } from "./loyiha/project-form-modal";
import { SettingsDialog } from "./widgets/settings-dialog";
import { Avatar } from "./widgets/avatar";

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
  "workspace", "agenda", "reja", "odat", "maqsad", "kalendar", "bugun", "tezkor", "moliya",
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

  // Route o'zgarsa Boshqaruv sheet'ini yopamiz (dropdownlar ham reset bo'ladi).
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  // Boshqaruv highlights for any route not surfaced in the primary slots.
  const primaryHrefs = new Set(primary.map((p) => p.href));
  const isBoshqaruvActive =
    !sheetOpen &&
    [...BOSHQARUV_ROUTES, "/agenda", "/reja", "/kalendar", "/odat", "/maqsad", "/workspace"].some(
      (href) => !primaryHrefs.has(href) && isActive(href)
    );

  const keyboardOpen = useKeyboardOpen();

  // "+" tanlovlari (masalan Moliya: Kirim/Chiqim) — yelpig'ich qaysi sahifada
  // ochilgan bo'lsa, faqat o'sha yerda ko'rinadi (route o'zgarsa o'zi yopiladi).
  const addChoices = useMobileAddChoicesValue();
  const [fanAt, setFanAt] = useState<string | null>(null);
  const fanOpen = fanAt === pathname && !!addChoices && !keyboardOpen;

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
      active: isActive(t.href),
      badge: t.showTodayCount ? todayCount : 0,
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
    if (!addChoices) return triggerMobileAdd();
    setFanAt(fanOpen ? null : pathname);
  };
  return (
    <>
      <AnimatePresence>
        {fanOpen && (
          <motion.div
            key="fan-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setFanAt(null)}
            className="fixed inset-0 z-20 bg-black/25 backdrop-blur-[3px] md:hidden"
          />
        )}
      </AnimatePresence>
      <AddFan
        open={fanOpen}
        choices={addChoices}
        onPick={(c) => { setFanAt(null); c.onPick(); }}
      />
      <GlassDockNav entries={entries} hidden={keyboardOpen} plusOpen={fanOpen} onPlus={onPlus} />
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

/* "+" tanlovlari — markazdagi "+" ustidan chapga/o'ngga yelpig'ich bo'lib
   otilib chiqadi. */
function AddFan({
  open,
  choices,
  onPick,
}: {
  open: boolean;
  choices: MobileAddChoice[] | null;
  onPick: (c: MobileAddChoice) => void;
}) {
  const n = choices?.length ?? 0;
  return (
    <div
      className="pointer-events-none fixed z-30 md:hidden"
      style={{ left: "50%", bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px + 76px)" }}
    >
      <AnimatePresence>
        {open &&
          choices?.map((c, i) => {
            const x = (i - (n - 1) / 2) * 128;
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => onPick(c)}
                initial={{ opacity: 0, x: 0, y: 40, scale: 0.4 }}
                animate={{ opacity: 1, x, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 0, y: 40, scale: 0.4 }}
                transition={{ ...POP, delay: i * 0.05 }}
                className="pointer-events-auto absolute -left-[38px] bottom-0 flex w-[76px] flex-col items-center gap-1.5"
              >
                <span
                  className="grid size-[60px] place-items-center rounded-full text-white shadow-[0_12px_28px_-8px_rgba(0,0,0,0.45)] ring-[5px] ring-white/40 transition-transform active:scale-95 dark:ring-white/10"
                  style={{ background: c.color }}
                >
                  <c.icon className="size-6" strokeWidth={2.4} />
                </span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold text-foreground", GLASS)}>
                  {c.label}
                </span>
              </motion.button>
            );
          })}
      </AnimatePresence>
    </div>
  );
}

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
    <Link href={e.href} aria-label={e.label} className={cls}>
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

  const itemBase = (active: boolean) =>
    active
      ? "border-foreground/30 bg-subtle text-foreground"
      : "border-border bg-surface text-muted hover:bg-hover hover:text-foreground";

  // 2 ustun katak — ikona tepada, label pastda.
  function renderItems() {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        {visibleItems.map((item) => (
          <Link key={item.id} href={item.href} onClick={onClose}
            className={cn("flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-5 transition-colors", itemBase(isActive(item.href)))}>
            <item.icon className="size-7 shrink-0" strokeWidth={1.9} />
            <span className="text-[14px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    );
  }

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

        {/* Tana — 2 ustun katak, scroll bilan */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <div className="px-3 py-2.5">{renderItems()}</div>

        {/* Loyihalar — dropdown (loyihalar ro'yxati + tezkor yaratish) */}
        <SheetCollapsible label="Loyihalar" open={openSection === "loyiha"} onToggle={() => toggleSection("loyiha")}>
          <Link
            href="/loyiha"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3.5 py-3 text-[15px] transition-colors",
              pathname === "/loyiha"
                ? "border-foreground/30 bg-subtle text-foreground"
                : "border-border bg-surface text-muted hover:bg-hover hover:text-foreground"
            )}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-subtle text-faint">
              <LayoutGrid className="size-3.5" />
            </span>
            <span className="flex-1 truncate text-left font-medium">Barchasi</span>
          </Link>
          {hydratedProjects && projects.map((p) => (
            <ProjectSheetLink
              key={p.id}
              project={p}
              active={isActive(`/loyiha/${p.id}`)}
              onNavigate={onClose}
            />
          ))}
          <button
            type="button"
            onClick={() => setShowCreateProject(true)}
            className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border px-3.5 py-3 text-[15px] text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <Plus className="size-[19px] shrink-0" strokeWidth={2} />
            <span className="flex-1 text-left font-medium">Yangi loyiha</span>
          </button>
        </SheetCollapsible>

        {/* Tarix — dropdown */}
        <SheetCollapsible label="Tarix" open={openSection === "arxiv"} onToggle={() => toggleSection("arxiv")}>
          <SheetLink
            href="/bajarilgan"
            label="Bajarilgan"
            icon={CheckCircle2}
            active={isActive("/bajarilgan")}
            onNavigate={onClose}
            secondary
          />
          <SheetLink
            href="/arxiv"
            label="Arxiv"
            icon={Archive}
            active={isActive("/arxiv")}
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
        </div>

        {/* Profile + theme + settings — doim ko'rinadi (scrollsiz) */}
        <div className="shrink-0 border-t border-border bg-subtle/30 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-background p-3">
            <Avatar name={profile?.name} photoUrl={profile?.photoUrl} className="size-10 text-[14px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium">{profile?.name ?? "Ish stoli"}</p>
              <p className="text-[11px] text-faint">Telegram</p>
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

function SheetLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  secondary = false,
  fit = false,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  onNavigate?: () => void;
  /** Ikkinchi darajali (Arxiv) — ixchamroq, kartasiz, xira. */
  secondary?: boolean;
  /** Joyga moslashuvchi — ekranga sig'ish uchun kichrayadi (max = joriy o'lcham). */
  fit?: boolean;
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
        "flex items-center gap-3.5 rounded-xl border px-[18px] text-[19px] transition-colors",
        fit ? "min-h-[40px] max-h-[60px] flex-1" : "py-[18px]",
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

function ProjectSheetLink({
  project,
  active,
  onNavigate,
}: {
  project: Project;
  active: boolean;
  onNavigate?: () => void;
}) {
  const color = project.color ? CATEGORY_PALETTE[project.color].oklch : "var(--faint)";
  return (
    <Link
      href={`/loyiha/${project.id}`}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3.5 py-3 text-[15px] transition-colors",
        active
          ? "border-foreground/30 bg-subtle text-foreground"
          : "border-border bg-surface text-muted hover:bg-hover hover:text-foreground"
      )}
    >
      <span
        className="grid size-7 shrink-0 place-items-center rounded-md"
        style={{ background: project.color ? colorWithAlpha(project.color, 0.16) : "var(--subtle)", color }}
      >
        <ProjectIcon k={project.icon} className="size-3.5" />
      </span>
      <span className="flex-1 truncate text-left font-medium">{project.title}</span>
    </Link>
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
