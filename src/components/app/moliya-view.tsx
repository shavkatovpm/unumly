"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Budget, CategoryColor, FinanceCategory, Transaction, TransactionType } from "@/lib/types";
import {
  summarize,
  useFinance,
  useHydratedFinance,
} from "@/lib/finance-store";
import { CATEGORY_COLOR_KEYS, CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import { FINANCE_ICON_KEYS, financeIcon } from "@/lib/finance-icons";
import {
  dateKey,
  formatMonthLabel,
  formatSom,
  monthKey,
  shiftMonth,
} from "@/lib/money";
import { Dialog } from "./widgets/dialog";
import { useConfirmRemove } from "./widgets/confirm-dialog";
import { ListLoader } from "./widgets/list-loader";

const INCOME_COLOR = "oklch(0.62 0.13 158)"; // yashil
const EXPENSE_COLOR = "oklch(0.62 0.17 22)"; // qizil

type Tab = "umumiy" | "tranzaksiyalar" | "byudjet";

function catColor(c: FinanceCategory | undefined): CategoryColor {
  return c?.color ?? "gray";
}

/* ════════════════════════════════════════════════════════════
   Main view
   ════════════════════════════════════════════════════════════ */

export function MoliyaView() {
  const {
    transactions, categories, budgets,
    addTransaction, updateTransaction, removeTransaction,
    addCategory, setBudget, removeBudget,
  } = useFinance();
  const hydrated = useHydratedFinance();

  const [month, setMonth] = useState(() => monthKey());
  const [tab, setTab] = useState<Tab>("umumiy");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const catMap = useMemo(() => {
    const m = new Map<string, FinanceCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const monthTxns = useMemo(
    () => transactions.filter((t) => t.date.startsWith(month)),
    [transactions, month]
  );
  const summary = useMemo(() => summarize(transactions, month), [transactions, month]);

  // Joriy oy chiqimi — kategoriya bo'yicha (byudjet progress uchun)
  const spentByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of summary.byCategory) {
      if (b.type === "EXPENSE" && b.categoryId) m.set(b.categoryId, b.total);
    }
    return m;
  }, [summary]);

  const confirmItems = useMemo(
    () => monthTxns.map((t) => ({ id: t.id, title: txnTitle(t, catMap) })),
    [monthTxns, catMap]
  );
  const { askRemove, confirmEl } = useConfirmRemove(confirmItems, removeTransaction, {
    itemLabel: "Yozuvni",
  });

  function openEdit(t: Transaction) {
    setEditing(t);
    setAddOpen(true);
  }
  function closeDialog() {
    setAddOpen(false);
    setEditing(null);
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-4 pb-24 pt-3 md:pb-6">
      {/* Header — oy navigatsiyasi */}
      <header className="mb-3 flex items-center justify-between">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em]">Moliya</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            aria-label="Oldingi oy"
            className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[108px] text-center text-[13px] font-medium tabular-nums">
            {formatMonthLabel(month)}
          </span>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            aria-label="Keyingi oy"
            className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 rounded-lg bg-subtle/60 p-0.5 text-[13px]">
        <TabButton active={tab === "umumiy"} onClick={() => setTab("umumiy")}>
          Umumiy
        </TabButton>
        <TabButton active={tab === "tranzaksiyalar"} onClick={() => setTab("tranzaksiyalar")}>
          Yozuvlar
        </TabButton>
        <TabButton active={tab === "byudjet"} onClick={() => setTab("byudjet")}>
          Byudjet
        </TabButton>
      </div>

      {!hydrated ? (
        <ListLoader />
      ) : (
        <div className="min-h-0 flex-1">
          {tab === "umumiy" ? (
            <OverviewTab summary={summary} catMap={catMap} />
          ) : tab === "tranzaksiyalar" ? (
            <TransactionsTab
              txns={monthTxns}
              catMap={catMap}
              onEdit={openEdit}
              onRemove={askRemove}
            />
          ) : (
            <BudgetTab
              categories={categories}
              budgets={budgets}
              spentByCat={spentByCat}
              onSet={setBudget}
              onRemove={removeBudget}
            />
          )}
        </div>
      )}

      {/* Qo'shish tugmasi (floating) */}
      <button
        onClick={() => { setEditing(null); setAddOpen(true); }}
        className="fixed bottom-20 right-5 z-20 flex items-center gap-1.5 rounded-full bg-foreground px-4 py-3 text-[13px] font-medium text-background shadow-lg transition-transform active:scale-95 md:bottom-6"
      >
        <Plus className="size-4" />
        Qo&apos;shish
      </button>

      <TxnDialog
        open={addOpen}
        editing={editing}
        categories={categories}
        onClose={closeDialog}
        onCreate={(input) => { addTransaction(input); closeDialog(); }}
        onUpdate={(id, patch) => { updateTransaction(id, patch); closeDialog(); }}
        onAddCategory={addCategory}
      />
      {confirmEl}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 rounded-[7px] px-3 py-1.5 font-medium transition-colors",
        active ? "bg-surface text-foreground shadow-[0_1px_0_var(--border)]" : "text-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════
   Umumiy
   ════════════════════════════════════════════════════════════ */

function OverviewTab({
  summary,
  catMap,
}: {
  summary: ReturnType<typeof summarize>;
  catMap: Map<string, FinanceCategory>;
}) {
  const expenseSlices = useMemo(
    () => summary.byCategory.filter((b) => b.type === "EXPENSE"),
    [summary]
  );
  const totalExpense = summary.expense;

  return (
    <div className="space-y-4">
      {/* Balans kartasi */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-[12px] text-faint">Oylik balans</p>
        <p
          className="mt-0.5 text-[28px] font-semibold tabular-nums tracking-[-0.02em]"
          style={{ color: summary.balance < 0 ? EXPENSE_COLOR : undefined }}
        >
          {formatSom(summary.balance)} <span className="text-[15px] font-normal text-faint">so&apos;m</span>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Kirim" value={summary.income} color={INCOME_COLOR} icon={ArrowDownLeft} />
          <Stat label="Chiqim" value={summary.expense} color={EXPENSE_COLOR} icon={ArrowUpRight} />
        </div>
      </div>

      {/* Chiqim taqsimoti — donut */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 text-[13px] font-medium">Chiqim taqsimoti</p>
        {totalExpense === 0 ? (
          <p className="py-6 text-center text-[13px] text-faint">Bu oyda chiqim yo&apos;q</p>
        ) : (
          <div className="flex items-center gap-5">
            <Donut
              slices={expenseSlices.map((s) => ({
                value: s.total,
                color: colorWithAlpha(catColor(s.categoryId ? catMap.get(s.categoryId) : undefined), 1),
              }))}
              total={totalExpense}
            />
            <ul className="min-w-0 flex-1 space-y-2">
              {expenseSlices.map((s) => {
                const c = s.categoryId ? catMap.get(s.categoryId) : undefined;
                const pct = Math.round((s.total / totalExpense) * 100);
                return (
                  <li key={`${s.type}:${s.categoryId ?? "none"}`} className="flex items-center gap-2 text-[13px]">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: colorWithAlpha(catColor(c), 1) }}
                    />
                    <span className="min-w-0 flex-1 truncate text-muted">{c?.label ?? "Kategoriyasiz"}</span>
                    <span className="shrink-0 tabular-nums text-faint">{pct}%</span>
                    <span className="shrink-0 tabular-nums font-medium">{formatSom(s.total)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: typeof ArrowUpRight;
}) {
  return (
    <div className="rounded-lg bg-subtle/50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11.5px] text-faint">
        <Icon className="size-3.5" style={{ color }} />
        {label}
      </div>
      <p className="mt-0.5 text-[15px] font-semibold tabular-nums" style={{ color }}>
        {formatSom(value)}
      </p>
    </div>
  );
}

function Donut({
  slices,
  total,
}: {
  slices: Array<{ value: number; color: string }>;
  total: number;
}) {
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="relative grid size-[120px] shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="size-[120px] -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--border)" strokeWidth="12" />
        {slices.map((s, i) => {
          const len = total > 0 ? (s.value / total) * C : 0;
          const el = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="12"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute text-center">
        <p className="text-[15px] font-semibold tabular-nums leading-none">{formatSom(total)}</p>
        <p className="mt-0.5 text-[10px] text-faint">so&apos;m</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Tranzaksiyalar
   ════════════════════════════════════════════════════════════ */

function TransactionsTab({
  txns,
  catMap,
  onEdit,
  onRemove,
}: {
  txns: Transaction[];
  catMap: Map<string, FinanceCategory>;
  onEdit: (t: Transaction) => void;
  onRemove: (id: string) => void;
}) {
  // Sana bo'yicha guruhlash
  const groups = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const t of txns) {
      const arr = m.get(t.date) ?? [];
      arr.push(t);
      m.set(t.date, arr);
    }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [txns]);

  if (txns.length === 0) {
    return <p className="py-10 text-center text-[13px] text-faint">Bu oyda yozuv yo&apos;q</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map(([date, items]) => (
        <div key={date}>
          <p className="mb-1.5 px-1 text-[11.5px] font-medium uppercase tracking-wide text-faint">
            {formatDayLabel(date)}
          </p>
          <ul className="overflow-hidden rounded-xl border border-border bg-surface">
            {items.map((t, i) => (
              <TxnRow
                key={t.id}
                t={t}
                cat={t.categoryId ? catMap.get(t.categoryId) : undefined}
                first={i === 0}
                onEdit={() => onEdit(t)}
                onRemove={() => onRemove(t.id)}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function TxnRow({
  t,
  cat,
  first,
  onEdit,
  onRemove,
}: {
  t: Transaction;
  cat: FinanceCategory | undefined;
  first: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const Icon = financeIcon(cat?.icon);
  const color = colorWithAlpha(catColor(cat), 1);
  const isIncome = t.type === "INCOME";
  return (
    <li className={cn("group flex items-center gap-3 px-3 py-2.5", !first && "border-t border-border")}>
      <button onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg"
          style={{ background: colorWithAlpha(catColor(cat), 0.14), color }}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium">{cat?.label ?? "Kategoriyasiz"}</span>
          {t.note && <span className="block truncate text-[12px] text-faint">{t.note}</span>}
        </span>
      </button>
      <span
        className="shrink-0 text-[14px] font-semibold tabular-nums"
        style={{ color: isIncome ? INCOME_COLOR : undefined }}
      >
        {isIncome ? "+" : "−"}
        {formatSom(t.amount)}
      </span>
      <button
        onClick={onRemove}
        aria-label="O'chirish"
        className="grid size-7 shrink-0 place-items-center rounded-md text-faint opacity-0 transition-opacity hover:bg-hover hover:text-foreground group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}

/* ════════════════════════════════════════════════════════════
   Byudjet
   ════════════════════════════════════════════════════════════ */

const WARN_COLOR = "oklch(0.78 0.15 80)"; // sariq (limitga yaqin)

function budgetColor(pct: number): string {
  if (pct > 1) return EXPENSE_COLOR;
  if (pct >= 0.8) return WARN_COLOR;
  return INCOME_COLOR;
}

function BudgetTab({
  categories,
  budgets,
  spentByCat,
  onSet,
  onRemove,
}: {
  categories: FinanceCategory[];
  budgets: Budget[];
  spentByCat: Map<string, number>;
  onSet: (categoryId: string, amount: number) => void;
  onRemove: (categoryId: string) => void;
}) {
  const expenseCats = useMemo(
    () => categories.filter((c) => c.type === "EXPENSE").sort((a, b) => a.order - b.order),
    [categories]
  );
  const budgetMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of budgets) m.set(b.categoryId, b.amount);
    return m;
  }, [budgets]);

  const totals = useMemo(() => {
    let limit = 0;
    let spent = 0;
    for (const c of expenseCats) {
      const lim = budgetMap.get(c.id);
      if (lim) {
        limit += lim;
        spent += spentByCat.get(c.id) ?? 0;
      }
    }
    return { limit, spent };
  }, [expenseCats, budgetMap, spentByCat]);

  if (expenseCats.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-faint">
        Avval chiqim kategoriyasi qo&apos;shing
      </p>
    );
  }

  const totalPct = totals.limit > 0 ? totals.spent / totals.limit : 0;

  return (
    <div className="space-y-4">
      {totals.limit > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[12px] text-faint">Jami limit</p>
            <p className="text-[12px] tabular-nums text-faint">
              <span className="font-medium text-foreground" style={{ color: budgetColor(totalPct) }}>
                {formatSom(totals.spent)}
              </span>{" "}
              / {formatSom(totals.limit)} so&apos;m
            </p>
          </div>
          <ProgressBar pct={totalPct} className="mt-2" />
        </div>
      )}

      <ul className="space-y-2">
        {expenseCats.map((c) => (
          <BudgetRow
            key={c.id}
            cat={c}
            limit={budgetMap.get(c.id) ?? null}
            spent={spentByCat.get(c.id) ?? 0}
            onSet={(amount) => onSet(c.id, amount)}
            onRemove={() => onRemove(c.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  const w = Math.min(100, Math.max(0, pct * 100));
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-subtle", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${w}%`, background: budgetColor(pct) }}
      />
    </div>
  );
}

function BudgetRow({
  cat,
  limit,
  spent,
  onSet,
  onRemove,
}: {
  cat: FinanceCategory;
  limit: number | null;
  spent: number;
  onSet: (amount: number) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const Icon = financeIcon(cat.icon);
  const color = colorWithAlpha(cat.color, 1);
  const pct = limit && limit > 0 ? spent / limit : 0;

  function startEdit() {
    setAmountStr(limit ? String(limit) : "");
    setEditing(true);
  }
  function save() {
    const amount = Number(amountStr || "0");
    if (amount <= 0) return;
    onSet(amount);
    setEditing(false);
  }

  return (
    <li className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg"
          style={{ background: colorWithAlpha(cat.color, 0.14), color }}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{cat.label}</span>
        {limit != null && !editing && (
          <span className="shrink-0 text-[12.5px] tabular-nums text-faint">
            <span className="font-medium" style={{ color: budgetColor(pct) }}>{formatSom(spent)}</span>
            {" / "}{formatSom(limit)}
          </span>
        )}
      </div>

      {editing ? (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex flex-1 items-baseline gap-1.5 rounded-lg border border-border bg-subtle/30 px-2.5 py-2 focus-within:border-foreground/30">
            <input
              autoFocus
              inputMode="numeric"
              value={amountStr ? formatSom(Number(amountStr)) : ""}
              onChange={(e) => setAmountStr(e.target.value.replace(/\D/g, "").slice(0, 12))}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              placeholder="Oylik limit"
              className="min-w-0 flex-1 bg-transparent text-[14px] font-medium tabular-nums outline-none placeholder:text-faint/50"
            />
            <span className="shrink-0 text-[12px] text-faint">so&apos;m</span>
          </div>
          {limit != null && (
            <button
              onClick={() => { onRemove(); setEditing(false); }}
              aria-label="Limitni o'chirish"
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-faint hover:bg-hover hover:text-foreground"
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <button
            onClick={save}
            disabled={Number(amountStr || "0") <= 0}
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground text-background disabled:opacity-40"
          >
            <Check className="size-4" />
          </button>
        </div>
      ) : limit != null ? (
        <button onClick={startEdit} className="mt-2.5 block w-full">
          <ProgressBar pct={pct} />
          {pct > 1 && (
            <p className="mt-1 text-left text-[11.5px]" style={{ color: EXPENSE_COLOR }}>
              Limitdan {formatSom(spent - limit)} so&apos;m oshib ketdi
            </p>
          )}
        </button>
      ) : (
        <button
          onClick={startEdit}
          className="mt-2 flex items-center gap-1 text-[12.5px] text-faint transition-colors hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Limit qo&apos;shish
        </button>
      )}
    </li>
  );
}

/* ════════════════════════════════════════════════════════════
   Qo'shish / tahrirlash dialogi
   ════════════════════════════════════════════════════════════ */

function TxnDialog({
  open,
  editing,
  categories,
  onClose,
  onCreate,
  onUpdate,
  onAddCategory,
}: {
  open: boolean;
  editing: Transaction | null;
  categories: FinanceCategory[];
  onClose: () => void;
  onCreate: (input: {
    type: TransactionType;
    amount: number;
    categoryId: string | null;
    note?: string;
    date: string;
  }) => void;
  onUpdate: (
    id: string,
    patch: { amount: number; categoryId: string | null; note: string; date: string }
  ) => void;
  onAddCategory: (input: {
    type: TransactionType;
    label: string;
    icon: string;
    color: CategoryColor;
  }) => string;
}) {
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amountStr, setAmountStr] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(() => dateKey());
  const [note, setNote] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  // Dialog ochilganda holatni tiklash (editing'ga qarab)
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setLastOpen(true);
    setCreatingCat(false);
    if (editing) {
      setType(editing.type);
      setAmountStr(String(editing.amount));
      setCategoryId(editing.categoryId);
      setDate(editing.date);
      setNote(editing.note ?? "");
    } else {
      setType("EXPENSE");
      setAmountStr("");
      setCategoryId(null);
      setDate(dateKey());
      setNote("");
    }
  }
  if (!open && lastOpen) setLastOpen(false);

  const amount = Number(amountStr || "0");
  const typeCats = categories.filter((c) => c.type === type);

  function onAmountChange(v: string) {
    setAmountStr(v.replace(/\D/g, "").slice(0, 12));
  }
  function changeType(next: TransactionType) {
    setType(next);
    setCategoryId(null); // kategoriyalar turi bo'yicha farq qiladi
  }
  function save() {
    if (amount <= 0) return;
    if (editing) {
      onUpdate(editing.id, { amount, categoryId, note, date });
    } else {
      onCreate({ type, amount, categoryId, note: note || undefined, date });
    }
  }

  return (
    <Dialog open={open} onClose={onClose} mobilePlacement="bottom" className="w-full max-w-md">
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[15px] font-semibold">{editing ? "Yozuvni tahrirlash" : "Yangi yozuv"}</p>
          <button onClick={onClose} aria-label="Yopish" className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {/* Tur: Chiqim / Kirim (tahrirda o'zgarmaydi) */}
        {!editing && (
          <div className="mb-3 flex gap-1 rounded-lg bg-subtle/60 p-0.5 text-[13px]">
            <button
              onClick={() => changeType("EXPENSE")}
              className={cn("flex-1 rounded-[7px] py-2 font-medium transition-colors", type === "EXPENSE" ? "bg-surface text-foreground shadow-[0_1px_0_var(--border)]" : "text-muted")}
              style={type === "EXPENSE" ? { color: EXPENSE_COLOR } : undefined}
            >
              Chiqim
            </button>
            <button
              onClick={() => changeType("INCOME")}
              className={cn("flex-1 rounded-[7px] py-2 font-medium transition-colors", type === "INCOME" ? "bg-surface text-foreground shadow-[0_1px_0_var(--border)]" : "text-muted")}
              style={type === "INCOME" ? { color: INCOME_COLOR } : undefined}
            >
              Kirim
            </button>
          </div>
        )}

        {/* Summa */}
        <div className="mb-3">
          <div className="flex items-baseline gap-2 rounded-lg border border-border bg-subtle/30 px-3 py-2.5 focus-within:border-foreground/30">
            <input
              autoFocus
              inputMode="numeric"
              value={amountStr ? formatSom(amount) : ""}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent text-[22px] font-semibold tabular-nums outline-none placeholder:text-faint/50"
            />
            <span className="shrink-0 text-[13px] text-faint">so&apos;m</span>
          </div>
        </div>

        {/* Kategoriya chiplari */}
        <div className="mb-3">
          <p className="mb-1.5 text-[12px] text-faint">Kategoriya</p>
          <div className="flex flex-wrap gap-1.5">
            {typeCats.map((c) => {
              const Icon = financeIcon(c.icon);
              const active = categoryId === c.id;
              const color = CATEGORY_PALETTE[c.color].oklch;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(active ? null : c.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12.5px] transition-colors",
                    active ? "border-transparent font-medium" : "border-border text-muted hover:bg-hover"
                  )}
                  style={active ? { background: colorWithAlpha(c.color, 0.16), color } : undefined}
                >
                  <Icon className="size-3.5" style={{ color: active ? color : undefined }} />
                  {c.label}
                </button>
              );
            })}
            <button
              onClick={() => setCreatingCat((v) => !v)}
              className={cn(
                "flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1.5 text-[12.5px] transition-colors",
                creatingCat ? "border-foreground/40 text-foreground" : "border-border text-faint hover:bg-hover hover:text-foreground"
              )}
            >
              <Plus className="size-3.5" />
              Yangi
            </button>
          </div>

          <AnimatePresence initial={false}>
            {creatingCat && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <CategoryCreator
                  type={type}
                  onCancel={() => setCreatingCat(false)}
                  onCreate={(input) => {
                    const id = onAddCategory(input);
                    setCategoryId(id);
                    setCreatingCat(false);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sana + izoh */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1.5 text-[12px] text-faint">Sana</p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-subtle/30 px-2.5 py-2 text-[13px] outline-none focus:border-foreground/30"
            />
          </div>
          <div>
            <p className="mb-1.5 text-[12px] text-faint">Izoh</p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ixtiyoriy"
              className="w-full rounded-lg border border-border bg-subtle/30 px-2.5 py-2 text-[13px] outline-none placeholder:text-faint/50 focus:border-foreground/30"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={amount <= 0}
          className="w-full rounded-lg bg-foreground py-2.5 text-[14px] font-medium text-background transition-opacity disabled:opacity-40"
        >
          {editing ? "Saqlash" : "Qo'shish"}
        </button>
      </div>
    </Dialog>
  );
}

/* ─── Yangi kategoriya yaratuvchi ─── */

function CategoryCreator({
  type,
  onCancel,
  onCreate,
}: {
  type: TransactionType;
  onCancel: () => void;
  onCreate: (input: { type: TransactionType; label: string; icon: string; color: CategoryColor }) => void;
}) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState(FINANCE_ICON_KEYS[0]);
  const [color, setColor] = useState<CategoryColor>("indigo");

  function submit() {
    const l = label.trim();
    if (!l) return;
    onCreate({ type, label: l, icon, color });
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-subtle/40 p-3">
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        placeholder={type === "INCOME" ? "Kirim kategoriyasi" : "Chiqim kategoriyasi"}
        className="mb-2.5 w-full rounded-md border border-border bg-surface px-2.5 py-2 text-[13px] outline-none placeholder:text-faint/60 focus:border-foreground/30"
      />

      {/* Ikona tanlash */}
      <div className="mb-2.5 flex flex-wrap gap-1">
        {FINANCE_ICON_KEYS.map((k) => {
          const Icon = financeIcon(k);
          const active = icon === k;
          return (
            <button
              key={k}
              onClick={() => setIcon(k)}
              className={cn(
                "grid size-8 place-items-center rounded-md border transition-colors",
                active ? "border-transparent text-foreground" : "border-border text-faint hover:bg-hover"
              )}
              style={active ? { background: colorWithAlpha(color, 0.16), color: CATEGORY_PALETTE[color].oklch } : undefined}
            >
              <Icon className="size-4" />
            </button>
          );
        })}
      </div>

      {/* Rang tanlash */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CATEGORY_COLOR_KEYS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={CATEGORY_PALETTE[c].label}
            className={cn(
              "grid size-6 place-items-center rounded-full transition-transform",
              color === c && "scale-110"
            )}
            style={{ background: colorWithAlpha(c, 0.22) }}
          >
            <span className="size-3 rounded-full" style={{ background: CATEGORY_PALETTE[c].oklch }}>
              {color === c && <Check className="size-3 text-background" strokeWidth={3} />}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-md border border-border py-2 text-[13px] text-muted transition-colors hover:bg-hover"
        >
          Bekor
        </button>
        <button
          onClick={submit}
          disabled={!label.trim()}
          className="flex-1 rounded-md bg-foreground py-2 text-[13px] font-medium text-background transition-opacity disabled:opacity-40"
        >
          Qo&apos;shish
        </button>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function txnTitle(t: Transaction, catMap: Map<string, FinanceCategory>): string {
  const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
  const base = t.note || cat?.label || (t.type === "INCOME" ? "Kirim" : "Chiqim");
  return `${base} — ${formatSom(t.amount)} so'm`;
}

const UZ_DAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const UZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];

function formatDayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const today = dateKey();
  const yest = dateKey(new Date(Date.now() - 86400000));
  if (date === today) return "Bugun";
  if (date === yest) return "Kecha";
  return `${d}-${UZ_MONTHS_SHORT[m - 1]}, ${UZ_DAYS[dt.getDay()]}`;
}
