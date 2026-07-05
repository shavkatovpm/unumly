"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OccupiedSlot } from "@/lib/dates";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function nowSlot(): string {
  const d = new Date();
  const total = d.getHours() * 60 + Math.round(d.getMinutes() / 15) * 15;
  const wrapped = total % (24 * 60);
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

const ALL_SLOTS = HOURS.flatMap((h) => MINUTES.map((m) => `${pad(h)}:${pad(m)}`));

export function TimePicker({
  value,
  onChange,
  onClear,
  disableBefore,
  occupiedSlots,
}: {
  value: string;
  onChange: (next: string) => void;
  onClear?: () => void;
  /** HH:MM — slots strictly less than this are unselectable (shown as past) */
  disableBefore?: string;
  /** HH:MM slots already booked by other tasks (shown as busy, but still
   *  selectable — picking one schedules a parallel task at the same time). */
  occupiedSlots?: OccupiedSlot[];
}) {
  const occupied = useMemo(() => {
    const set = new Set<string>();
    const titles = new Map<string, string[]>();
    for (const o of occupiedSlots ?? []) {
      set.add(o.time);
      if (!o.title) continue;
      const arr = titles.get(o.time) ?? [];
      arr.push(o.title);
      titles.set(o.time, arr);
    }
    return { set, titles };
  }, [occupiedSlots]);
  const current = nowSlot();
  const currentDisabled = !!disableBefore && current < disableBefore;
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Set when the user picks a busy slot — asks for confirmation before
  // scheduling a parallel task at that time, instead of applying it right away.
  const [pendingBusy, setPendingBusy] = useState<{ slot: string; titles: string[] } | null>(null);

  function pick(slot: string, isBusy: boolean) {
    if (isBusy) {
      setPendingBusy({ slot, titles: occupied.titles.get(slot) ?? [] });
      return;
    }
    onChange(slot);
  }

  // Auto-scroll to current value, or first selectable slot on open
  useEffect(() => {
    const el = activeRef.current;
    if (!el || !listRef.current) return;
    el.scrollIntoView({ block: "center" });
  }, []);

  return (
    <div className="space-y-2">
      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={currentDisabled}
          onClick={() => pick(current, occupied.set.has(current))}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] tabular-nums transition-colors",
            currentDisabled
              ? "cursor-not-allowed border-border/40 bg-surface text-faint/50 line-through"
              : value === current
              ? "border-accent bg-accent text-accent-ink"
              : "border-border bg-surface text-foreground hover:bg-hover"
          )}
          title={currentDisabled ? "O'tib ketgan vaqt" : `Hozirgi vaqt: ${current}`}
        >
          <Clock className="size-3" />
          Hozir
          <span className={cn(currentDisabled ? "text-faint/50" : "text-faint")}>
            {current}
          </span>
        </button>
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <X className="size-3" />
            Tozalash
          </button>
        )}
      </div>

      {/* Band slotga bosilganda — ro'yxat o'rniga tasdiqlash so'raladi */}
      {pendingBusy ? (
        <div className="rounded-md border border-border bg-surface p-3 text-center">
          <p className="flex items-center justify-center gap-1.5 font-mono text-[13px] tabular-nums text-foreground">
            <TriangleAlert className="size-3.5 text-warning" />
            {pendingBusy.slot} band
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            {pendingBusy.titles.length > 0 ? (
              <>
                <span className="font-medium text-foreground">{pendingBusy.titles.join(", ")}</span>{" "}
                bilan bir vaqtga to&apos;g&apos;ri keladi.
              </>
            ) : (
              "Boshqa reja shu vaqtga band qilingan."
            )}
            {" "}Baribir shu vaqtga qo&apos;yilsinmi?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setPendingBusy(null)}
              className="flex-1 rounded-md border border-border py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-hover hover:text-foreground"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={() => { onChange(pendingBusy.slot); setPendingBusy(null); }}
              className="flex-1 rounded-md bg-accent py-1.5 text-[12px] font-medium text-accent-ink transition-opacity hover:opacity-90"
            >
              Ha, qo&apos;yish
            </button>
          </div>
        </div>
      ) : (
      <div
        ref={listRef}
        className="max-h-[240px] overflow-y-auto rounded-md border border-border bg-surface"
      >
        {ALL_SLOTS.map((slot) => {
          const active = slot === value;
          const isCurrent = slot === current;
          const isPast = !!disableBefore && slot < disableBefore;
          const isBusy = !isPast && occupied.set.has(slot);
          // Busy slots stay selectable — picking one schedules a parallel
          // task at the same time as whatever already occupies it.
          const disabled = isPast;
          const busyTitle = isBusy ? occupied.titles.get(slot)?.join(", ") : undefined;
          // Anchor scroll to selected value if any; otherwise to first
          // selectable slot near "now".
          const isScrollAnchor =
            active ||
            (!value &&
              (disableBefore
                ? slot === ALL_SLOTS.find((s) => s >= disableBefore)
                : isCurrent));
          return (
            <button
              key={slot}
              ref={isScrollAnchor ? activeRef : null}
              type="button"
              disabled={disabled}
              onClick={() => pick(slot, isBusy)}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left font-mono text-[12.5px] tabular-nums transition-colors",
                isPast && "cursor-not-allowed text-faint/45 line-through",
                !isPast && isBusy && "bg-subtle/60 text-muted hover:bg-hover",
                !disabled && active && "bg-accent text-accent-ink",
                !disabled && !isBusy && !active && "text-foreground hover:bg-hover"
              )}
              title={
                isPast
                  ? "O'tib ketgan vaqt"
                  : isBusy
                  ? busyTitle
                    ? `Band: ${busyTitle} — bosib parallel task qo'shishingiz mumkin`
                    : "Boshqa reja band qilgan — bosib parallel task qo'shishingiz mumkin"
                  : undefined
              }
            >
              <span className="shrink-0">{slot}</span>
              {isCurrent && !active && !disabled && (
                <span className="rounded bg-current-time/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-current-time">
                  hozir
                </span>
              )}
              {isPast && isCurrent && (
                <span className="font-mono text-[9px] uppercase tracking-wider text-faint/60">
                  o&apos;tgan
                </span>
              )}
              {isBusy && (
                <span className="flex min-w-0 items-center gap-1 overflow-hidden">
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-faint">
                    band
                  </span>
                  {busyTitle && (
                    <span className="truncate text-[10.5px] normal-case tracking-normal text-faint">
                      · {busyTitle}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}
