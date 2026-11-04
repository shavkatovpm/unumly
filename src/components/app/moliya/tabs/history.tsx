"use client";

/* Tarix: Hammasi / Kirim / Chiqim, oy jami va kunlar bo'yicha yozuvlar. */

import { useMemo, useState } from "react";
import { Plus, Receipt } from "lucide-react";
import type { Transaction, TransactionType } from "@/lib/types";
import { formatSom } from "@/lib/money";
import { useMoliya } from "../context";
import { TxnRow } from "../txn-sheet";
import { EXPENSE_COLOR, INCOME_COLOR, List, SectionLabel, Segmented, dayLabel } from "../shared";

type Filter = "ALL" | TransactionType;

export function HistoryTab() {
  const { fin, month, openTxn, openCapsule } = useMoliya();
  const [filter, setFilter] = useState<Filter>("ALL");
  const monthTxns = useMemo(() => fin.transactions.filter((t) => t.date.startsWith(month)), [fin.transactions, month]);
  const list = filter === "ALL" ? monthTxns : monthTxns.filter((t) => t.type === filter);
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of monthTxns) if (t.type === "INCOME") income += t.amount; else expense += t.amount;
    return { income, expense };
  }, [monthTxns]);
  const groups = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const t of list) m.set(t.date, [...(m.get(t.date) ?? []), t]);
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [list]);

  const label = filter === "INCOME" ? "Bu oy — jami kirim" : filter === "EXPENSE" ? "Bu oy — jami chiqim" : "Bu oy — balans";
  const value = filter === "INCOME" ? totals.income : filter === "EXPENSE" ? totals.expense : totals.income - totals.expense;
  const color = filter === "INCOME" ? INCOME_COLOR : filter === "EXPENSE" ? EXPENSE_COLOR : value < 0 ? EXPENSE_COLOR : undefined;
  const empty = filter === "INCOME" ? "Bu oyda kirim yo'q" : filter === "EXPENSE" ? "Bu oyda chiqim yo'q" : "Bu oyda yozuv yo'q";

  return (
    <>
      <Segmented<Filter> value={filter} onChange={setFilter} options={[{ id: "ALL", label: "Hammasi" }, { id: "INCOME", label: "Kirim" }, { id: "EXPENSE", label: "Chiqim" }]} />
      {monthTxns.length > 0 && (
        <div className="mt-2.5 flex min-h-[52px] items-center justify-between rounded-[20px] border border-border bg-surface px-4">
          <span className="text-[14px] text-muted">{label}</span>
          <span className="text-[17px] font-bold tabular-nums" style={{ color }}>{formatSom(value)} <span className="text-[13px] font-medium text-faint">so&apos;m</span></span>
        </div>
      )}
      {list.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-subtle text-faint"><Receipt className="size-6" /></span>
          <p className="mt-3 text-[17px] font-semibold">{empty}</p>
          <button type="button" onClick={openCapsule} className="mx-auto mt-5 flex h-11 items-center gap-1.5 rounded-full bg-accent px-5 text-[14px] font-semibold text-accent-ink">
            <Plus className="size-4" strokeWidth={2.6} /> Yozuv qo&apos;shish
          </button>
        </div>
      ) : (
        groups.map(([date, items]) => (
          <div key={date}>
            <SectionLabel aside={`${items.length} ta`}>{dayLabel(date)}</SectionLabel>
            <List>{items.map((t) => <TxnRow key={t.id} t={t} onOpen={() => openTxn(t.id)} />)}</List>
          </div>
        ))
      )}
    </>
  );
}
