"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Activity,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminLogout } from "./password-gate";

const NAV = [
  { href: "/admode",                 label: "Dashboard",        icon: LayoutDashboard },
  { href: "/admode/foydalanuvchilar", label: "Foydalanuvchilar", icon: Users },
  { href: "/admode/sessiyalar",      label: "Sessiyalar",       icon: Activity },
  { href: "/admode/rejalar",         label: "Rejalar",          icon: ClipboardList },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admode" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <Link href="/admode" className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-md bg-foreground text-[11px] font-semibold text-background">
              U
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold tracking-[-0.01em]">
                Unumly Admin
              </p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.15em] text-faint">
                v0.1 · UI
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-2 py-3">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors",
                  active
                    ? "bg-subtle text-foreground"
                    : "text-muted hover:bg-hover hover:text-foreground"
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-foreground" : "text-faint")} strokeWidth={1.8} />
                <span className={cn("flex-1", active && "font-medium")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={adminLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[12.5px] text-muted transition-colors hover:bg-hover hover:text-foreground"
          >
            <LogOut className="size-4 text-faint" strokeWidth={1.8} />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-4">
      <div className="min-w-0">
        <h1 className="truncate text-[18px] font-semibold tracking-[-0.02em]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-[12px] text-faint">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
