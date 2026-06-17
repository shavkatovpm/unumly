"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  ShoppingBag,
  Car,
  Coffee,
  Wifi,
  Home,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "./i18n";

type Tx = { title: string; cat: string; amount: string; positive?: boolean };
type Cat = { name: string; amount: string; pct: string };

// Amal tartibiga mos ikonkalar (matn i18n dan)
const TX_ICONS: LucideIcon[] = [
  Banknote,
  Home,
  ShoppingBag,
  Banknote,
  Car,
  ShoppingBag,
  Coffee,
  Smartphone,
  Wifi,
  Car,
  Coffee,
  ShoppingBag,
  Banknote,
  Home,
];

/**
 * "Moliya" bo'limining statik nusxasi — asl ilova uslubida.
 */
export function FinanceMockup() {
  const t = useT();
  const f = t.finance;
  const tx = f.tx as unknown as Tx[];
  const cats = f.cats as unknown as Cat[];

  return (
    <div className="flex flex-col bg-background">
      <header className="flex h-11 items-center justify-between border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-[13px] font-semibold tracking-[-0.01em]">
            {f.header}
          </h3>
          <span className="truncate text-[12px] text-faint">{f.month}</span>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
          {f.currency}
        </span>
      </header>

      <div className="p-4 sm:p-5">
        {/* Balans */}
        <div className="rounded-lg border border-border bg-surface px-4 py-3.5 shadow-[0_1px_0_var(--border)]">
          <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
            {f.balanceLabel}
          </p>
          <p className="mt-1 text-[26px] font-semibold tabular-nums tracking-tight">
            {f.balance}{" "}
            <span className="text-[14px] font-normal text-muted">
              {f.currency}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <span className="flex items-center gap-1.5 text-[12.5px]">
              <span className="grid size-5 place-items-center rounded bg-accent-soft text-accent">
                <ArrowDownLeft className="size-3.5" />
              </span>
              <span className="text-faint">{f.incomeLabel}</span>
              <span className="font-mono font-medium tabular-nums">
                {f.income}
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-[12.5px]">
              <span className="grid size-5 place-items-center rounded bg-danger-soft text-danger">
                <ArrowUpRight className="size-3.5" />
              </span>
              <span className="text-faint">{f.expenseLabel}</span>
              <span className="font-mono font-medium tabular-nums">
                {f.expense}
              </span>
            </span>
          </div>
        </div>

        {/* Byudjet */}
        <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 shadow-[0_1px_0_var(--border)]">
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] font-medium">{f.budgetLabel}</p>
            <p className="font-mono text-[11px] tabular-nums text-muted">
              {f.budgetValue}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: "64%" }}
            />
          </div>
        </div>

        {/* Toifalar bo'yicha */}
        <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 shadow-[0_1px_0_var(--border)]">
          <p className="text-[12.5px] font-medium">{f.catsLabel}</p>
          <div className="mt-3 space-y-2.5">
            {cats.map((c) => (
              <div key={c.name}>
                <div className="flex items-baseline justify-between text-[12px]">
                  <span className="text-muted">{c.name}</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {c.amount}
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-subtle">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: c.pct }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* So'nggi amallar */}
        <section className="mt-4 overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border)]">
          <header className="flex items-center justify-between border-b border-border bg-subtle/30 px-3 py-1.5">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
              {f.txLabel}
            </p>
            <p className="font-mono text-[10.5px] tabular-nums text-faint">
              {tx.length}
            </p>
          </header>
          <ul className="divide-y divide-border/70">
            {tx.map((item, i) => {
              const Icon = TX_ICONS[i] ?? Banknote;
              return (
                <li
                  key={`${item.title}-${i}`}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-subtle text-muted">
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-faint">{item.cat}</p>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-[12.5px] tabular-nums",
                      item.positive
                        ? "font-medium text-accent"
                        : "text-foreground"
                    )}
                  >
                    {item.amount}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
