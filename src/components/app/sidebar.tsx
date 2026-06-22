"use client";

import {
  useEffect,
  useState,
  type ComponentType,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Inbox,
  ListChecks,
  Moon,
  Repeat,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Wallet,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/color-store";
import { useProfile } from "@/lib/profile-store";
import { SettingsDialog } from "./widgets/settings-dialog";
import { Avatar } from "./widgets/avatar";

type IconCmp = ComponentType<{ className?: string; strokeWidth?: number }>;

const STORAGE_ARXIV_OPEN = "unumly:sidebar:arxiv";
const STORAGE_BOSHQARUV_OPEN = "unumly:sidebar:boshqaruv";

export function Sidebar({
  todayCount,
  open = true,
  hasMounted = true,
  onCloseRequested,
}: {
  todayCount: number;
  open?: boolean;
  hasMounted?: boolean;
  onCloseRequested?: () => void;
}) {
  const pathname = usePathname();
  const { isDark, toggleMode } = useTheme();
  const profile = useProfile();

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Command palette'dagi "Sozlamalar" buyrug'i shu hodisa orqali ochadi.
  useEffect(() => {
    const onOpen = () => setSettingsOpen(true);
    window.addEventListener("unumly:open-settings", onOpen);
    return () => window.removeEventListener("unumly:open-settings", onOpen);
  }, []);

  // Arxiv section collapsible — default closed, persisted.
  // Auto-closes when user navigates away from an Arxiv route.
  const [arxivOpen, setArxivOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = window.localStorage.getItem(STORAGE_ARXIV_OPEN);
      if (v === "1") setArxivOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const onArxivRoute =
    pathname === "/bajarilgan" ||
    pathname.startsWith("/bajarilgan/") ||
    pathname === "/ochirilgan" ||
    pathname.startsWith("/ochirilgan/");

  // When user navigates away from an Arxiv route, collapse the section.
  useEffect(() => {
    if (!onArxivRoute && arxivOpen) {
      setArxivOpen(false);
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_ARXIV_OPEN, "0");
        }
      } catch {
        /* ignore */
      }
    }
    // We only want to react to pathname changes, not to arxivOpen toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleArxiv() {
    setArxivOpen((v) => {
      const next = !v;
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_ARXIV_OPEN, next ? "1" : "0");
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // Boshqaruv section collapsible — default closed, persisted.
  // Bir marta ochilgach faqat user o'zi yopadi (navigatsiyada avtomatik yopilmaydi).
  const [boshqaruvOpen, setBoshqaruvOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = window.localStorage.getItem(STORAGE_BOSHQARUV_OPEN);
      if (v === "1") setBoshqaruvOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleBoshqaruv() {
    setBoshqaruvOpen((v) => {
      const next = !v;
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_BOSHQARUV_OPEN, next ? "1" : "0");
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  // On mobile (<md), close the drawer after navigation
  function closeOnMobile() {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 767px)").matches) {
      onCloseRequested?.();
    }
  }

  return (
    <>
      {/* Mobile backdrop — closes sidebar when tapped */}
      {open && hasMounted && (
        <div
          aria-hidden
          onClick={() => onCloseRequested?.()}
          className="fade-in fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] md:hidden"
        />
      )}
      <div
        className={cn(
          "group/sidebar relative h-screen shrink-0",
          hasMounted && "transition-[width] duration-300 ease-out",
          // Desktop: pushes content when open. Mobile: zero-width (sidebar is overlay).
          "w-0",
          open ? "md:w-[240px]" : "md:w-0"
        )}
      >
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col overflow-hidden border-r border-border bg-subtle/40",
            hasMounted && "transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
        {/* Brand — pl-12 leaves room for the fixed hamburger toggle (top-left) */}
        <div className="flex h-12 shrink-0 items-center pl-12 pr-4">
          <p className="text-[14px] font-semibold tracking-[-0.01em]">
            unumly<span className="text-accent">.</span>
          </p>
        </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Asosiy ──────────────────────────── */}
        <Section label="Asosiy">
          <SidebarLink
            href="/bugun"
            label="Bugun"
            icon={Inbox}
            active={isActive("/bugun")}
            badge={todayCount > 0 ? String(todayCount) : undefined}
            onNavigate={closeOnMobile}
          />
          <SidebarLink
            href="/moliya"
            label="Moliya"
            icon={Wallet}
            active={isActive("/moliya")}
            onNavigate={closeOnMobile}
          />
          <SidebarLink
            href="/agenda"
            label="Agenda"
            icon={ListChecks}
            active={isActive("/agenda")}
            onNavigate={closeOnMobile}
          />
          <SidebarLink
            href="/kalendar"
            label="Kalendar"
            icon={CalendarIcon}
            active={isActive("/kalendar")}
            onNavigate={closeOnMobile}
          />
        </Section>

        {/* ── Boshqaruv ─────────────────────────── */}
        <CollapsibleSection
          label="Boshqaruv"
          open={boshqaruvOpen}
          onToggle={toggleBoshqaruv}
        >
          <SidebarLink
            href="/odat"
            label="Odat"
            icon={Repeat}
            active={isActive("/odat")}
            onNavigate={closeOnMobile}
          />
          <SidebarLink
            href="/maqsad"
            label="Maqsad"
            icon={Target}
            active={isActive("/maqsad")}
            onNavigate={closeOnMobile}
          />
          <SidebarLink
            href="/reja"
            label="Reja"
            icon={ClipboardList}
            active={isActive("/reja")}
            onNavigate={closeOnMobile}
          />
          <SidebarLink
            href="/tezkor"
            label="Tezkor"
            icon={Zap}
            active={isActive("/tezkor")}
            onNavigate={closeOnMobile}
          />
        </CollapsibleSection>

        {/* ── Arxiv ─────────────────────────────── */}
        <CollapsibleSection
          label="Arxiv"
          open={arxivOpen}
          onToggle={toggleArxiv}
        >
          <SidebarLink
            href="/bajarilgan"
            label="Bajarilgan"
            icon={CheckCircle2}
            active={isActive("/bajarilgan")}
            onNavigate={closeOnMobile}
          />
          <SidebarLink
            href="/ochirilgan"
            label="O'chirilgan"
            icon={Trash2}
            active={isActive("/ochirilgan")}
            onNavigate={closeOnMobile}
          />
        </CollapsibleSection>

        {/* ── Maxsus (to'liq workspace — hozircha tez orada) ── */}
        <Section label="Maxsus">
          <SidebarItem label="Loyiha" icon={Sparkles} badge="tez orada" disabled />
        </Section>
      </div>

      {/* Bottom: profile + theme toggle */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 rounded-md bg-surface/80 px-2 py-2 shadow-[0_1px_0_var(--border)]">
          <Avatar name={profile?.name} photoUrl={profile?.photoUrl} className="size-7 text-[11px]" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12px] font-medium text-foreground">{profile?.name ?? "Ish stoli"}</p>
            <p className="text-[10px] text-faint">Telegram</p>
          </div>
          <button
            type="button"
            onClick={toggleMode}
            aria-label={isDark ? "Yorug' rejim" : "Qorong'u rejim"}
            title={isDark ? "Yorug' rejim" : "Qorong'u rejim"}
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Sozlamalar"
            title="Sozlamalar"
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <Settings className="size-3.5" />
          </button>
        </div>
      </div>
        </aside>
        <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </>
  );
}

/* ─────────────── Sub-components ─────────────── */

function Section({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="group/section px-3 pb-3">
      <div className="flex items-center justify-between px-2 pb-1">
        <p className="text-[12.5px] font-medium uppercase tracking-[0.12em] text-faint">
          {label}
        </p>
        {action}
      </div>
      <nav className="space-y-px">{children}</nav>
    </div>
  );
}

function CollapsibleSection({
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
    <div className="group/section px-3 pb-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left transition-colors hover:bg-hover/60"
      >
        <ChevronRight
          className={cn(
            "size-3 text-faint transition-transform duration-200",
            open && "rotate-90"
          )}
        />
        <p className="text-[12.5px] font-medium uppercase tracking-[0.12em] text-faint">
          {label}
        </p>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <nav className="space-y-px overflow-hidden pt-1">{children}</nav>
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: IconCmp;
  active: boolean;
  badge?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[15.5px] transition-colors",
        active
          ? "bg-surface text-foreground shadow-[0_1px_0_var(--border)]"
          : "text-muted hover:bg-hover hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "size-3.5 shrink-0 transition-colors",
          active ? "text-foreground" : "text-faint"
        )}
        strokeWidth={2}
      />
      <span className="flex-1">{label}</span>
      {badge && (
        <span
          className={cn(
            "rounded px-1.5 font-mono text-[10px] tabular-nums",
            active ? "bg-accent-soft text-accent" : "text-faint"
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

/* Qulflangan element (hozircha tez orada bo'lgan bo'limlar uchun). */
function SidebarItem({
  label,
  icon: Icon,
  badge,
  disabled,
}: {
  label: string;
  icon: IconCmp;
  badge?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? "Tez orada" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[15.5px] transition-colors",
        disabled ? "cursor-not-allowed text-faint/70" : "text-muted hover:bg-hover hover:text-foreground"
      )}
    >
      <Icon className="size-3.5 shrink-0 text-faint/70" strokeWidth={2} />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded bg-subtle px-1.5 font-mono text-[9.5px] uppercase tracking-wider text-faint">
          {badge}
        </span>
      )}
    </button>
  );
}

