"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnnounceButton } from "./announce-modal";

export type AdminUserRow = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  joinedAt: string;       // ISO
  lastSeenAt: string;     // ISO
  plansCount: number;
  isActive: boolean;      // oxirgi 7 kun
};

function fullName(u: AdminUserRow): string {
  const parts = [u.firstName, u.lastName].filter(Boolean);
  return parts.join(" ") || u.username || `id:${u.telegramId}`;
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "hozir";
  if (min < 60) return `${min} daq oldin`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat oldin`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d} kun oldin`;
  const w = Math.floor(d / 7);
  if (w < 8) return `${w} hafta oldin`;
  return new Date(iso).toISOString().slice(0, 10);
}

function joinedDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function UsersList({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filter === "active" && !u.isActive) return false;
      if (filter === "inactive" && u.isActive) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        (u.username && u.username.toLowerCase().includes(q)) ||
        fullName(u).toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q))
      );
    });
  }, [users, query, filter]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((u) => selected.has(u.id));

  function toggleOne(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllFiltered() {
    setSelected((s) => {
      const next = new Set(s);
      if (allFilteredSelected) {
        filtered.forEach((u) => next.delete(u.id));
      } else {
        filtered.forEach((u) => next.add(u.id));
      }
      return next;
    });
  }

  const selectedIds = Array.from(selected);
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <>
      {/* Search + filters + bulk action */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="@username, ism yoki telefon bo'yicha qidirish..."
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
                  : "text-muted hover:text-foreground",
              )}
            >
              {f === "all" ? "Hammasi" : f === "active" ? "Faol" : "Nofaol"}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk announce bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
        <p className="text-[12px] text-muted">
          {selectedIds.length > 0
            ? `${selectedIds.length} ta tanlangan`
            : `${filtered.length} ta ko'rinmoqda · ${activeCount} ta faol (7 kun)`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <AnnounceButton
              label={`Tanlanganlarga (${selectedIds.length})`}
              target={{ type: "ids", ids: selectedIds }}
              targetSummary={`${selectedIds.length} ta tanlangan foydalanuvchi`}
            />
          )}
          <AnnounceButton
            label="Faollarga"
            target={{ type: "active" }}
            targetSummary={`Oxirgi 7 kunda faol ${activeCount} ta foydalanuvchi`}
          />
          <AnnounceButton
            label="Barchaga"
            target={{ type: "all" }}
            targetSummary={`Barcha ${users.length} ta foydalanuvchi`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_0_var(--border)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-subtle/40 text-left">
              <th className="w-10 px-3 py-2.5">
                <button
                  type="button"
                  onClick={toggleAllFiltered}
                  aria-label="Hammasini tanlash"
                  className="grid size-5 place-items-center text-muted hover:text-foreground"
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="size-4" strokeWidth={1.8} />
                  ) : (
                    <Square className="size-4" strokeWidth={1.8} />
                  )}
                </button>
              </th>
              <th className="px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">Foydalanuvchi</th>
              <th className="px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">Telegram</th>
              <th className="px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">Telefon</th>
              <th className="px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">Qo&apos;shilgan</th>
              <th className="px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">Oxirgi faollik</th>
              <th className="px-4 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">Tasklar</th>
              <th className="px-4 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">Holat</th>
              <th className="w-8 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {filtered.map((u) => {
              const name = fullName(u);
              const initials = name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const isSel = selected.has(u.id);
              return (
                <tr
                  key={u.id}
                  className={cn(
                    "group transition-colors hover:bg-hover/40",
                    isSel && "bg-accent-soft/40",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleOne(u.id)}
                      aria-label="Tanlash"
                      className="grid size-5 place-items-center text-muted hover:text-foreground"
                    >
                      {isSel ? (
                        <CheckSquare className="size-4 text-foreground" strokeWidth={1.8} />
                      ) : (
                        <Square className="size-4" strokeWidth={1.8} />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admode/foydalanuvchilar/${u.id}`}
                      className="flex items-center gap-2.5"
                    >
                      <div className="grid size-7 place-items-center rounded-md bg-subtle font-mono text-[10px] uppercase text-muted">
                        {initials || "??"}
                      </div>
                      <span className="text-[13px] font-medium">{name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-muted">
                    {u.username ? `@${u.username}` : <span className="text-faint">—</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-muted">
                    {u.phone || <span className="text-faint">—</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-faint">{joinedDate(u.joinedAt)}</td>
                  <td className="px-4 py-2.5 text-[12px] text-muted">{relTime(u.lastSeenAt)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[12px] tabular-nums">
                    {u.plansCount}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium",
                        u.isActive
                          ? "bg-accent-soft text-accent-ink"
                          : "bg-subtle text-faint",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          u.isActive ? "bg-accent" : "bg-faint/60",
                        )}
                      />
                      {u.isActive ? "Faol" : "Nofaol"}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <Link
                      href={`/admode/foydalanuvchilar/${u.id}`}
                      className="grid size-7 place-items-center rounded-md text-faint transition-colors group-hover:text-foreground"
                      aria-label="Foydalanuvchi rejalari"
                    >
                      <ChevronRight className="size-4" strokeWidth={1.8} />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-[13px] text-faint">
                  Hech narsa topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
