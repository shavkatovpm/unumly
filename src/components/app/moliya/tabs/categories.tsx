"use client";

/* Kirim-chiqim: kategoriyalar oy summasi bilan, chiqimda oylik limit.
   Kategoriya oynasida — limit, tahrirlash/o'chirish va shu oydagi yozuvlar. */

import { useMemo, useState } from "react";
import { ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinanceCategory, TransactionType } from "@/lib/types";
import { formatMonthLabel, formatSom } from "@/lib/money";
import { MonoSheet } from "../../widgets/mono-sheet";
import { ConfirmDialog } from "../../widgets/confirm-dialog";
import { CategoryForm } from "../category-form";
import { useMoliya } from "../context";
import { TxnRow } from "../txn-sheet";
import { ActionGrid, BudgetBar, CatBadge, DashedButton, EXPENSE_COLOR, Expand, List, MoneyInput, SectionLabel, Segmented, SheetCard, TYPE_META, budgetColor, useOnClose, type SheetState } from "../shared";

function useMonthTotals() {
  const { fin, month } = useMoliya();
  return useMemo(() => {
    const m = new Map<string, { total: number; count: number }>();
    for (const t of fin.transactions) {
      if (!t.date.startsWith(month)) continue;
      const key = `${t.type}:${t.categoryId ?? "none"}`;
      const e = m.get(key) ?? { total: 0, count: 0 };
      e.total += t.amount;
      e.count += 1;
      m.set(key, e);
    }
    return m;
  }, [fin.transactions, month]);
}

export function CategoriesTab() {
  const { fin, catType: type, setCatType, openCat, newCategory } = useMoliya();
  const totals = useMonthTotals();
  const budgetMap = useMemo(() => new Map(fin.budgets.map((b) => [b.categoryId, b.amount])), [fin.budgets]);
  const none = totals.get(`${type}:none`);
  // Summasi ko'p bo'lgan tepada (Kategoriyasiz ham shu tartibda); teng bo'lsa — foydalanuvchi tartibi.
  const rows = [
    ...fin.categories.filter((c) => c.type === type).map((c) => ({ key: c.id, cat: c as FinanceCategory | undefined, total: totals.get(`${type}:${c.id}`)?.total ?? 0, count: totals.get(`${type}:${c.id}`)?.count ?? 0, order: c.order })),
    ...(none && none.total > 0 ? [{ key: `none:${type}`, cat: undefined, total: none.total, count: none.count, order: Number.MAX_SAFE_INTEGER }] : []),
  ].sort((a, b) => b.total - a.total || a.order - b.order);
  const grand = rows.reduce((s, r) => s + r.total, 0);
  const meta = TYPE_META[type];

  return (
    <>
      <Segmented<TransactionType> value={type} onChange={setCatType} options={[{ id: "EXPENSE", label: "Chiqim" }, { id: "INCOME", label: "Kirim" }]} />
      <div className="mt-2.5 flex min-h-[52px] items-center justify-between rounded-[20px] border border-border bg-surface px-4">
        <span className="flex items-center gap-2 text-[14px] text-muted">
          <span className="grid size-6 place-items-center rounded-full text-white" style={{ background: meta.color }}><meta.icon className="size-3.5" strokeWidth={2.6} /></span>
          Bu oy — jami {meta.label.toLowerCase()}
        </span>
        <span className="text-[17px] font-bold tabular-nums">{formatSom(grand)}</span>
      </div>
      <SectionLabel aside={type === "EXPENSE" ? "limit — oylik" : undefined}>Kategoriyalar</SectionLabel>
      {rows.length === 0 ? (
        <p className="rounded-[22px] border border-border bg-surface py-8 text-center text-[14px] text-faint">Kategoriya yo&apos;q</p>
      ) : (
        <List>
          {rows.map((r) => (
            <CategoryRow key={r.key} cat={r.cat} type={type} total={r.total} count={r.count} limit={r.cat ? budgetMap.get(r.cat.id) ?? null : null} onOpen={() => openCat(r.key)} />
          ))}
        </List>
      )}
      {type === "EXPENSE" && <p className="mt-2 px-1 text-[12.5px] text-faint">Har chiqim kategoriyasiga oylik limit qo&apos;ysangiz bo&apos;ladi — kategoriyani oching.</p>}
      <DashedButton onClick={newCategory}>Yangi kategoriya</DashedButton>
    </>
  );
}

