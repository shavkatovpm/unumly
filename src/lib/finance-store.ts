"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type {
  Budget,
  CategoryColor,
  FinanceCategory,
  FinancialGoal,
  Transaction,
  TransactionType,
} from "@/lib/types";
import * as txnActions from "@/lib/finance-actions";
import * as catActions from "@/lib/finance-categories-actions";
import * as budgetActions from "@/lib/finance-budgets-actions";
import * as goalActions from "@/lib/finance-goals-actions";

/* Moliya — in-memory cache backed by server actions (goals-store pattern).
   Transaction, FinanceCategory va Budget bir snapshot ostida saqlanadi;
   mutatsiyalar optimistik qo'llanadi, server javobi bilan almashtiriladi,
   xatoda tiklanadi. */

type Snapshot = {
  txns: Transaction[];
  cats: FinanceCategory[];
  budgets: Budget[];
  goals: FinancialGoal[];
};
let snapshot: Snapshot = { txns: [], cats: [], budgets: [], goals: [] };
let hydrated = false;
let hydrating = false;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
function set(next: Partial<Snapshot>) {
  snapshot = {
    txns: next.txns ?? snapshot.txns,
    cats: next.cats ?? snapshot.cats,
    budgets: next.budgets ?? snapshot.budgets,
    goals: next.goals ?? snapshot.goals,
  };
  emit();
}
function nextId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function loadAll(): Promise<Snapshot> {
  const [txns, cats, budgets, goals] = await Promise.all([
    txnActions.listTransactions({ limit: 500 }),
    catActions.listFinanceCategories(),
    budgetActions.listBudgets(),
    goalActions.listFinancialGoals(),
  ]);
  return { txns, cats, budgets, goals };
}

function hydrateOnce() {
  if (hydrated || hydrating || typeof window === "undefined") return;
  hydrating = true;
  void loadAll()
    .then((s) => { snapshot = s; hydrated = true; emit(); })
    .catch(() => { hydrated = true; emit(); })
    .finally(() => { hydrating = false; });
}

export async function refreshFinance(): Promise<void> {
  try { snapshot = await loadAll(); hydrated = true; emit(); } catch { /* */ }
}

/* ─── Poll reconcile (goals-store bilan bir xil) ─── */
const POLL_MS = 30 * 1000;
let pollTimer: number | null = null;
let subs = 0;
let pending = 0;
function withPending<T>(p: Promise<T>): Promise<T> {
  pending++;
  return p.finally(() => { pending = Math.max(0, pending - 1); });
}
function fetchReconcile() {
  if (pending > 0) return;
  void loadAll().then((s) => {
    if (pending > 0) return;
    if (JSON.stringify(s) !== JSON.stringify(snapshot)) { snapshot = s; emit(); }
  }).catch(() => {});
}
function startPoll() {
  if (pollTimer !== null || typeof window === "undefined") return;
  pollTimer = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    fetchReconcile();
  }, POLL_MS);
}
function stopPoll() { if (pollTimer !== null) { window.clearInterval(pollTimer); pollTimer = null; } }
function onVisible() { if (document.visibilityState === "visible") fetchReconcile(); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return snapshot; }
const EMPTY: Snapshot = { txns: [], cats: [], budgets: [], goals: [] };
function getServerSnapshot() { return EMPTY; }
function recover() { void refreshFinance(); }

/* ─── Transaction mutatsiyalari ─── */
export type NewTransaction = {
  type: TransactionType;
  amount: number;
  categoryId?: string | null;
  note?: string;
  date: string;
};

export function addTransaction(input: NewTransaction): string {
  const id = nextId();
  const optimistic: Transaction = {
    id,
    type: input.type,
    amount: Math.round(input.amount),
    categoryId: input.categoryId ?? null,
    note: input.note?.trim() || undefined,
    date: input.date,
    createdAt: new Date().toISOString(),
  };
  set({ txns: [optimistic, ...snapshot.txns] });
  void withPending(
    txnActions.createTransaction({
      type: input.type,
      amount: input.amount,
      categoryId: input.categoryId ?? null,
      note: input.note,
      date: input.date,
    })
      .then((row) => set({ txns: snapshot.txns.map((t) => (t.id === id ? row : t)) }))
      .catch(() => set({ txns: snapshot.txns.filter((t) => t.id !== id) }))
  );
  return id;
}

