"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clock, HandCoins, Wallet } from "lucide-react";
import type { DebtReminder } from "@/lib/debt-reminders";
import { shiftIso } from "@/lib/debt-reminders";
import { formatSom } from "@/lib/money";
import { cn } from "@/lib/utils";

const SNOOZE_OPTS = [
  { days: 1, label: "Ertaga" },
  { days: 3, label: "3 kun" },
  { days: 7, label: "1 hafta" },
];

/** Qarz muddati eslatmasi — Bugun/Agenda ro'yxatida. Hal qilinsa yo'qoladi,
 *  muddat o'tsa qizil, keyinroqqa surish (snooze) mumkin. */
export function DebtReminderRow({
  reminder,
  today,
  onSettle,
  onSnooze,
}: {
  reminder: DebtReminder;
  today: string;
  onSettle: () => void;
  onSnooze: (untilIso: string) => void;
}) {
  const { debt, overdue, outstanding } = reminder;
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const borrowed = debt.type === "BORROWED";
  // BORROWED — men oldim (qaytarishim kerak); LENT — men berdim (menga qaytaradi)
  const Icon = borrowed ? Wallet : HandCoins;
  const accent = overdue ? "var(--danger)" : "var(--info)";

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border px-3 py-2.5",
        overdue ? "border-danger/40" : "border-info/50"
      )}
      style={{
        borderColor: overdue ? "color-mix(in oklab, var(--danger) 45%, transparent)" : "color-mix(in oklab, var(--info) 50%, transparent)",
        background: overdue ? "var(--danger-soft)" : "var(--info-soft)",
      }}
    >
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full"
        style={{ background: "color-mix(in oklab, " + accent + " 18%, transparent)", color: accent }}
      >
        <Icon className="size-4" strokeWidth={2} />
      </span>

      <Link href="/moliya" className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[14px] font-medium sm:text-[13px]">
          {debt.counterparty}
          <span className="ml-1.5 font-mono text-[12.5px] tabular-nums" style={{ color: accent }}>
            {formatSom(outstanding)}
          </span>
          <span className="text-[11.5px] text-faint"> so&apos;m {borrowed ? "qaytarish" : "olish"}</span>
        </p>
        <p className="mt-0.5 text-[11px]" style={{ color: overdue ? accent : "var(--muted)" }}>
          {overdue ? "Muddat o'tgan" : "Muddat — bugun/yaqin"} · qarz eslatmasi
        </p>
      </Link>

      {/* Snooze */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setSnoozeOpen((v) => !v)}
          aria-label="Keyinroqqa surish"
          title="Keyinroqqa surish"
          className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
        >
          <Clock className="size-4" />
        </button>
        {snoozeOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSnoozeOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
              {SNOOZE_OPTS.map((o) => (
                <button
                  key={o.days}
                  type="button"
                  onClick={() => {
                    onSnooze(shiftIso(today, o.days));
                    setSnoozeOpen(false);
                  }}
                  className="block w-full whitespace-nowrap px-3 py-2 text-left text-[13px] text-muted transition-colors hover:bg-hover hover:text-foreground"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Hal qilindi */}
      <button
        type="button"
        onClick={onSettle}
        aria-label="Hal qilindi"
        title="Hal qilindi"
        className="grid size-7 shrink-0 place-items-center rounded-md border border-border-strong text-faint transition-colors hover:border-accent hover:text-foreground"
      >
        <Check className="size-3.5" />
      </button>
    </div>
  );
}