function CategoryRow({ cat, type, total, count, limit, onOpen }: { cat: FinanceCategory | undefined; type: TransactionType; total: number; count: number; limit: number | null; onOpen: () => void }) {
  const pct = limit ? total / limit : 0;
  return (
    <button type="button" onClick={onOpen} className={cn("block min-h-[62px] w-full px-3.5 py-2.5 text-left active:bg-hover", !cat && "bg-subtle/40")}>
      <span className="flex w-full items-center gap-3">
        <CatBadge cat={cat} />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[15px] font-medium", !cat && "text-muted")}>{cat?.label ?? "Kategoriyasiz"}</span>
          <span className="block text-[12.5px] text-faint">{count > 0 ? `${count} ta yozuv` : "Bu oyda yozuv yo'q"}</span>
        </span>
        <span className="shrink-0 text-right tabular-nums">
          <span className="block text-[15px] font-semibold" style={{ color: limit ? budgetColor(pct) : total > 0 ? undefined : "var(--faint)" }}>{formatSom(total)}</span>
          {limit ? <span className="block text-[12px] text-faint">/ {formatSom(limit)}</span> : type === "EXPENSE" && cat ? <span className="block text-[12px] text-faint">limitsiz</span> : null}
        </span>
        <ChevronRight className="size-4 shrink-0 text-faint" />
      </span>
      {limit ? (
        <span className="mt-2 block pl-12 pr-7">
          <BudgetBar pct={pct} />
          {pct > 1 && <span className="mt-1 block text-[12px] font-medium" style={{ color: EXPENSE_COLOR }}>Limitdan {formatSom(total - limit)} so&apos;m oshib ketdi</span>}
        </span>
      ) : null}
    </button>
  );
}