export function updateTransaction(
  id: string,
  patch: { amount?: number; categoryId?: string | null; note?: string; date?: string }
): void {
  const prev = snapshot.txns.find((t) => t.id === id);
  if (!prev) return;
  set({
    txns: snapshot.txns.map((t) =>
      t.id === id
        ? {
            ...t,
            ...(patch.amount !== undefined && { amount: Math.round(patch.amount) }),
            ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
            ...(patch.note !== undefined && { note: patch.note.trim() || undefined }),
            ...(patch.date !== undefined && { date: patch.date }),
          }
        : t
    ),
  });
  void withPending(
    txnActions.updateTransaction(id, patch)
      .then((row) => set({ txns: snapshot.txns.map((t) => (t.id === id ? row : t)) }))
      .catch(() => set({ txns: snapshot.txns.map((t) => (t.id === id ? prev : t)) }))
  );
}

export function removeTransaction(id: string): void {
  const prev = snapshot.txns;
  set({ txns: snapshot.txns.filter((t) => t.id !== id) });
  void withPending(
    txnActions.removeTransaction(id).catch(() => { set({ txns: prev }); })
  );
}

/* ─── Kategoriya mutatsiyalari ─── */
export function addCategory(input: {
  type: TransactionType;
  label: string;
  icon: string;
  color: CategoryColor;
}): string {
  const id = nextId();
  const optimistic: FinanceCategory = {
    id,
    type: input.type,
    label: input.label.trim(),
    icon: input.icon,
    color: input.color,
    order: snapshot.cats.filter((c) => c.type === input.type).length,
  };
  set({ cats: [...snapshot.cats, optimistic] });
  void withPending(
    catActions.createFinanceCategory(input)
      .then((row) => set({ cats: snapshot.cats.map((c) => (c.id === id ? row : c)) }))
      .catch(() => set({ cats: snapshot.cats.filter((c) => c.id !== id) }))
  );
  return id;
}

export function updateCategory(
  id: string,
  patch: { label?: string; icon?: string; color?: CategoryColor }
): void {
  const prev = snapshot.cats.find((c) => c.id === id);
  if (!prev) return;
  set({ cats: snapshot.cats.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  void withPending(
    catActions.updateFinanceCategory(id, patch)
      .then((row) => set({ cats: snapshot.cats.map((c) => (c.id === id ? row : c)) }))
      .catch(() => set({ cats: snapshot.cats.map((c) => (c.id === id ? prev : c)) }))
  );
}

export function removeCategory(id: string): void {
  const prevCats = snapshot.cats;
  // Kategoriya o'chsa, undagi tranzaksiyalar kategoriyasiz bo'ladi (server
  // onDelete: SetNull) — optimistik ravishda mahalliy holatda ham shunday.
  // Byudjet ham kategoriya bilan o'chadi (cascade).
  set({
    cats: snapshot.cats.filter((c) => c.id !== id),
    txns: snapshot.txns.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)),
    budgets: snapshot.budgets.filter((b) => b.categoryId !== id),
  });
  void withPending(catActions.removeFinanceCategory(id).catch(() => { set({ cats: prevCats }); recover(); }));
}

/* ─── Byudjet mutatsiyalari ─── */
export function setBudget(categoryId: string, amount: number): void {
  const prev = snapshot.budgets;
  const existing = prev.find((b) => b.categoryId === categoryId);
  const optimistic: Budget = existing
    ? { ...existing, amount: Math.round(amount) }
    : { id: nextId(), categoryId, amount: Math.round(amount) };
  set({
    budgets: existing
      ? prev.map((b) => (b.categoryId === categoryId ? optimistic : b))
      : [...prev, optimistic],
  });
  void withPending(
    budgetActions.setBudget(categoryId, amount)
      .then((row) => set({ budgets: snapshot.budgets.map((b) => (b.categoryId === categoryId ? row : b)) }))
      .catch(() => { set({ budgets: prev }); })
  );
}

export function removeBudget(categoryId: string): void {
  const prev = snapshot.budgets;
  set({ budgets: prev.filter((b) => b.categoryId !== categoryId) });
  void withPending(budgetActions.removeBudget(categoryId).catch(() => { set({ budgets: prev }); }));
}

