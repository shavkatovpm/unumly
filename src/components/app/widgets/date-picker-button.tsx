"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function toKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function todayKey() {
  const t = new Date();
  return toKey(t.getFullYear(), t.getMonth(), t.getDate());
}

/**
 * Sanani tanlash tugmasi — bosilganda app uslubidagi ichki kalendar popover
 * ochiladi (OS ning oddiy native picker'i o'rniga). Popover portal orqali
 * `body`'ga chiziladi, shu sabab dialog `overflow`'ida qirqilmaydi.
 */
export function DatePickerButton({
  value,
  onChange,
  onClear,
  label,
  placeholder = "Sana tanlash",
  format,
  active,
  min,
  max,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Berilsa, tugma o'ngida tozalash (×) chiqadi. */
  onClear?: () => void;
  /** Ko'rsatiladigan matnni majburan belgilash (masalan, "Boshqa sana"). */
  label?: string;
  placeholder?: string;
  format?: (v: string) => string;
  /** Tanlangandek ko'rsatish (rang). Berilmasa value bor-yo'qligiga qarab. */
  active?: boolean;
  min?: string;
  max?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [view, setView] = useState(() => {
    const [y, m] = (value || todayKey()).split("-").map(Number);
    return { y, m: m - 1 };
  });

  useEffect(() => setMounted(true), []);

  // Ochilganda ko'rsatilayotgan oyni tanlangan sanaga moslash
  useLayoutEffect(() => {
    if (!open) return;
    const [y, m] = (value || todayKey()).split("-").map(Number);
    setView({ y, m: m - 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Popover joylashuvini hisoblash (pastga sig'masa — tepaga)
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const popH = popRef.current?.offsetHeight ?? 348;
    const popW = popRef.current?.offsetWidth ?? 300;
    const margin = 8;
    let top = r.bottom + 6;
    if (top + popH > window.innerHeight - margin) {
      const above = r.top - 6 - popH;
      top = above > margin ? above : Math.max(margin, window.innerHeight - popH - margin);
    }
    let left = r.left;
    if (left + popW > window.innerWidth - margin) left = window.innerWidth - popW - margin;
    if (left < margin) left = margin;
    setCoords({ top, left });
  }, [open, view]);

  // Tashqariga bosilsa / Esc — yopish
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isSet = !!value;
  const selected = active ?? isSet;
  const text = label ?? (isSet ? (format ? format(value) : value) : placeholder);
  const tKey = todayKey();

  const firstWeekday = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Du = 0
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function isDisabled(key: string) {
    if (min && key < min) return true;
    if (max && key > max) return true;
    return false;
  }
  function shiftMonth(delta: number) {
    setView((v) => {
      const total = v.y * 12 + v.m + delta;
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
    });
  }

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-full border py-1.5 pl-3 text-[12.5px] transition-colors",
          onClear && isSet ? "pr-8" : "pr-3",
          selected || open
            ? "border-foreground/30 bg-hover font-medium text-foreground"
            : "border-border text-muted hover:bg-hover hover:text-foreground"
        )}
      >
        <CalendarDays className="size-3.5 shrink-0" />
        <span className="truncate">{text}</span>
      </button>

      {onClear && isSet && (
        <button
          type="button"
          aria-label="Tozalash"
          onClick={onClear}
          className="absolute right-1.5 top-1/2 z-10 grid size-5 -translate-y-1/2 place-items-center rounded-full text-faint transition-colors hover:bg-hover hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      )}

      {mounted && open &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label="Sanani tanlash"
            style={coords ? { top: coords.top, left: coords.left } : { top: -9999, left: -9999 }}
            className="fade-in fixed z-[120] w-[300px] max-w-[calc(100vw-1rem)] rounded-xl border border-border bg-surface p-3 shadow-2xl"
          >
            {/* Oy navigatsiyasi */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Oldingi oy"
                className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-[13px] font-semibold tabular-nums">
                {MONTHS[view.m]} {view.y}
              </p>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Keyingi oy"
                className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Hafta kunlari */}
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="grid h-7 place-items-center text-[10.5px] font-medium uppercase tracking-wide text-faint"
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Kunlar */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                if (d === null) return <div key={`b${i}`} className="h-9" />;
                const key = toKey(view.y, view.m, d);
                const isSel = key === value;
                const isToday = key === tKey;
                const dis = isDisabled(key);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={dis}
                    onClick={() => {
                      onChange(key);
                      setOpen(false);
                    }}
                    className={cn(
                      "grid h-9 place-items-center rounded-md text-[13px] tabular-nums transition-colors",
                      dis && "cursor-not-allowed text-faint/40",
                      !dis && isSel && "bg-foreground font-semibold text-background",
                      !dis && !isSel && "text-foreground hover:bg-hover",
                      !dis && !isSel && isToday && "font-semibold ring-1 ring-inset ring-border"
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!isDisabled(tKey)) {
                    onChange(tKey);
                    setOpen(false);
                  }
                }}
                disabled={isDisabled(tKey)}
                className="rounded-md px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-hover hover:text-foreground disabled:opacity-40"
              >
                Bugun
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-[12px] text-faint transition-colors hover:bg-hover hover:text-foreground"
              >
                Yopish
              </button>
            </div>
          </div>,
          document.body
        )}
    </span>
  );
}
