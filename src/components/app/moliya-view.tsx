"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Budget, CategoryColor, FinanceCategory, FinancialGoal, Transaction, TransactionType } from "@/lib/types";
import {
  summarize,
  useFinance,
  useHydratedFinance,
} from "@/lib/finance-store";
import { CATEGORY_COLOR_KEYS, CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import { FINANCE_ICON_KEYS, financeIcon } from "@/lib/finance-icons";
import { ensureVisibleOnFocus } from "@/lib/ensure-visible";
import {
  dateKey,
  formatMonthLabel,
  formatSom,
  monthKey,
  shiftMonth,
} from "@/lib/money";
import { Dialog } from "./widgets/dialog";
import { DatePickerButton } from "./widgets/date-picker-button";
import { useConfirmRemove } from "./widgets/confirm-dialog";
import { ListLoader } from "./widgets/list-loader";
import { QarzPanel } from "./qarz-view";

const INCOME_COLOR = "oklch(0.62 0.13 158)"; // yashil
const EXPENSE_COLOR = "oklch(0.62 0.17 22)"; // qizil

type Tab = "umumiy" | "tranzaksiyalar" | "kategoriya" | "yigim" | "qarz";

const TAB_ORDER: Tab[] = ["umumiy", "tranzaksiyalar", "kategoriya", "yigim", "qarz"];

// Swipe / gorizontal scroll bilan tab almashtirish animatsiyasi
const SWIPE_VARIANTS = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: "0%", opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};
const SWIPE_THRESHOLD = 56;

function catColor(c: FinanceCategory | undefined): CategoryColor {
  return c?.color ?? "gray";
}

/* ════════════════════════════════════════════════════════════
   Main view
   ════════════════════════════════════════════════════════════ */