/* ─── Moliyaviy maqsad mutatsiyalari ─── */
export function addFinancialGoal(input: {
  title: string;
  targetAmount: number;
  icon?: string | null;
  deadline?: string | null;
}): string {
  const id = nextId();
  const optimistic: FinancialGoal = {
    id,
    title: input.title.trim(),
    icon: input.icon ?? undefined,
    targetAmount: Math.round(input.targetAmount),
    savedAmount: 0,
    deadline: input.deadline ?? undefined,
    order: snapshot.goals.length,
  };
  set({ goals: [...snapshot.goals, optimistic] });
  void withPending(
    goalActions.createFinancialGoal({
      id, title: optimistic.title, targetAmount: input.targetAmount,
      icon: input.icon ?? null, deadline: input.deadline ?? null,
    })
      .then((row) => set({ goals: snapshot.goals.map((g) => (g.id === id ? row : g)) }))
      .catch(() => set({ goals: snapshot.goals.filter((g) => g.id !== id) }))
  );
  return id;
}

export function updateFinancialGoal(
  id: string,
  patch: { title?: string; targetAmount?: number; icon?: string | null; deadline?: string | null }
): void {
  const prev = snapshot.goals.find((g) => g.id === id);
  if (!prev) return;
  set({
    goals: snapshot.goals.map((g) =>
      g.id === id
        ? {
            ...g,
            ...(patch.title !== undefined && { title: patch.title }),
            ...(patch.targetAmount !== undefined && { targetAmount: Math.round(patch.targetAmount) }),
            ...(patch.icon !== undefined && { icon: patch.icon ?? undefined }),
            ...(patch.deadline !== undefined && { deadline: patch.deadline ?? undefined }),
          }
        : g
    ),
  });
  void withPending(
    goalActions.updateFinancialGoal(id, patch)
      .then((row) => set({ goals: snapshot.goals.map((g) => (g.id === id ? row : g)) }))
      .catch(() => set({ goals: snapshot.goals.map((g) => (g.id === id ? prev : g)) }))
  );
}

export function contributeFinancialGoal(id: string, delta: number): void {
  const prev = snapshot.goals.find((g) => g.id === id);
  if (!prev || delta === 0) return;
  const nextSaved = Math.max(0, prev.savedAmount + Math.round(delta));
  set({ goals: snapshot.goals.map((g) => (g.id === id ? { ...g, savedAmount: nextSaved } : g)) });
  void withPending(
    goalActions.contributeFinancialGoal(id, delta)
      .then((row) => set({ goals: snapshot.goals.map((g) => (g.id === id ? row : g)) }))
      .catch(() => set({ goals: snapshot.goals.map((g) => (g.id === id ? prev : g)) }))
  );
}

export function removeFinancialGoal(id: string): void {
  const prev = snapshot.goals;
  set({ goals: snapshot.goals.filter((g) => g.id !== id) });
  void withPending(goalActions.removeFinancialGoal(id).catch(() => { set({ goals: prev }); }));
}

/* ─── Derived (oylik xulosa) ─── */
export type MonthSummary = {
  income: number;
  expense: number;
  balance: number;
  byCategory: Array<{ categoryId: string | null; type: TransactionType; total: number }>;
};

export function summarize(txns: Transaction[], month: string): MonthSummary {
  let income = 0;
  let expense = 0;
  const map = new Map<string, { categoryId: string | null; type: TransactionType; total: number }>();
  for (const t of txns) {
    if (!t.date.startsWith(month)) continue;
    if (t.type === "INCOME") income += t.amount; else expense += t.amount;
    const key = `${t.type}:${t.categoryId ?? "none"}`;
    const cur = map.get(key) ?? { categoryId: t.categoryId, type: t.type, total: 0 };
    cur.total += t.amount;
    map.set(key, cur);
  }
  return {
    income,
    expense,
    balance: income - expense,
    byCategory: [...map.values()].sort((a, b) => b.total - a.total),
  };
}

/* ─── Hooklar ─── */
export function useFinance() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    hydrateOnce(); subs++; startPoll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      subs--;
      document.removeEventListener("visibilitychange", onVisible);
      if (subs <= 0) { subs = 0; stopPoll(); }
    };
  }, []);
  return {
    transactions: snap.txns,
    categories: snap.cats,
    budgets: snap.budgets,
    goals: snap.goals,
    addTransaction, updateTransaction, removeTransaction,
    addCategory, updateCategory, removeCategory,
    setBudget, removeBudget,
    addFinancialGoal, updateFinancialGoal, contributeFinancialGoal, removeFinancialGoal,
  };
}

export function useHydratedFinance(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => false);
}
