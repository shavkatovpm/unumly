"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils";

// Inline mock — DB tayyor bo'lganda almashtiriladi
const USERS = [
  { id: 1,  tg: "@aliyev_b",   name: "Bobur Aliyev",       joined: "2026-05-18", lastActive: "5 daq oldin",  plans: 47, active: true  },
  { id: 2,  tg: "@zarina_t",   name: "Zarina Tursunova",   joined: "2026-05-15", lastActive: "18 daq oldin", plans: 128, active: true },
  { id: 3,  tg: "@uzbektype",  name: "Sardor Karim",       joined: "2026-05-10", lastActive: "1 soat oldin", plans: 89,  active: true  },
  { id: 4,  tg: "@nodir_dev",  name: "Nodir Yusupov",      joined: "2026-05-08", lastActive: "2 soat oldin", plans: 213, active: true  },
  { id: 5,  tg: "@malika_k",   name: "Malika Karimova",    joined: "2026-05-05", lastActive: "3 soat oldin", plans: 67,  active: true  },
  { id: 6,  tg: "@shavkat_t",  name: "Shavkat Tursun",     joined: "2026-05-02", lastActive: "4 soat oldin", plans: 156, active: true  },
  { id: 7,  tg: "@dilshod_a",  name: "Dilshod Aliev",      joined: "2026-04-28", lastActive: "1 kun oldin",  plans: 34,  active: false },
  { id: 8,  tg: "@aziza_m",    name: "Aziza Murodova",     joined: "2026-04-22", lastActive: "2 kun oldin",  plans: 92,  active: false },
  { id: 9,  tg: "@jasur_k",    name: "Jasur Karimov",      joined: "2026-04-18", lastActive: "3 kun oldin",  plans: 178, active: false },
  { id: 10, tg: "@firuza_t",   name: "Firuza Tojiyeva",    joined: "2026-04-15", lastActive: "5 kun oldin",  plans: 51,  active: false },
  { id: 11, tg: "@umid_b",     name: "Umid Boboev",        joined: "2026-04-10", lastActive: "1 hafta oldin", plans: 22, active: false },
  { id: 12, tg: "@kamola_n",   name: "Kamola Nazarova",    joined: "2026-04-05", lastActive: "2 hafta oldin", plans: 14, active: false },
];

export default function FoydalanuvchilarPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = USERS.filter((u) => {
    if (filter === "active" && !u.active) return false;
    if (filter === "inactive" && u.active) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return u.tg.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
  });

  return (
    <>
      <AdminPageHeader
        title="Foydalanuvchilar"
        subtitle={`${USERS.length} ta jami · ${USERS.filter((u) => u.active).length} ta faol`}
      />

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Search + filters */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="@username yoki ism bo'yicha qidirish..."
              className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-[13px] placeholder:text-faint focus:border-border-strong focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
            {(["all", "active", "inactive"] as const).map((f) => (
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
                {f === "all" ? "Hammasi" : f === "active" ? "Faol" : "Nofaol"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_0_var(--border)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-subtle/40 text-left">
                <th className="px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">Foydalanuvchi</th>
                <th className="px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">Telegram</th>
                <th className="px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">Qo&apos;shilgan</th>
                <th className="px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">Oxirgi faollik</th>
                <th className="px-4 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">Tasklar</th>
                <th className="px-4 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {filtered.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-hover/40">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-7 place-items-center rounded-md bg-subtle font-mono text-[10px] uppercase text-muted">
                        {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-[13px] font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-muted">{u.tg}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-faint">{u.joined}</td>
                  <td className="px-4 py-2.5 text-[12px] text-muted">{u.lastActive}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[12px] tabular-nums">{u.plans}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium",
                        u.active
                          ? "bg-accent-soft text-accent-ink"
                          : "bg-subtle text-faint"
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", u.active ? "bg-accent" : "bg-faint/60")} />
                      {u.active ? "Faol" : "Nofaol"}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-faint">
                    Hech narsa topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
