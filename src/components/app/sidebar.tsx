"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Inbox,
  ListChecks,
  Calendar as CalendarIcon,
  Settings,
  Search,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/color-store";

const NAV = [
  { href: "/bugun",     label: "Bugun",     icon: Inbox,        kbd: "B" },
  { href: "/agenda",    label: "Agenda",    icon: ListChecks,   kbd: "A" },
  { href: "/kalendar",  label: "Kalendar",  icon: CalendarIcon, kbd: "K" },
];

const SCOPES = [
  { label: "Hafta", icon: CalendarDays },
  { label: "Oy",    icon: CalendarRange },
  { label: "Yil",   icon: CalendarClock },
];

export function Sidebar({ todayCount }: { todayCount: number }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const isDark = theme === "noir";

  return (
    <aside className="hidden h-screen w-[240px] flex-col border-r border-border bg-subtle/40 md:flex">
      {/* Brand */}
      <div className="flex h-12 items-center px-4">
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

      {/* Workspace nav */}
      <div className="px-3">
        <p className="px-2 pb-1 text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
          Ish stoli
        </p>
        <nav className="space-y-px">
          {NAV.map(({ href, label, icon: Icon, kbd }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
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
                {label === "Bugun" && todayCount > 0 && (
                  <span
                    className={cn(
                      "rounded px-1.5 font-mono text-[10px] tabular-nums",
                      active ? "bg-accent-soft text-accent-ink" : "text-faint"
                    )}
                  >
                    {todayCount}
                  </span>
                )}
                {kbd && !todayCount && (
                  <kbd className="hidden rounded border border-border bg-background px-1 py-0.5 font-mono text-[9.5px] text-faint group-hover:inline">
                    {kbd}
                  </kbd>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Doiralar — coming later */}
      <div className="mt-5 px-3">
        <p className="px-2 pb-1 text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
          Doiralar
        </p>
        <nav className="space-y-px">
          {SCOPES.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-faint/80"
            >
              <Icon className="size-3.5 shrink-0" strokeWidth={2} />
              <span className="flex-1">{label}</span>
              <span className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-faint">
                tez orada
              </span>
            </div>
          ))}
        </nav>
      </div>

      {/* Settings + theme toggle */}
      <div className="mt-auto px-3 pb-3">
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
  );
}
