"use client";

/* Moliya — mobil ko'rinish (md:hidden). Tepada: sarlavha + oy, joriy balans,
   tablar; pastda tab mazmuni (chap/o'ngga surib almashtiriladi). Nav "+":
   Umumiy/Tarix'da Kirim|Chiqim kapsulasi → tez qo'shish, boshqa tablarda —
   o'sha tabning yangi yozuvi. Ma'lumot va amallar — real store'lar. */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DebtType, TransactionType } from "@/lib/types";
import { useFinance, useHydratedFinance } from "@/lib/finance-store";
import { useDebts, useHydratedDebts } from "@/lib/debts-store";
import { useMobileAdd } from "@/lib/mobile-add";
import { formatSom, monthKey, shiftMonth } from "@/lib/money";
import { useIsMobile } from "../widgets/mono-sheet";
import { ListLoader } from "../widgets/list-loader";
import { MoliyaQuickAdd, MoliyaTypeCapsule } from "../moliya-quick-add";
import { CategoryForm } from "./category-form";
import { MoliyaContext, TABS, type MoliyaCtx, type MoliyaTab } from "./context";
import { MONTHS, short, useSheet } from "./shared";
import { TxnSheet } from "./txn-sheet";
import { OverviewTab } from "./tabs/overview";
import { HistoryTab } from "./tabs/history";
import { CategoriesTab, CategoryCreateSheet, CategorySheet } from "./tabs/categories";
import { GoalFormSheet, GoalSheet, SavingsTab } from "./tabs/savings";
import { DebtFormSheet, DebtSheet, DebtsTab } from "./tabs/debts";

const SWIPE = {
  enter: (d: number) => ({ x: d > 0 ? "100%" : d < 0 ? "-100%" : 0, opacity: 0 }),
  center: { x: "0%", opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? "-100%" : d < 0 ? "100%" : 0, opacity: 0 }),
};
const SWIPE_THRESHOLD = 56;

