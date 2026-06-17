"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Debt, DebtType } from "@/lib/types";
import * as actions from "@/lib/finance-debts-actions";

/* Qarzdorlik — in-memory cache backed by server actions (goals-store pattern).
   Optimistik mutatsiyalar, server javobi bilan almashtirish, xatoda tiklash. */

type State = Debt[];
let memoryState: State = [];
let hydrated = false;
let hydrating = false;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
function nextId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function hydrateOnce() {
  if (hydrated || hydrating || typeof window === "undefined") return;
  hydrating = true;
  void actions.listDebts()
    .then((rows) => { memoryState = rows; hydrated = true; emit(); })
    .catch(() => { hydrated = true; emit(); })
    .finally(() => { hydrating = false; });
}

export async function refreshDebts(): Promise<void> {
  try { memoryState = await actions.listDebts(); hydrated = true; emit(); } catch { /* */ }
}

const POLL_MS = 30 * 1000;
let pollTimer: number | null = null;
let subs = 0;
let pending = 0;
function withPending<T>(p: Promise<T>): Promise<T> { pending++; return p.finally(() => { pending = Math.max(0, pending - 1); }); }
function fetchReconcile() {
  if (pending > 0) return;
  void actions.listDebts().then((rows) => {
    if (pending > 0) return;
    if (JSON.stringify(rows) !== JSON.stringify(memoryState)) { memoryState = rows; emit(); }
  }).catch(() => {});
}
function startPoll() { if (pollTimer !== null || typeof window === "undefined") return; pollTimer = window.setInterval(() => { if (document.visibilityState !== "visible") return; fetchReconcile(); }, POLL_MS); }
function stopPoll() { if (pollTimer !== null) { window.clearInterval(pollTimer); pollTimer = null; } }
function onVisible() { if (document.visibilityState === "visible") fetchReconcile(); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return memoryState; }
const EMPTY: State = [];
function getServerSnapshot() { return EMPTY; }
function replace(d: Debt) { memoryState = memoryState.map((x) => (x.id === d.id ? d : x)); emit(); }

/* ─── Mutatsiyalar ─── */
export function addDebt(input: {
  type: DebtType;
  counterparty: string;
  amount: number;
  dueDate?: string | null;
  note?: string;
}): string {
  const id = nextId();
  const optimistic: Debt = {
    id,
    type: input.type,
    counterparty: input.counterparty.trim(),
    amount: Math.round(input.amount),
    paidAmount: 0,
    dueDate: input.dueDate ?? undefined,
    note: input.note?.trim() || undefined,
    order: memoryState.length,
  };
  memoryState = [optimistic, ...memoryState];
  emit();
  void withPending(
    actions.createDebt({ ...input, id })
      .then(replace)
      .catch(() => { memoryState = memoryState.filter((d) => d.id !== id); emit(); })
  );
  return id;
}

export function updateDebt(
  id: string,
  patch: { counterparty?: string; amount?: number; dueDate?: string | null; note?: string }
): void {
  const prev = memoryState.find((d) => d.id === id);
  if (!prev) return;
  memoryState = memoryState.map((d) =>
    d.id === id
      ? {
          ...d,
          ...(patch.counterparty !== undefined && { counterparty: patch.counterparty }),
          ...(patch.amount !== undefined && { amount: Math.round(patch.amount) }),
          ...(patch.dueDate !== undefined && { dueDate: patch.dueDate ?? undefined }),
          ...(patch.note !== undefined && { note: patch.note.trim() || undefined }),
        }
      : d
  );
  emit();
  void withPending(actions.updateDebt(id, patch).then(replace).catch(() => { replace(prev); }));
}

export function recordPayment(id: string, delta: number): void {
  const prev = memoryState.find((d) => d.id === id);
  if (!prev || delta === 0) return;
  const nextPaid = Math.max(0, Math.min(prev.amount, prev.paidAmount + Math.round(delta)));
  memoryState = memoryState.map((d) =>
    d.id === id
      ? { ...d, paidAmount: nextPaid, settledAt: nextPaid >= prev.amount ? (d.settledAt ?? new Date().toISOString()) : undefined }
      : d
  );
  emit();
  void withPending(actions.recordPayment(id, delta).then(replace).catch(() => { replace(prev); }));
}

export function setSettled(id: string, settled: boolean): void {
  const prev = memoryState.find((d) => d.id === id);
  if (!prev) return;
  memoryState = memoryState.map((d) =>
    d.id === id
      ? { ...d, settledAt: settled ? new Date().toISOString() : undefined, paidAmount: settled ? d.amount : d.paidAmount }
      : d
  );
  emit();
  void withPending(actions.setDebtSettled(id, settled).then(replace).catch(() => { replace(prev); }));
}

export function removeDebt(id: string): void {
  const prev = memoryState;
  memoryState = memoryState.filter((d) => d.id !== id);
  emit();
  void withPending(actions.removeDebt(id).catch(() => { memoryState = prev; emit(); }));
}

/* ─── Hook ─── */
export function useDebts() {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    hydrateOnce(); subs++; startPoll();
    document.addEventListener("visibilitychange", onVisible);
    return () => { subs--; document.removeEventListener("visibilitychange", onVisible); if (subs <= 0) { subs = 0; stopPoll(); } };
  }, []);
  return { debts: all, addDebt, updateDebt, recordPayment, setSettled, removeDebt };
}

export function useHydratedDebts(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => false);
}
