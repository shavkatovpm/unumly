"use client";

import { useState } from "react";
import { Smartphone, Monitor, Globe, LogOut } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils";

type Device = "mobile" | "desktop" | "telegram";

const SESSIONS = [
  { id: "s1",  user: "@aliyev_b",  device: "telegram" as Device, ip: "84.54.0.12",   loc: "Toshkent",  loginAt: "2026-05-20 09:14", active: true,  current: true  },
  { id: "s2",  user: "@zarina_t",  device: "mobile"   as Device, ip: "94.158.21.4",  loc: "Samarqand", loginAt: "2026-05-20 08:42", active: true,  current: false },
  { id: "s3",  user: "@uzbektype", device: "desktop"  as Device, ip: "213.230.96.8", loc: "Toshkent",  loginAt: "2026-05-20 07:18", active: true,  current: false },
  { id: "s4",  user: "@nodir_dev", device: "telegram" as Device, ip: "84.54.0.45",   loc: "Buxoro",    loginAt: "2026-05-19 22:30", active: true,  current: false },
  { id: "s5",  user: "@malika_k",  device: "mobile"   as Device, ip: "94.158.18.99", loc: "Toshkent",  loginAt: "2026-05-19 19:05", active: true,  current: false },
  { id: "s6",  user: "@shavkat_t", device: "desktop"  as Device, ip: "213.230.99.21",loc: "Andijon",   loginAt: "2026-05-18 14:22", active: false, current: false },
  { id: "s7",  user: "@dilshod_a", device: "telegram" as Device, ip: "84.54.1.7",    loc: "Toshkent",  loginAt: "2026-05-17 11:08", active: false, current: false },
  { id: "s8",  user: "@aziza_m",   device: "mobile"   as Device, ip: "94.158.50.3",  loc: "Namangan",  loginAt: "2026-05-15 16:40", active: false, current: false },
];

const ICONS: Record<Device, typeof Smartphone> = {
  mobile: Smartphone,
  desktop: Monitor,
  telegram: Globe,
};
const LABELS: Record<Device, string> = {
  mobile: "Mobile",
  desktop: "Desktop",
  telegram: "Telegram",
};

export default function SessiyalarPage() {
  const [filter, setFilter] = useState<"all" | "active">("active");
  const active = SESSIONS.filter((s) => s.active);
  const visible = filter === "all" ? SESSIONS : active;

  return (
    <>
      <AdminPageHeader
        title="Sessiyalar"
        subtitle={`${active.length} ta faol · ${SESSIONS.length} ta jami`}
      />

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex items-center justify-end">
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
            {(["active", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded px-3 py-1.5 text-[12px] transition-colors",
                  filter === f
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                )}
              >
                {f === "active" ? "Faol" : "Barchasi"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {visible.map((s) => {
            const Icon = ICONS[s.device];
            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-4 rounded-xl border bg-surface px-4 py-3 shadow-[0_1px_0_var(--border)]",
                  s.current
                    ? "border-accent/40 ring-1 ring-accent/20"
                    : "border-border"
                )}
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-subtle">
                  <Icon className="size-4 text-muted" strokeWidth={1.8} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[13px] font-medium">{s.user}</p>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                      {LABELS[s.device]}
                    </span>
                    {s.current && (
                      <span className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-accent-ink">
                        Joriy
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-faint">
                    {s.loc} · <span className="font-mono">{s.ip}</span> · {s.loginAt}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium",
                      s.active
                        ? "bg-accent-soft text-accent-ink"
                        : "bg-subtle text-faint"
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", s.active ? "bg-accent" : "bg-faint/60")} />
                    {s.active ? "Faol" : "Yopilgan"}
                  </span>
                  {s.active && !s.current && (
                    <button
                      className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                      title="Sessiyani yopish"
                    >
                      <LogOut className="size-3.5" strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