/** Kategoriya oynasi (id yoki "none:TYPE" — kategoriyasiz yozuvlar). */
export function CategorySheet({ state }: { state: SheetState }) {
  const { fin, month, catMap, openTxn } = useMoliya();
  const key = state.id ?? "";
  const noneType = key.startsWith("none:") ? (key.slice(5) as TransactionType) : null;
  const cat = !noneType ? catMap.get(key) : undefined;
  const type: TransactionType = noneType ?? cat?.type ?? "EXPENSE";
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [limitEdit, setLimitEdit] = useState(false);
  const [limitDraft, setLimitDraft] = useState(0);
  useOnClose(state.open, () => { setEditing(false); setLimitEdit(false); });

  const list = fin.transactions
    .filter((t) => t.date.startsWith(month) && t.type === type && (noneType ? !t.categoryId : t.categoryId === key))
    .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : a.date < b.date ? 1 : -1));
  const total = list.reduce((s, t) => s + t.amount, 0);
  const limit = cat ? fin.budgets.find((b) => b.categoryId === cat.id)?.amount ?? null : null;
  const pct = limit ? total / limit : 0;
  const exists = !!noneType || !!cat;

  return (
    <>
      <MonoSheet open={state.open && exists} onClose={state.hide} label={cat?.label ?? "Kategoriyasiz"} dismissable={!editing && !limitEdit}>
        {exists && (
          <>
            <SheetCard kicker={`${TYPE_META[type].label} · ${formatMonthLabel(month)}`} title={cat?.label ?? "Kategoriyasiz"} icon={<CatBadge cat={cat} size={48} />} onClose={state.hide}>
              <p className="mt-4 text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums">
                {formatSom(total)}<span className="ml-1.5 text-[15px] font-medium tracking-normal text-faint">so&apos;m</span>
              </p>
              {cat?.type === "EXPENSE" && (
                <div className="mt-3.5">
                  {limit ? (
                    <>
                      <BudgetBar pct={pct} />
                      <p className="mt-1.5 flex justify-between text-[13px] text-muted">
                        <span>Limit: {formatSom(limit)} so&apos;m</span>
                        <span className="font-semibold tabular-nums" style={{ color: budgetColor(pct) }}>{Math.round(pct * 100)}%</span>
                      </p>
                      {pct > 1
                        ? <p className="mt-0.5 text-[13px] font-medium" style={{ color: EXPENSE_COLOR }}>Limitdan {formatSom(total - limit)} so&apos;m oshib ketdi</p>
                        : <p className="mt-0.5 text-[13px] text-faint">Yana {formatSom(limit - total)} so&apos;m sarflash mumkin</p>}
                    </>
                  ) : null}
                  {!limitEdit ? (
                    <button type="button" onClick={() => { setLimitDraft(limit ?? 0); setLimitEdit(true); }} className="mt-3 flex h-10 items-center gap-1.5 rounded-full bg-subtle px-4 text-[13.5px] font-semibold">
                      {limit ? <Pencil className="size-4" /> : <Plus className="size-4" />} {limit ? "Limitni o'zgartirish" : "Oylik limit qo'yish"}
                    </button>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <MoneyInput value={limitDraft} onChange={setLimitDraft} placeholder="Limit belgilanmagan" autoFocus />
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => { if (limit) fin.removeBudget(cat.id); setLimitEdit(false); }} className="h-11 rounded-[16px] border border-border text-[14px] font-semibold text-muted">{limit ? "Olib tashlash" : "Bekor"}</button>
                        <button type="button" disabled={limitDraft <= 0} onClick={() => { fin.setBudget(cat.id, limitDraft); setLimitEdit(false); }} className="h-11 rounded-[16px] bg-accent text-[14px] font-semibold text-accent-ink disabled:opacity-35">Saqlash</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </SheetCard>
            {cat && (
              <>
                <ActionGrid
                  items={[
                    { icon: editing ? X : Pencil, label: editing ? "Yopish" : "Tahrirlash", onClick: () => setEditing((v) => !v), tone: editing ? "active" : undefined },
                    { icon: Trash2, label: "O'chirish", onClick: () => setConfirm(true), tone: "danger" },
                  ]}
                />
                <Expand open={editing}>
                  <CategoryForm
                    key={cat.id}
                    type={cat.type}
                    inline
                    initial={cat}
                    submitLabel="Saqlash"
                    onCancel={() => setEditing(false)}
                    onSubmit={(p) => { fin.updateCategory(cat.id, { label: p.label, icon: p.icon, color: p.color }); setEditing(false); }}
                  />
                </Expand>
              </>
            )}
            <div className="flex items-center justify-between px-2 pt-2">
              <p className="text-[13px] font-semibold text-muted">Bu oydagi yozuvlar</p>
              {list.length > 0 && <span className="text-[12.5px] tabular-nums text-faint">{list.length} ta</span>}
            </div>
            {list.length === 0 ? (
              <p className="rounded-[22px] border border-border bg-surface py-8 text-center text-[14px] text-faint">Bu oyda yozuv yo&apos;q</p>
            ) : (
              <List>{list.map((t) => <TxnRow key={t.id} t={t} showCat={false} onOpen={() => openTxn(t.id)} />)}</List>
            )}
          </>
        )}
      </MonoSheet>
      <ConfirmDialog
        open={confirm}
        title="Kategoriyani o'chirish"
        description={`"${cat?.label ?? ""}" kategoriyasi o'chiriladi. Unga bog'langan yozuvlar saqlanadi (kategoriyasiz bo'ladi).`}
        confirmLabel="O'chirish"
        destructive
        onClose={() => setConfirm(false)}
        onConfirm={() => { const id = cat?.id; setConfirm(false); state.hide(); if (id) fin.removeCategory(id); }}
      />
    </>
  );
}

export function CategoryCreateSheet({ open, type, onClose }: { open: boolean; type: TransactionType; onClose: () => void }) {
  const { fin } = useMoliya();
  return (
    <MonoSheet open={open} onClose={onClose} label="Yangi kategoriya" dismissable={false}>
      <CategoryForm
        type={type}
        showLimit={type === "EXPENSE"}
        onCancel={onClose}
        onSubmit={(c) => {
          const id = fin.addCategory({ type, label: c.label, icon: c.icon, color: c.color });
          if (c.limit) fin.setBudget(id, c.limit);
          onClose();
        }}
      />
    </MonoSheet>
  );
}