export function MoliyaView() {
  const {
    transactions, categories, budgets, goals,
    addTransaction, updateTransaction, removeTransaction,
    addCategory, updateCategory, removeCategory, setBudget, removeBudget,
    addFinancialGoal, updateFinancialGoal, contributeFinancialGoal, removeFinancialGoal,
  } = useFinance();
  const hydrated = useHydratedFinance();

  const [month, setMonth] = useState(() => monthKey());
  const [tab, setTab] = useState<Tab>("umumiy");
  const [dir, setDir] = useState(0); // swipe animatsiya yo'nalishi
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  // "Kirim-chiqim" tabidagi faol tur (Umumiy'dagi taqsimotdan o'tishda boshqariladi)
  const [catType, setCatType] = useState<TransactionType>("EXPENSE");

  // Tab almashtirish — animatsiya yo'nalishi bilan
  function selectTab(t: Tab) {
    const cur = TAB_ORDER.indexOf(tab);
    const next = TAB_ORDER.indexOf(t);
    setDir(next > cur ? 1 : next < cur ? -1 : 0);
    setTab(t);
  }
  // Touch swipe (mobil) — bitta drag tugashida bitta bo'lim.
  function goTab(delta: number) {
    const ni = TAB_ORDER.indexOf(tab) + delta;
    if (ni < 0 || ni >= TAB_ORDER.length) return;
    setDir(delta);
    setTab(TAB_ORDER[ni]);
  }

  // Sensorli qurilmada — drag bilan swipe; desktopda — gorizontal wheel.
  const [touchSwipe, setTouchSwipe] = useState(false);
  useEffect(() => {
    setTouchSwipe(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);
  useEffect(() => {
    const el = scrollWrapRef.current;
    if (!el) return;
    // Bitta gesture = bitta switch, lekin qasddan qilingan ketma-ket swipe'lar
    // darhol ishlashi kerak. Trackpad momentumi FAQAT pasayadi; yangi qasddan
    // swipe esa deltani QAYTA ko'taradi. Shu sabab switch'dan keyin avval
    // momentum "dumi"ni (kichik delta) kutamiz, so'ng delta qayta ko'tarilsa —
    // bu yangi swipe deb darhol ruxsat beramiz.
    let armed = true;
    let accum = 0;
    let sawTail = false;
    let idleTimer: number | null = null;
    function onWheel(e: WheelEvent) {
      // Faqat gorizontal niyat — vertikal scrollga tegmaymiz.
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const abs = Math.abs(e.deltaX);

      if (!armed) {
        if (abs < 10) sawTail = true;          // momentum pasaydi
        else if (sawTail && abs > 16) {        // delta qayta ko'tarildi — yangi swipe
          armed = true;
          accum = 0;
        }
      }

      // Idle (oqim to'xtadi) — qayta arm (fallback).
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => { armed = true; accum = 0; sawTail = false; }, 120);

      if (!armed) return;
      accum += e.deltaX;
      if (Math.abs(accum) < 45) return;
      const delta = accum > 0 ? 1 : -1;
      accum = 0;
      const ni = TAB_ORDER.indexOf(tabRef.current) + delta;
      if (ni < 0 || ni >= TAB_ORDER.length) { armed = false; sawTail = false; return; }
      setDir(delta);
      setTab(TAB_ORDER[ni]);
      armed = false;   // momentum dumi shu bo'limda qoldiradi
      sawTail = false;
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (idleTimer) window.clearTimeout(idleTimer);
    };
  }, [hydrated]);

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

  // Joriy oy bo'yicha kategoriya summalari (kirim/chiqim — har biri uchun)
  const totalByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of summary.byCategory) {
      if (b.categoryId) m.set(b.categoryId, b.total);
    }
    return m;
  }, [summary]);

  // Kategoriyasiz (kategoriya tanlanmagan) yozuvlar jami — tur bo'yicha
  const uncategorizedByType = useMemo(() => {
    const m: Record<TransactionType, number> = { INCOME: 0, EXPENSE: 0 };
    for (const b of summary.byCategory) {
      if (!b.categoryId) m[b.type] += b.total;
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
      <div className="mb-4 flex items-center gap-0.5 overflow-x-auto rounded-lg bg-subtle/60 p-0.5 text-[12px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabButton active={tab === "umumiy"} onClick={() => selectTab("umumiy")}>
          Umumiy
        </TabButton>
        <TabButton active={tab === "tranzaksiyalar"} onClick={() => selectTab("tranzaksiyalar")}>
          Tarix
        </TabButton>
        <TabButton active={tab === "kategoriya"} onClick={() => selectTab("kategoriya")}>
          Kirim-chiqim
        </TabButton>
        <TabButton active={tab === "yigim"} onClick={() => selectTab("yigim")}>
          Yig&apos;im
        </TabButton>
        <TabButton active={tab === "qarz"} onClick={() => selectTab("qarz")}>
          Qarz
        </TabButton>
      </div>

      {!hydrated ? (
        <ListLoader />
      ) : (
        <div ref={scrollWrapRef} className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={tab}
              custom={dir}
              variants={SWIPE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: "spring", stiffness: 460, damping: 42 }, opacity: { duration: 0.18 } }}
              drag={touchSwipe ? "x" : false}
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.16}
              onDragEnd={(_, info) => {
                if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -500) goTab(1);
                else if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 500) goTab(-1);
              }}
              data-scroll-lock-on-focus
              data-allow-focus-scroll
              className="absolute inset-0 overflow-y-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
            >
              {tab === "umumiy" ? (
                <OverviewTab
                  summary={summary}
                  catMap={catMap}
                  onOpenCategory={(t) => { setCatType(t); selectTab("kategoriya"); }}
                />
              ) : tab === "tranzaksiyalar" ? (
                <TransactionsTab
                  txns={monthTxns}
                  catMap={catMap}
                  onEdit={openEdit}
                />
              ) : tab === "kategoriya" ? (
                <CategoriesTab
                  type={catType}
                  onTypeChange={setCatType}
                  categories={categories}
                  budgets={budgets}
                  totalByCat={totalByCat}
                  uncategorized={uncategorizedByType[catType]}
                  onAddCategory={addCategory}
                  onUpdateCategory={updateCategory}
                  onRemoveCategory={removeCategory}
                  onSetBudget={setBudget}
                  onRemoveBudget={removeBudget}
                />
              ) : tab === "yigim" ? (
                <YigimTab
                  goals={goals}
                  onCreate={addFinancialGoal}
                  onUpdate={updateFinancialGoal}
                  onContribute={contributeFinancialGoal}
                  onRemove={removeFinancialGoal}
                />
              ) : (
                <QarzPanel />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Qo'shish — desktopda past qismda kesik chiziqli tugma, mobilda FAB */}
      {(tab === "umumiy" || tab === "tranzaksiyalar") && (
        <>
          <button
            onClick={() => { setEditing(null); setAddOpen(true); }}
            className="mt-3 hidden w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-[13.5px] font-medium text-muted transition-colors hover:border-border-strong hover:bg-hover hover:text-foreground md:flex"
          >
            <Plus className="size-4" />
            Yangi yozuv
          </button>
          <button
            onClick={() => { setEditing(null); setAddOpen(true); }}
            aria-label="Qo'shish"
            className="fixed bottom-20 right-4 z-30 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_10px_30px_-5px_rgba(0,0,0,0.35)] transition-transform hover:scale-105 active:scale-95 md:hidden"
            style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <Plus className="size-6" strokeWidth={2.5} />
          </button>
        </>
      )}

      <TxnDialog
        open={addOpen}
        editing={editing}
        categories={categories}
        onClose={closeDialog}
        onCreate={(input) => { addTransaction(input); closeDialog(); }}
        onUpdate={(id, patch) => { updateTransaction(id, patch); closeDialog(); }}
        onRemove={askRemove}
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
        "min-w-fit flex-1 whitespace-nowrap rounded-[7px] px-2.5 py-1.5 font-medium transition-all duration-150 active:scale-[0.96]",
        active
          ? "bg-accent font-semibold text-accent-ink shadow-sm"
          : "text-muted hover:bg-hover/50 hover:text-foreground"
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
  onOpenCategory,
}: {
  summary: ReturnType<typeof summarize>;
  catMap: Map<string, FinanceCategory>;
  onOpenCategory: (type: TransactionType) => void;
}) {
  const incomeSlices = useMemo(
    () => summary.byCategory.filter((b) => b.type === "INCOME"),
    [summary]
  );
  const expenseSlices = useMemo(
    () => summary.byCategory.filter((b) => b.type === "EXPENSE"),
    [summary]
  );

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

      {/* Kirim taqsimoti */}
      <DistributionCard
        title="Kirim taqsimoti"
        slices={incomeSlices}
        total={summary.income}
        catMap={catMap}
        emptyText="Bu oyda kirim yo'q"
        onClick={() => onOpenCategory("INCOME")}
      />

      {/* Chiqim taqsimoti */}
      <DistributionCard
        title="Chiqim taqsimoti"
        slices={expenseSlices}
        total={summary.expense}
        catMap={catMap}
        emptyText="Bu oyda chiqim yo'q"
        onClick={() => onOpenCategory("EXPENSE")}
      />
    </div>
  );
}