export function MoliyaMobile() {
  const fin = useFinance();
  const debtsApi = useDebts();
  const financeHydrated = useHydratedFinance();
  const debtsHydrated = useHydratedDebts();
  const hydrated = financeHydrated && debtsHydrated;
  const mobile = useIsMobile();

  const [month, setMonth] = useState(() => monthKey());
  const [tab, setTab] = useState<MoliyaTab>("umumiy");
  const [dir, setDir] = useState(0);
  const [catType, setCatType] = useState<TransactionType>("EXPENSE");
  const [debtFilter, setDebtFilter] = useState<DebtType>("LENT");
  const [capsule, setCapsule] = useState(false);
  const [quickType, setQuickType] = useState<TransactionType>("EXPENSE");
  const [quickOpen, setQuickOpen] = useState(false);
  const [catCreate, setCatCreate] = useState(false);
  const [goalForm, setGoalForm] = useState<{ id?: string } | null>(null);
  const [debtForm, setDebtForm] = useState<{ id?: string } | null>(null);
  const txnSheet = useSheet();
  const catSheet = useSheet();
  const goalSheet = useSheet();
  const debtSheet = useSheet();

  function selectTab(t: MoliyaTab) {
    const a = TABS.findIndex((x) => x.id === tab);
    const b = TABS.findIndex((x) => x.id === t);
    setDir(b > a ? 1 : b < a ? -1 : 0);
    setTab(t);
  }
  function goTab(delta: number) {
    const ni = TABS.findIndex((x) => x.id === tab) + delta;
    if (ni < 0 || ni >= TABS.length) return;
    setDir(delta);
    setTab(TABS[ni].id);
  }

  // Nav "+" — faqat mobilda (desktop nusxasi o'zini ushlamaydi).
  useMobileAdd(() => {
    if (tab === "kategoriya") setCatCreate(true);
    else if (tab === "yigim") setGoalForm({});
    else if (tab === "qarz") setDebtForm({});
    else setCapsule(true);
  }, mobile);

  const catMap = useMemo(() => new Map(fin.categories.map((c) => [c.id, c])), [fin.categories]);

  // Joriy balans — desktop bilan aynan bir xil hisob: barcha vaqtdagi kirim-chiqim,
  // qaytmagan so'mdagi qarzlar (berilgan −, olingan +) va yig'imga ajratilgan summa (−).
  const { balance, debtNet, savings } = useMemo(() => {
    let net = 0;
    for (const d of debtsApi.debts) {
      if (d.settledAt) continue;
      if ((d.currency ?? "UZS") !== "UZS") continue;
      const left = Math.max(0, d.amount - d.paidAmount);
      net += d.type === "LENT" ? -left : left;
    }
    const overall = fin.transactions.reduce((acc, t) => acc + (t.type === "INCOME" ? t.amount : -t.amount), 0);
    const saved = fin.goals.reduce((acc, g) => acc + g.savedAmount, 0);
    return { balance: overall + net - saved, debtNet: net, savings: saved };
  }, [debtsApi.debts, fin.transactions, fin.goals]);

  const ctx: MoliyaCtx = {
    fin,
    debtsApi,
    catMap,
    month,
    catType,
    setCatType,
    selectTab,
    openTxn: txnSheet.show,
    openCat: catSheet.show,
    openGoal: goalSheet.show,
    openDebt: debtSheet.show,
    newCategory: () => setCatCreate(true),
    newGoal: () => setGoalForm({}),
    newDebt: () => setDebtForm({}),
    editGoal: (id) => setGoalForm({ id }),
    editDebt: (id) => setDebtForm({ id }),
    openCapsule: () => setCapsule(true),
  };

  return (
    <MoliyaContext.Provider value={ctx}>
      <div className="flex flex-col overflow-hidden md:hidden" style={{ height: "calc(var(--tg-vh, 100vh) - var(--tg-safe-top, 0px))" }}>
        <header className="shrink-0 px-4 pt-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[22px] font-bold tracking-[-0.025em]">Moliya</h1>
            <MonthSwitch month={month} onChange={setMonth} />
          </div>
          <div className="mt-2.5 rounded-[20px] bg-accent px-4 py-3 text-accent-ink">
            <div className="flex items-baseline justify-between gap-2">
              <span className="shrink-0 text-[13px] font-medium opacity-70">Joriy balans</span>
              <span className="truncate text-[22px] font-bold tabular-nums tracking-[-0.02em]">
                {formatSom(balance)}<span className="ml-1 text-[13px] font-medium opacity-60">so&apos;m</span>
              </span>
            </div>
            {(debtNet !== 0 || savings !== 0) && (
              <p className="mt-0.5 truncate text-right text-[12px] opacity-60">
                {[
                  debtNet < 0 ? `${short(-debtNet)} qarzga berilgan` : debtNet > 0 ? `${short(debtNet)} qarz olingan` : null,
                  savings !== 0 ? `${short(savings)} yig'imda` : null,
                ].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <TabsPill tab={tab} onChange={selectTab} />
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {!hydrated ? (
            <div className="px-4 pt-3"><ListLoader /></div>
          ) : (
            <AnimatePresence initial={false} custom={dir}>
              <motion.div
                key={tab}
                custom={dir}
                variants={SWIPE}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ x: { type: "spring", stiffness: 460, damping: 42 }, opacity: { duration: 0.18 } }}
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.16}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -500) goTab(1);
                  else if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 500) goTab(-1);
                }}
                data-scroll-lock-on-focus
                className="absolute inset-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
              >
                <div className="px-4 pb-32 pt-3">
                  {tab === "umumiy" ? <OverviewTab />
                    : tab === "tarix" ? <HistoryTab />
                    : tab === "kategoriya" ? <CategoriesTab />
                    : tab === "yigim" ? <SavingsTab />
                    : <DebtsTab filter={debtFilter} onFilter={setDebtFilter} />}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <TxnSheet state={txnSheet} />
      <CategorySheet state={catSheet} />
      <GoalSheet state={goalSheet} />
      <DebtSheet state={debtSheet} />
      <CategoryCreateSheet open={catCreate} type={catType} onClose={() => setCatCreate(false)} />
      <GoalFormSheet state={goalForm} onClose={() => setGoalForm(null)} />
      <DebtFormSheet state={debtForm} defaultType={debtFilter} onClose={() => setDebtForm(null)} />

      {mobile && (
        <>
          <MoliyaTypeCapsule
            open={capsule}
            onClose={() => setCapsule(false)}
            onPick={(type) => { setCapsule(false); setQuickType(type); setQuickOpen(true); }}
          />
          <MoliyaQuickAdd
            open={quickOpen}
            initialType={quickType}
            categories={fin.categories}
            transactions={fin.transactions}
            onClose={() => setQuickOpen(false)}
            onCreate={(input) => {
              fin.addTransaction(input);
              setQuickOpen(false);
              // Boshqa oyga yozilgan bo'lsa — o'sha oyni ko'rsatamiz.
              if (!input.date.startsWith(month)) setMonth(input.date.slice(0, 7));
            }}
            renderCategoryForm={(type, onCreated, onCancel) => (
              <CategoryForm
                type={type}
                inline
                onCancel={onCancel}
                onSubmit={(c) => onCreated(fin.addCategory({ type, label: c.label, icon: c.icon, color: c.color }))}
              />
            )}
          />
        </>
      )}
    </MoliyaContext.Provider>
  );
}

/** Oy almashtirgich: ‹ Noyabr ›; o'rtasi bosilsa — joriy oyga qaytadi. */
function MonthSwitch({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const current = monthKey();
  const [y, m] = month.split("-").map(Number);
  const sameYear = y === new Date().getFullYear();
  return (
    <span className="flex h-10 items-center rounded-full bg-subtle">
      <button type="button" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Oldingi oy" className="grid h-full w-10 place-items-center text-muted"><ChevronLeft className="size-4" /></button>
      <button type="button" onClick={() => onChange(current)} aria-label="Joriy oyga qaytish" className="flex min-w-[72px] flex-col items-center justify-center leading-none">
        <span className="text-[13.5px] font-semibold tabular-nums">{MONTHS[m - 1]}{sameYear ? "" : ` ${y}`}</span>
        {month !== current && <span className="mt-0.5 text-[10px] text-faint">joriy oyga</span>}
      </button>
      <button type="button" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Keyingi oy" className="grid h-full w-10 place-items-center text-muted"><ChevronRight className="size-4" /></button>
    </span>
  );
}

function TabsPill({ tab, onChange }: { tab: MoliyaTab; onChange: (t: MoliyaTab) => void }) {
  const refs = useRef(new Map<MoliyaTab, HTMLButtonElement>());
  // Faol tab har doim ko'rinib tursin (surib almashtirilganda ham).
  useEffect(() => {
    refs.current.get(tab)?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [tab]);
  return (
    <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
      {TABS.map((t) => (
        <button
          key={t.id}
          ref={(el) => { if (el) refs.current.set(t.id, el); else refs.current.delete(t.id); }}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn("h-9 shrink-0 rounded-full px-3.5 text-[13.5px] font-semibold transition-colors", tab === t.id ? "bg-accent text-accent-ink" : "bg-subtle text-muted")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
