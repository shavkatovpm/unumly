"use client";

/* Umumiy: Kirim | Chiqim donutlari yonma-yon (bosilgani ostida izohi),
   Yig'im va Qarz kartalari, byudjet limitlari va so'nggi yozuvlar. */

import { useMemo, useState } from "react";
import { ChevronRight, HandCoins, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransactionType } from "@/lib/types";
import { formatMoney, formatMonthLabel, monthKey } from "@/lib/money";
import { useMoliya } from "../context";
import { Donut, DonutCenter, Legend, type Slice } from "../donut";
import { TxnRow } from "../txn-sheet";
import { BudgetBar, List, SectionLabel, catSolid, short } from "../shared";

export function OverviewTab() {
  const { fin, catMap, month, setCatType, selectTab, openTxn } = useMoliya();
  const [open, setOpen] = useState<TransactionType>("EXPENSE");
  const [active, setActive] = useState<string | null>(null);

  const monthTxns = useMemo(() => fin.transactions.filter((t) => t.date.startsWith(month)), [fin.transactions, month]);
  const totals = useMemo(() => {
    const byCat = new Map<string, { type: TransactionType; categoryId: string | null; total: number }>();
    let income = 0;
    let expense = 0;
    for (const t of monthTxns) {
      if (t.type === "INCOME") income += t.amount; else expense += t.amount;
      const key = `${t.type}:${t.categoryId ?? "none"}`;
      const e = byCat.get(key) ?? { type: t.type, categoryId: t.categoryId, total: 0 };
      e.total += t.amount;
      byCat.set(key, e);
    }
    return { income, expense, rows: [...byCat.values()].sort((a, b) => b.total - a.total) };
  }, [monthTxns]);

  const slicesOf = (type: TransactionType): Slice[] =>
    totals.rows
      .filter((r) => r.type === type)
      .map((r) => {
        const c = r.categoryId ? catMap.get(r.categoryId) : undefined;
        return { id: r.categoryId ?? "none", label: c?.label ?? "Kategoriyasiz", value: r.total, color: c ? catSolid(c.color) : "var(--faint)" };
      });
  const inc = slicesOf("INCOME");
  const exp = slicesOf("EXPENSE");
  const list = open === "EXPENSE" ? exp : inc;
  const isCurrent = month === monthKey();

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {([["INCOME", inc, "Kirim", totals.income], ["EXPENSE", exp, "Chiqim", totals.expense]] as const).map(([k, sl, label, total]) => {
          const on = open === k;
          return (
            <div
              key={k}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              onClick={() => { setOpen(k); setActive(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { setOpen(k); setActive(null); } }}
              className={cn("flex cursor-pointer flex-col items-center rounded-[22px] border bg-surface p-3 transition-colors", on ? "border-foreground/40" : "border-border")}
            >
              <Donut
                slices={[...sl]}
                active={on ? active : null}
                onPick={on ? setActive : undefined}
                center={on ? <DonutCenter slices={[...sl]} active={active} label={label} total={total} /> : <><span className="block text-[11.5px] font-medium text-muted">{label}</span><span className="block text-[15px] font-bold tabular-nums">{short(total)}</span></>}
              />
              <span className={cn("mt-2 text-[12px] font-semibold", on ? "text-foreground" : "text-faint")}>{on ? "Ochiq" : "Ko'rish"}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 rounded-[22px] border border-border bg-surface p-3">
        <div className="flex items-center justify-between px-1.5 pb-1">
          <p className="text-[13px] font-semibold text-muted">{open === "EXPENSE" ? "Chiqim" : "Kirim"} bo&apos;yicha{isCurrent ? "" : ` · ${formatMonthLabel(month)}`}</p>
          <button type="button" onClick={() => { setCatType(open); selectTab("kategoriya"); }} className="-mr-1 flex h-8 items-center gap-0.5 rounded-full px-2 text-[12.5px] font-semibold text-muted active:bg-hover">
            Barchasi <ChevronRight className="size-3.5" />
          </button>
        </div>
        {list.length === 0 ? (
          <p className="py-5 text-center text-[13.5px] text-faint">{open === "EXPENSE" ? "Bu oyda chiqim yo'q" : "Bu oyda kirim yo'q"}</p>
        ) : (
          <Legend slices={list} active={active} onPick={setActive} />
        )}
      </div>

      <SideCards />
      <Budgets totals={totals.rows} />

      <SectionLabel aside={monthTxns.length > 0 ? <button type="button" onClick={() => selectTab("tarix")} className="-my-1 flex h-8 items-center gap-0.5 px-1 font-semibold text-muted">Barchasi <ChevronRight className="size-3.5" /></button> : undefined}>Tarix</SectionLabel>
      {monthTxns.length === 0 ? (
        <p className="rounded-[22px] border border-border bg-surface py-6 text-center text-[13.5px] text-faint">Bu oyda yozuv yo&apos;q</p>
      ) : (
        <List>
          {[...monthTxns]
            .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : a.date < b.date ? 1 : -1))
            .slice(0, 4)
            .map((t) => <TxnRow key={t.id} t={t} onOpen={() => openTxn(t.id)} />)}
        </List>
      )}
    </>
  );
}

function SideCards() {
  const { fin, debtsApi, selectTab } = useMoliya();
  const saved = fin.goals.reduce((s, g) => s + g.savedAmount, 0);
  const target = fin.goals.reduce((s, g) => s + g.targetAmount, 0);
  // Qolgan qarzlar — har valyuta alohida (so'm birinchi).
  const open = debtsApi.debts.filter((d) => !d.settledAt);
  const sum = (type: "LENT" | "BORROWED") => {
    const m = new Map<string, number>();
    for (const d of open) if (d.type === type) m.set(d.currency ?? "UZS", (m.get(d.currency ?? "UZS") ?? 0) + Math.max(0, d.amount - d.paidAmount));
    return [...m.entries()].sort((a, b) => (a[0] === "UZS" ? -1 : b[0] === "UZS" ? 1 : 0));
  };
  const lent = sum("LENT");
  const borrowed = sum("BORROWED");
  const fmt = (cur: string, n: number) => (cur === "UZS" ? short(n) : formatMoney(n, cur as "USD" | "EUR"));
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" onClick={() => selectTab("yigim")} className="rounded-[20px] border border-border bg-surface p-3.5 text-left active:bg-hover">
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted"><PiggyBank className="size-4" />Yig&apos;im</span>
        <span className="mt-1.5 block text-[17px] font-bold tabular-nums">{short(saved)}</span>
        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-subtle">
          <span className="block h-full rounded-full bg-foreground" style={{ width: `${target ? Math.min(100, (saved / target) * 100) : 0}%` }} />
        </span>
      </button>
      <button type="button" onClick={() => selectTab("qarz")} className="rounded-[20px] border border-border bg-surface p-3.5 text-left active:bg-hover">
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted"><HandCoins className="size-4" />Qarz</span>
        {lent.length === 0 && borrowed.length === 0 ? (
          <span className="mt-1.5 block text-[14px] text-faint">Faol qarz yo&apos;q</span>
        ) : (
          <>
            <span className="mt-1.5 block" />
            {lent.length > 0 && <span className="block truncate text-[13.5px] tabular-nums"><span className="font-bold">+{lent.map(([c, n]) => fmt(c, n)).join(" · ")}</span> <span className="text-faint">berilgan</span></span>}
            {borrowed.length > 0 && <span className="block truncate text-[13.5px] tabular-nums"><span className="font-bold">−{borrowed.map(([c, n]) => fmt(c, n)).join(" · ")}</span> <span className="text-faint">olingan</span></span>}
          </>
        )}
      </button>
    </div>
  );
}

function Budgets({ totals }: { totals: { type: TransactionType; categoryId: string | null; total: number }[] }) {
  const { fin, catMap, openCat } = useMoliya();
  const rows = fin.budgets
    .map((b) => {
      const cat = catMap.get(b.categoryId);
      const used = totals.find((t) => t.type === "EXPENSE" && t.categoryId === b.categoryId)?.total ?? 0;
      return cat ? { cat, used, limit: b.amount, pct: b.amount > 0 ? used / b.amount : 0 } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.pct - a.pct);
  if (rows.length === 0) return null;
  return (
    <>
      <SectionLabel aside="oylik limit">Byudjet</SectionLabel>
      <List>
        {rows.map(({ cat, used, limit, pct }) => (
          <button key={cat.id} type="button" onClick={() => openCat(cat.id)} className="block w-full px-3.5 py-3 text-left active:bg-hover">
            <span className="flex items-center justify-between gap-2 text-[14.5px]">
              <span className="truncate font-medium">{cat.label}</span>
              <span className={cn("shrink-0 tabular-nums", pct > 1 ? "font-semibold text-danger" : "text-muted")}>{short(used)} / {short(limit)}</span>
            </span>
            <BudgetBar pct={pct} className="mt-2" />
          </button>
        ))}
      </List>
    </>
  );
}