function DistributionCard({
  title,
  slices,
  total,
  catMap,
  emptyText,
  onClick,
}: {
  title: string;
  slices: Array<{ categoryId: string | null; type: TransactionType; total: number }>;
  total: number;
  catMap: Map<string, FinanceCategory>;
  emptyText: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border bg-surface p-4",
        onClick && "cursor-pointer transition-colors hover:border-border-strong"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-medium">{title}</p>
        {onClick && <ChevronRight className="size-4 text-faint" />}
      </div>
      {total === 0 ? (
        <p className="py-6 text-center text-[13px] text-faint">{emptyText}</p>
      ) : (
        <div className="flex items-center gap-5">
          <Donut
            slices={slices.map((s) => ({
              value: s.total,
              color: colorWithAlpha(catColor(s.categoryId ? catMap.get(s.categoryId) : undefined), 1),
            }))}
            total={total}
          />
          <ul className="min-w-0 flex-1 space-y-2">
            {slices.map((s) => {
              const c = s.categoryId ? catMap.get(s.categoryId) : undefined;
              const pct = Math.round((s.total / total) * 100);
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
}: {
  txns: Transaction[];
  catMap: Map<string, FinanceCategory>;
  onEdit: (t: Transaction) => void;
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
}: {
  t: Transaction;
  cat: FinanceCategory | undefined;
  first: boolean;
  onEdit: () => void;
}) {
  const Icon = financeIcon(cat?.icon);
  const color = colorWithAlpha(catColor(cat), 1);
  const isIncome = t.type === "INCOME";
  return (
    <li className={cn("flex items-center gap-3 px-3 py-2.5", !first && "border-t border-border")}>
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
    </li>
  );
}

/* ════════════════════════════════════════════════════════════
   Kategoriya (boshqaruv + chiqim limiti)
   ════════════════════════════════════════════════════════════ */

const WARN_COLOR = "oklch(0.78 0.15 80)"; // sariq (limitga yaqin)

function budgetColor(pct: number): string {
  if (pct > 1) return EXPENSE_COLOR;
  if (pct >= 0.8) return WARN_COLOR;
  return INCOME_COLOR;
}

function CategoriesTab({
  type,
  onTypeChange,
  categories,
  budgets,
  totalByCat,
  uncategorized,
  onAddCategory,
  onUpdateCategory,
  onRemoveCategory,
  onSetBudget,
  onRemoveBudget,
}: {
  type: TransactionType;
  onTypeChange: (type: TransactionType) => void;
  categories: FinanceCategory[];
  budgets: Budget[];
  totalByCat: Map<string, number>;
  uncategorized: number;
  onAddCategory: (input: { type: TransactionType; label: string; icon: string; color: CategoryColor }) => string;
  onUpdateCategory: (id: string, patch: { label?: string; icon?: string; color?: CategoryColor }) => void;
  onRemoveCategory: (id: string) => void;
  onSetBudget: (categoryId: string, amount: number) => void;
  onRemoveBudget: (categoryId: string) => void;
}) {
  const [creating, setCreating] = useState(false);

  const typeCats = useMemo(
    () =>
      categories
        .filter((c) => c.type === type)
        .sort((a, b) => {
          // Shu oy summasi ko'p bo'lgan kategoriya tepada; teng bo'lsa — tartib bo'yicha
          const ta = totalByCat.get(a.id) ?? 0;
          const tb = totalByCat.get(b.id) ?? 0;
          if (tb !== ta) return tb - ta;
          return a.order - b.order;
        }),
    [categories, type, totalByCat]
  );
  const budgetMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of budgets) m.set(b.categoryId, b.amount);
    return m;
  }, [budgets]);

  const grandTotal = useMemo(
    () => typeCats.reduce((s, c) => s + (totalByCat.get(c.id) ?? 0), 0) + uncategorized,
    [typeCats, totalByCat, uncategorized]
  );

  const confirmItems = useMemo(() => categories.map((c) => ({ id: c.id, title: c.label })), [categories]);
  const { askRemove, confirmEl } = useConfirmRemove(confirmItems, onRemoveCategory, {
    itemLabel: "Kategoriyani",
    description: "\"{title}\" kategoriyasi o'chiriladi. Unga bog'langan yozuvlar saqlanadi (kategoriyasiz bo'ladi).",
  });

  function changeType(next: TransactionType) {
    onTypeChange(next);
    setCreating(false);
  }

  return (
    <div className="space-y-3">
      {/* Kirim / Chiqim toggle — faol tugma rang bilan to'ladi */}
      <div className="grid grid-cols-2 gap-2 text-[13.5px]">
        <button
          onClick={() => changeType("EXPENSE")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg border py-2.5 font-semibold transition-all",
            type === "EXPENSE" ? "border-transparent text-white shadow-sm" : "border-border font-medium text-muted hover:bg-hover"
          )}
          style={type === "EXPENSE" ? { background: EXPENSE_COLOR } : undefined}
        >
          <ArrowUpRight className="size-4" />
          Chiqim
        </button>
        <button
          onClick={() => changeType("INCOME")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg border py-2.5 font-semibold transition-all",
            type === "INCOME" ? "border-transparent text-white shadow-sm" : "border-border font-medium text-muted hover:bg-hover"
          )}
          style={type === "INCOME" ? { background: INCOME_COLOR } : undefined}
        >
          <ArrowDownLeft className="size-4" />
          Kirim
        </button>
      </div>

      {/* + Yangi kategoriya */}
      <button
        onClick={() => setCreating((v) => !v)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-[13px] font-medium text-faint transition-colors hover:bg-hover hover:text-foreground"
      >
        <Plus className="size-4" />
        Yangi kategoriya
      </button>
      <AnimatePresence initial={false}>
        {creating && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <CategoryForm
              type={type}
              showLimit={type === "EXPENSE"}
              onCancel={() => setCreating(false)}
              onSubmit={({ limit, ...input }) => {
                const id = onAddCategory({ type, ...input });
                if (limit != null) onSetBudget(id, limit);
                setCreating(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {type === "EXPENSE" && (
        <p className="px-1 text-[11.5px] text-faint">Har chiqim kategoriyasiga oylik limit qo&apos;ysangiz bo&apos;ladi.</p>
      )}

      {/* Bu oy bo'yicha jami */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-2.5">
        <span className="text-[12.5px] text-faint">
          {type === "EXPENSE" ? "Bu oy — jami chiqim" : "Bu oy — jami kirim"}
        </span>
        <span className="text-[15px] font-semibold tabular-nums" style={{ color: type === "EXPENSE" ? EXPENSE_COLOR : INCOME_COLOR }}>
          {formatSom(grandTotal)}
        </span>
      </div>

      {typeCats.length === 0 && uncategorized === 0 ? (
        <p className="py-6 text-center text-[13px] text-faint">Kategoriya yo&apos;q</p>
      ) : (
        <ul className="space-y-2">
          {/* Kategoriyalar + "Kategoriyasiz" — hammasi summa bo'yicha tartiblanadi
              (summasi ko'p bo'lgani tepada; "Kategoriyasiz" ham shu qatorda). */}
          {(
            uncategorized > 0
              ? [
                  ...typeCats.map((c) => ({ kind: "cat" as const, total: totalByCat.get(c.id) ?? 0, cat: c })),
                  { kind: "none" as const, total: uncategorized },
                ].sort((a, b) => b.total - a.total)
              : typeCats.map((c) => ({ kind: "cat" as const, total: totalByCat.get(c.id) ?? 0, cat: c }))
          ).map((r) =>
            r.kind === "cat" ? (
              <CategoryManageRow
                key={r.cat.id}
                cat={r.cat}
                hasLimit={type === "EXPENSE"}
                limit={budgetMap.get(r.cat.id) ?? null}
                total={r.total}
                onUpdate={(patch) => onUpdateCategory(r.cat.id, patch)}
                onRemove={() => askRemove(r.cat.id)}
                onSetBudget={(amount) => onSetBudget(r.cat.id, amount)}
                onRemoveBudget={() => onRemoveBudget(r.cat.id)}
              />
            ) : (
              <li key="__uncategorized" className="rounded-xl border border-dashed border-border bg-surface p-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-subtle text-faint">
                    <Minus className="size-[18px]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-muted">
                    Kategoriyasiz
                  </span>
                  <span
                    className="shrink-0 text-[12.5px] font-semibold tabular-nums"
                    style={{ color: type === "EXPENSE" ? EXPENSE_COLOR : INCOME_COLOR }}
                  >
                    {formatSom(r.total)}
                  </span>
                </div>
              </li>
            )
          )}
        </ul>
      )}
      {confirmEl}
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

function CategoryManageRow({
  cat,
  hasLimit,
  limit,
  total,
  onUpdate,
  onRemove,
  onSetBudget,
  onRemoveBudget,
}: {
  cat: FinanceCategory;
  hasLimit: boolean;
  limit: number | null;
  total: number;
  onUpdate: (patch: { label?: string; icon?: string; color?: CategoryColor }) => void;
  onRemove: () => void;
  onSetBudget: (amount: number) => void;
  onRemoveBudget: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const Icon = financeIcon(cat.icon);
  const color = colorWithAlpha(cat.color, 1);
  const pct = limit && limit > 0 ? total / limit : 0;
  const typeColor = cat.type === "INCOME" ? INCOME_COLOR : EXPENSE_COLOR;

  if (editing) {
    return (
      <li className="rounded-xl border border-border bg-surface p-1">
        <CategoryForm
          type={cat.type}
          initial={{ label: cat.label, icon: cat.icon, color: cat.color }}
          showLimit={hasLimit}
          initialLimit={limit}
          submitLabel="Saqlash"
          onCancel={() => setEditing(false)}
          onSubmit={({ limit: nextLimit, ...patch }) => {
            onUpdate(patch);
            if (hasLimit) {
              if (nextLimit != null) onSetBudget(nextLimit);
              else onRemoveBudget();
            }
            setEditing(false);
          }}
        />
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: colorWithAlpha(cat.color, 0.14), color }}>
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{cat.label}</span>
        <span className="shrink-0 text-[12.5px] tabular-nums">
          <span className="font-semibold" style={{ color: hasLimit && limit != null ? budgetColor(pct) : typeColor }}>
            {formatSom(total)}
          </span>
          {hasLimit && limit != null && <span className="text-faint">{" / "}{formatSom(limit)}</span>}
        </span>
        <button onClick={() => setEditing(true)} aria-label="Tahrirlash" className="grid size-7 shrink-0 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><Pencil className="size-3.5" /></button>
        <button onClick={onRemove} aria-label="O'chirish" className="grid size-7 shrink-0 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><Trash2 className="size-3.5" /></button>
      </div>

      {hasLimit && (
        limit != null ? (
          <button onClick={() => setEditing(true)} className="mt-2.5 block w-full">
            <ProgressBar pct={pct} />
            {pct > 1 && (
              <p className="mt-1 text-left text-[11.5px]" style={{ color: EXPENSE_COLOR }}>
                Limitdan {formatSom(total - limit)} so&apos;m oshib ketdi
              </p>
            )}
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="mt-2 flex items-center gap-1 text-[12.5px] text-faint transition-colors hover:text-foreground">
            <Plus className="size-3.5" />
            Limit qo&apos;shish
          </button>
        )
      )}
    </li>
  );
}

/* ════════════════════════════════════════════════════════════
   Yig'im (moliyaviy maqsadlar)
   ════════════════════════════════════════════════════════════ */

function YigimTab({
  goals,
  onCreate,
  onUpdate,
  onContribute,
  onRemove,
}: {
  goals: FinancialGoal[];
  onCreate: (input: { title: string; targetAmount: number; icon?: string | null; deadline?: string | null }) => string;
  onUpdate: (id: string, patch: { title?: string; targetAmount?: number; icon?: string | null; deadline?: string | null }) => void;
  onContribute: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);

  const confirmItems = useMemo(() => goals.map((g) => ({ id: g.id, title: g.title })), [goals]);
  const { askRemove, confirmEl } = useConfirmRemove(confirmItems, onRemove, { itemLabel: "Maqsadni" });

  const sorted = useMemo(() => [...goals].sort((a, b) => a.order - b.order), [goals]);

  return (
    <div className="space-y-3">
      <button
        onClick={() => { setEditingGoal(null); setDialogOpen(true); }}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-[13px] font-medium text-faint transition-colors hover:bg-hover hover:text-foreground"
      >
        <Plus className="size-4" />
        Yangi maqsad
      </button>

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-faint">Hali yig&apos;im maqsadi yo&apos;q</p>
      ) : (
        sorted.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            onContribute={(delta) => onContribute(g.id, delta)}
            onEdit={() => { setEditingGoal(g); setDialogOpen(true); }}
            onRemove={() => askRemove(g.id)}
          />
        ))
      )}

      <GoalDialog
        open={dialogOpen}
        editing={editingGoal}
        onClose={() => { setDialogOpen(false); setEditingGoal(null); }}
        onCreate={(input) => { onCreate(input); setDialogOpen(false); }}
        onUpdate={(id, patch) => { onUpdate(id, patch); setDialogOpen(false); setEditingGoal(null); }}
      />
      {confirmEl}
    </div>
  );
}

function GoalCard({
  goal,
  onContribute,
  onEdit,
  onRemove,
}: {
  goal: FinancialGoal;
  onContribute: (delta: number) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [contributing, setContributing] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const Icon = goal.icon ? financeIcon(goal.icon) : Target;
  const pct = goal.targetAmount > 0 ? goal.savedAmount / goal.targetAmount : 0;
  const done = goal.savedAmount >= goal.targetAmount && goal.targetAmount > 0;
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);

  function apply(sign: 1 | -1) {
    const amount = Number(amountStr || "0");
    if (amount <= 0) return;
    onContribute(sign * amount);
    setAmountStr("");
    setContributing(false);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-lg"
          style={{ background: done ? colorWithAlpha("emerald", 0.16) : "var(--subtle)", color: done ? INCOME_COLOR : "var(--foreground)" }}
        >
          <Icon className="size-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[14.5px] font-medium">{goal.title}</p>
            {done && (
              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: colorWithAlpha("emerald", 0.16), color: INCOME_COLOR }}>
                Bajarildi
              </span>
            )}
          </div>
          {goal.deadline && (
            <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-faint">
              <CalendarDays className="size-3" />
              {formatDeadline(goal.deadline)}
            </p>
          )}
        </div>
        <button onClick={onEdit} aria-label="Tahrirlash" className="grid size-7 shrink-0 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground">
          <Pencil className="size-3.5" />
        </button>
        <button onClick={onRemove} aria-label="O'chirish" className="grid size-7 shrink-0 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground">
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="mt-3">
        <div className="h-2 overflow-hidden rounded-full bg-subtle">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${Math.min(100, pct * 100)}%`, background: done ? INCOME_COLOR : "var(--foreground)" }}
          />
        </div>
        <div className="mt-1.5 flex items-baseline justify-between text-[12.5px]">
          <span className="font-medium tabular-nums">
            {formatSom(goal.savedAmount)} <span className="text-faint">/ {formatSom(goal.targetAmount)} so&apos;m</span>
          </span>
          <span className="tabular-nums text-faint">{Math.round(pct * 100)}%</span>
        </div>
        {!done && remaining > 0 && (
          <p className="mt-0.5 text-[11.5px] text-faint">Yana {formatSom(remaining)} so&apos;m</p>
        )}
      </div>

      {contributing ? (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex flex-1 items-baseline gap-1.5 rounded-lg border border-border bg-subtle/30 px-2.5 py-2 focus-within:border-foreground/30">
            <input
              autoFocus
              inputMode="numeric"
              value={amountStr ? formatSom(Number(amountStr)) : ""}
              onChange={(e) => setAmountStr(e.target.value.replace(/\D/g, "").slice(0, 12))}
              onFocus={ensureVisibleOnFocus}
              onKeyDown={(e) => { if (e.key === "Enter") apply(1); }}
              placeholder="Summa"
              className="min-w-0 flex-1 bg-transparent text-[14px] font-medium tabular-nums outline-none placeholder:text-faint/50"
            />
            <span className="shrink-0 text-[12px] text-faint">so&apos;m</span>
          </div>
          <button
            onClick={() => apply(-1)}
            disabled={Number(amountStr || "0") <= 0}
            aria-label="Yechish"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-faint hover:bg-hover hover:text-foreground disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <button
            onClick={() => apply(1)}
            disabled={Number(amountStr || "0") <= 0}
            aria-label="Qo'shish"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground text-background disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setContributing(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-subtle/60 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-hover hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Hissa qo&apos;shish
        </button>
      )}
    </div>
  );
}

function GoalDialog({
  open,
  editing,
  onClose,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  editing: FinancialGoal | null;
  onClose: () => void;
  onCreate: (input: { title: string; targetAmount: number; icon?: string | null; deadline?: string | null }) => void;
  onUpdate: (id: string, patch: { title: string; targetAmount: number; icon: string | null; deadline: string | null }) => void;
}) {
  const [title, setTitle] = useState("");
  const [targetStr, setTargetStr] = useState("");
  const [deadline, setDeadline] = useState("");
  const [icon, setIcon] = useState<string | null>(null);

  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setLastOpen(true);
    if (editing) {
      setTitle(editing.title);
      setTargetStr(String(editing.targetAmount));
      setDeadline(editing.deadline ?? "");
      setIcon(editing.icon ?? null);
    } else {
      setTitle("");
      setTargetStr("");
      setDeadline("");
      setIcon(null);
    }
  }
  if (!open && lastOpen) setLastOpen(false);

  const target = Number(targetStr || "0");
  const valid = title.trim().length > 0 && target > 0;

  function save() {
    if (!valid) return;
    const payload = {
      title: title.trim(),
      targetAmount: target,
      icon: icon ?? null,
      deadline: deadline || null,
    };
    if (editing) onUpdate(editing.id, payload);
    else onCreate(payload);
  }

  return (
    <Dialog open={open} onClose={onClose} mobilePlacement="top" className="w-full max-w-md">
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-[15px] font-semibold">{editing ? "Maqsadni tahrirlash" : "Yangi maqsad"}</p>
          <button onClick={onClose} aria-label="Yopish" className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground">
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch]">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Maqsad nomi (masalan: Mashina)"
          className="mb-3 w-full rounded-lg border border-border bg-subtle/30 px-3 py-2.5 text-[14px] outline-none placeholder:text-faint/50 focus:border-foreground/30"
        />

        <div className="mb-3 flex items-baseline gap-2 rounded-lg border border-border bg-subtle/30 px-3 py-2.5 focus-within:border-foreground/30">
          <input
            inputMode="numeric"
            value={targetStr ? formatSom(target) : ""}
            onChange={(e) => setTargetStr(e.target.value.replace(/\D/g, "").slice(0, 12))}
            placeholder="Maqsad summa"
            className="min-w-0 flex-1 bg-transparent text-[18px] font-semibold tabular-nums outline-none placeholder:text-faint/50"
          />
          <span className="shrink-0 text-[13px] text-faint">so&apos;m</span>
        </div>

        <div className="mb-3">
          <p className="mb-1.5 text-[12px] text-faint">Muddat (ixtiyoriy)</p>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-lg border border-border bg-subtle/30 px-2.5 py-2 text-[13px] outline-none focus:border-foreground/30"
          />
        </div>

        <div className="mb-4">
          <p className="mb-1.5 text-[12px] text-faint">Belgi (ixtiyoriy)</p>
          <div className="flex flex-wrap gap-1">
            {FINANCE_ICON_KEYS.map((k) => {
              const Ic = financeIcon(k);
              const active = icon === k;
              return (
                <button
                  key={k}
                  onClick={() => setIcon(active ? null : k)}
                  className={cn(
                    "grid size-8 place-items-center rounded-md border transition-colors",
                    active ? "border-foreground/40 bg-subtle text-foreground" : "border-border text-faint hover:bg-hover"
                  )}
                >
                  <Ic className="size-4" />
                </button>
              );
            })}
          </div>
        </div>
        </div>

        <footer className="shrink-0 border-t border-border px-4 py-3">
        <button
          onClick={save}
          disabled={!valid}
          className="w-full rounded-lg bg-foreground py-2.5 text-[14px] font-medium text-background transition-opacity disabled:opacity-40"
        >
          {editing ? "Saqlash" : "Qo'shish"}
        </button>
        </footer>
      </div>
    </Dialog>
  );
}

/* ════════════════════════════════════════════════════════════
   Qo'shish / tahrirlash dialogi
   ════════════════════════════════════════════════════════════ */

/* ─── Tranzaksiya ko'rish (view) tanasi ─── */
function TxnViewBody({ type, amount, cat, date, note }: {
  type: TransactionType;
  amount: number;
  cat: FinanceCategory | undefined;
  date: string;
  note: string;
}) {
  const color = type === "INCOME" ? INCOME_COLOR : EXPENSE_COLOR;
  const Icon = cat ? financeIcon(cat.icon) : null;
  const catColorVal = cat ? CATEGORY_PALETTE[cat.color].oklch : undefined;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
      <div className="text-center">
        <p className="text-[30px] font-semibold tabular-nums tracking-[-0.02em]" style={{ color }}>
          {type === "INCOME" ? "+" : "−"}{formatSom(amount)}{" "}
          <span className="text-[15px] font-normal text-faint">so&apos;m</span>
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-faint">
          {type === "INCOME" ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
          {type === "INCOME" ? "Kirim" : "Chiqim"}
        </p>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border">
        <ViewRow label="Kategoriya">
          {cat ? (
            <span className="inline-flex items-center gap-1.5">
              {Icon && <Icon className="size-3.5" style={{ color: catColorVal }} />}
              {cat.label}
            </span>
          ) : (
            <span className="text-faint">Kategoriyasiz</span>
          )}
        </ViewRow>
        <ViewRow label="Sana">{formatDeadline(date)}</ViewRow>
        {note.trim() && <ViewRow label="Izoh">{note}</ViewRow>}
      </div>
    </div>
  );
}

function ViewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-surface px-3.5 py-2.5 last:border-b-0">
      <span className="shrink-0 text-[11.5px] font-medium uppercase tracking-wide text-faint">{label}</span>
      <span className="min-w-0 text-right text-[13.5px] text-foreground">{children}</span>
    </div>
  );
}

function TxnDialog({
  open,
  editing,
  categories,
  onClose,
  onCreate,
  onUpdate,
  onRemove,
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
    patch: { type: TransactionType; amount: number; categoryId: string | null; note: string; date: string }
  ) => void;
  onRemove: (id: string) => void;
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
  // Mavjud yozuv avval ko'rish (view) rejimida ochiladi; "Tahrirlash" → forma.
  const [editMode, setEditMode] = useState(false);

  // Dialog ochilganda holatni tiklash (editing'ga qarab)
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setLastOpen(true);
    setCreatingCat(false);
    setEditMode(!editing); // yangi yozuv → darhol forma; mavjud → avval ko'rish
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
  const todayKey = dateKey();
  const yesterdayKey = dateKey(new Date(Date.now() - 86400000));
  const isCustomDate = date !== todayKey && date !== yesterdayKey;
  const isView = !!editing && !editMode;
  const viewCat = categories.find((c) => c.id === categoryId);

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
      onUpdate(editing.id, { type, amount, categoryId, note, date });
    } else {
      onCreate({ type, amount, categoryId, note: note || undefined, date });
    }
  }

  return (
    <Dialog open={open} onClose={onClose} mobilePlacement="top" className="w-full max-w-md">
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-[15px] font-semibold">{isView ? "Yozuv" : editing ? "Yozuvni tahrirlash" : "Yangi yozuv"}</p>
          <div className="flex items-center gap-1">
            {isView && (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-muted transition-colors hover:bg-hover hover:text-foreground"
              >
                <Pencil className="size-3.5" />
                Tahrirlash
              </button>
            )}
            <button onClick={onClose} aria-label="Yopish" className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        </header>

        {isView ? (
          <TxnViewBody type={type} amount={amount} cat={viewCat} date={date} note={note} />
        ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch]">
        {/* Tur: Chiqim / Kirim — tahrirda ham o'zgartirsa bo'ladi */}
        <div className="mb-3 grid grid-cols-2 gap-2 text-[13.5px]">
            <button
              onClick={() => changeType("EXPENSE")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border py-2.5 font-semibold transition-all",
                type === "EXPENSE" ? "border-transparent text-white shadow-sm" : "border-border font-medium text-muted hover:bg-hover"
              )}
              style={type === "EXPENSE" ? { background: EXPENSE_COLOR } : undefined}
            >
              <ArrowUpRight className="size-4" />
              Chiqim
            </button>
            <button
              onClick={() => changeType("INCOME")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border py-2.5 font-semibold transition-all",
                type === "INCOME" ? "border-transparent text-white shadow-sm" : "border-border font-medium text-muted hover:bg-hover"
              )}
              style={type === "INCOME" ? { background: INCOME_COLOR } : undefined}
            >
              <ArrowDownLeft className="size-4" />
              Kirim
            </button>
        </div>

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

        {/* Kategoriya chiplari — mobilda bir qatorda gorizontal scroll */}
        <div className="mb-3">
          <p className="mb-1.5 text-[12px] text-faint">Kategoriya</p>
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
            {typeCats.map((c) => {
              const Icon = financeIcon(c.icon);
              const active = categoryId === c.id;
              const color = CATEGORY_PALETTE[c.color].oklch;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(active ? null : c.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12.5px] transition-colors",
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
                "flex shrink-0 items-center gap-1 rounded-full border border-dashed px-2.5 py-1.5 text-[12.5px] transition-colors",
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
                <CategoryForm
                  type={type}
                  onCancel={() => setCreatingCat(false)}
                  onSubmit={(input) => {
                    const id = onAddCategory({ type, ...input });
                    setCategoryId(id);
                    setCreatingCat(false);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sana — tezkor chiplar + kalendardan tanlash */}
        <div className="mb-3">
          <p className="mb-1.5 text-[12px] text-faint">Sana</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: todayKey, label: "Bugun" },
              { key: yesterdayKey, label: "Kecha" },
            ].map((opt) => {
              const active = date === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDate(opt.key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
                    active
                      ? "border-foreground/30 bg-hover font-medium text-foreground"
                      : "border-border text-muted hover:bg-hover"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
            <DatePickerButton
              value={date}
              onChange={setDate}
              active={isCustomDate}
              format={formatDeadline}
              label={isCustomDate ? formatDeadline(date) : "Boshqa sana"}
              placeholder="Boshqa sana"
            />
          </div>
        </div>

        {/* Izoh */}
        <div className="mb-4">
          <p className="mb-1.5 text-[12px] text-faint">Izoh</p>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ixtiyoriy"
            className="w-full rounded-lg border border-border bg-subtle/30 px-2.5 py-2 text-[13px] outline-none placeholder:text-faint/50 focus:border-foreground/30"
          />
        </div>
        </div>
        )}

        <div className="shrink-0 border-t border-border px-4 py-3">
          {isView ? (
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-foreground py-2.5 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
            >
              Yopish
            </button>
          ) : editing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { onRemove(editing.id); onClose(); }}
                aria-label="O'chirish"
                title="O'chirish"
                className="flex shrink-0 items-center justify-center rounded-lg border border-border px-3 py-2.5 text-faint transition-colors hover:border-danger hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
              <button
                onClick={save}
                disabled={amount <= 0}
                className="flex-1 rounded-lg bg-foreground py-2.5 text-[14px] font-medium text-background transition-opacity disabled:opacity-40"
              >
                Saqlash
              </button>
            </div>
          ) : (
            <button
              onClick={save}
              disabled={amount <= 0}
              className="w-full rounded-lg bg-foreground py-2.5 text-[14px] font-medium text-background transition-opacity disabled:opacity-40"
            >
              Qo&apos;shish
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

/* ─── Yangi kategoriya yaratuvchi ─── */

function CategoryForm({
  type,
  initial,
  showLimit = false,
  initialLimit = null,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  type: TransactionType;
  initial?: { label: string; icon: string; color: CategoryColor };
  showLimit?: boolean;
  initialLimit?: number | null;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (input: { label: string; icon: string; color: CategoryColor; limit: number | null }) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? FINANCE_ICON_KEYS[0]);
  const [color, setColor] = useState<CategoryColor>(initial?.color ?? "indigo");
  const [limitStr, setLimitStr] = useState(initialLimit ? String(initialLimit) : "");

  function submit() {
    const l = label.trim();
    if (!l) return;
    const limitNum = Number(limitStr || "0");
    onSubmit({ label: l, icon, color, limit: showLimit && limitNum > 0 ? limitNum : null });
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-subtle/40 p-3">
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onFocus={ensureVisibleOnFocus}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        placeholder={type === "INCOME" ? "Kirim kategoriyasi" : "Chiqim kategoriyasi"}
        className="mb-2.5 w-full scroll-mt-24 rounded-md border border-border bg-surface px-2.5 py-2 text-[13px] outline-none placeholder:text-faint/60 focus:border-foreground/30"
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

      {/* Oylik limit (faqat chiqim kategoriyalari uchun) */}
      {showLimit && (
        <div className="mb-3">
          <p className="mb-1.5 text-[12px] text-faint">Oylik limit (ixtiyoriy)</p>
          <div className="flex items-baseline gap-1.5 rounded-md border border-border bg-surface px-2.5 py-2 focus-within:border-foreground/30">
            <input
              inputMode="numeric"
              value={limitStr ? formatSom(Number(limitStr)) : ""}
              onChange={(e) => setLimitStr(e.target.value.replace(/\D/g, "").slice(0, 12))}
              onFocus={ensureVisibleOnFocus}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="Limit belgilanmagan"
              className="min-w-0 flex-1 bg-transparent text-[13px] font-medium tabular-nums outline-none placeholder:text-faint/50"
            />
            <span className="shrink-0 text-[12px] text-faint">so&apos;m</span>
          </div>
        </div>
      )}

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
          {submitLabel ?? "Qo'shish"}
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

function formatDeadline(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return `${d}-${UZ_MONTHS_SHORT[m - 1]} ${y}`;
}
