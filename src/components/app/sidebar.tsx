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
  ClipboardList,
  Inbox,
  ListChecks,
  Moon,
  Plus,
  Repeat,
  Search,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/color-store";

type IconCmp = ComponentType<{ className?: string; strokeWidth?: number }>;

type CustomItem = { id: string; label: string };

const STORAGE_CUSTOM = "unumly:sidebar:custom";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

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
  const { theme, toggle } = useTheme();
  const isDark = theme === "noir";

  const [custom, setCustom] = useState<CustomItem[]>([]);
  useEffect(() => {
    setCustom(readJSON<CustomItem[]>(STORAGE_CUSTOM, []));
  }, []);

  function addCustom(label: string) {
    const item: CustomItem = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      label: label.trim(),
    };
    setCustom((prev) => {
      const next = [...prev, item];
      writeJSON(STORAGE_CUSTOM, next);
      return next;
    });
  }

  function removeCustom(id: string) {
    setCustom((prev) => {
      const next = prev.filter((c) => c.id !== id);
      writeJSON(STORAGE_CUSTOM, next);
      return next;
    });
  }

  // Add-custom inline input
  const [addingCustom, setAddingCustom] = useState(false);
  const [newLabel, setNewLabel] = useState("");

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
            "fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col overflow-hidden border-r border-border bg-subtle/40 md:absolute",
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

      {/* Search */}
      <div className="px-3 pb-3">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md border border-transparent bg-surface/60 px-2.5 py-1.5 text-left text-[12.5px] text-faint transition-colors hover:border-border hover:bg-surface"
        >
          <Search className="size-3.5" />
          <span className="flex-1">Qidirish</span>
          <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-faint">
            ⌘K
          </kbd>
        </button>
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
        <Section label="Boshqaruv">
          <SidebarLink
            href="/reja"
            label="Reja"
            icon={ClipboardList}
            active={isActive("/reja")}
            onNavigate={closeOnMobile}
          />
          <SidebarItem
            label="Odat"
            icon={Repeat}
            badge="tez orada"
            disabled
          />
          <SidebarItem
            label="Maqsad"
            icon={Target}
            badge="tez orada"
            disabled
          />
        </Section>

        {/* ── Arxiv ─────────────────────────────── */}
        <Section label="Arxiv">
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
        </Section>

        {/* ── Maxsus ──────────────────────────── */}
        <Section
          label="Maxsus"
          action={
            <button
              type="button"
              onClick={() => {
                setAddingCustom(true);
                setNewLabel("");
              }}
              aria-label="Yangi qo'shish"
              className="grid size-5 place-items-center rounded text-faint opacity-0 transition-colors hover:bg-hover hover:text-foreground group-hover/section:opacity-100"
            >
              <Plus className="size-3" />
            </button>
          }
        >
          {custom.length === 0 && !addingCustom && (
            <button
              type="button"
              onClick={() => {
                setAddingCustom(true);
                setNewLabel("");
              }}
              className="flex w-full items-center gap-2 rounded-md border border-dashed border-border px-2 py-1.5 text-[12px] text-faint transition-colors hover:border-border-strong hover:text-muted"
            >
              <Plus className="size-3.5" />
              Loyiha qo&apos;shish
            </button>
          )}

          {custom.map((c) => (
            <div
              key={c.id}
              className="group/item flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted transition-colors hover:bg-hover"
            >
              <Sparkles className="size-3.5 shrink-0 text-faint" />
              <span className="flex-1 truncate">{c.label}</span>
              <button
                type="button"
                onClick={() => removeCustom(c.id)}
                aria-label="O'chirish"
                className="grid size-5 shrink-0 place-items-center rounded text-faint opacity-0 transition-colors hover:bg-danger-soft hover:text-danger group-hover/item:opacity-100"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}

          {addingCustom && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newLabel.trim()) {
                  addCustom(newLabel);
                  setNewLabel("");
                  setAddingCustom(false);
                }
              }}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5"
            >
              <Sparkles className="size-3.5 shrink-0 text-faint" />
              <input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onBlur={() => {
                  if (newLabel.trim()) {
                    addCustom(newLabel);
                  }
                  setNewLabel("");
                  setAddingCustom(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setNewLabel("");
                    setAddingCustom(false);
                  }
                }}
                placeholder="Loyiha nomi..."
                className="flex-1 bg-transparent text-[12.5px] placeholder:text-faint focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setNewLabel("");
                  setAddingCustom(false);
                }}
                aria-label="Bekor"
                className="grid size-5 place-items-center rounded text-faint hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </form>
          )}
        </Section>
      </div>

      {/* Bottom: profile + theme toggle */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 rounded-md bg-surface/80 px-2 py-2 shadow-[0_1px_0_var(--border)]">
          <div className="grid size-7 place-items-center rounded-md bg-foreground text-[11px] font-medium text-background">
            U
          </div>
          <div className="flex-1 leading-tight">
            <p className="text-[12px] font-medium text-foreground">Sizning ish stolingiz</p>
            <p className="text-[10px] text-faint">Lokal rejim</p>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? "Yorug' rejim" : "Qorong'u rejim"}
            title={isDark ? "Yorug' rejim" : "Qorong'u rejim"}
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </button>
          <button
            type="button"
            aria-label="Sozlamalar"
            title="Sozlamalar (tez orada)"
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <Settings className="size-3.5" />
          </button>
        </div>
      </div>
        </aside>
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
        <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
          {label}
        </p>
        {action}
      </div>
      <nav className="space-y-px">{children}</nav>
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
        "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors",
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
            active ? "bg-accent-soft text-accent-ink" : "text-faint"
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

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
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
        disabled
          ? "cursor-not-allowed text-faint/70"
          : "text-muted hover:bg-hover hover:text-foreground"
      )}
      title={disabled ? "Tez orada" : undefined}
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
