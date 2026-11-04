"use client";

/* Moliya (mobil) — tablar orasida bo'lishiladigan holat: real store'lar,
   tanlangan oy va umumiy oynalarni ochish. */

import { createContext, useContext } from "react";
import type { FinanceCategory, TransactionType } from "@/lib/types";
import type { useFinance } from "@/lib/finance-store";
import type { useDebts } from "@/lib/debts-store";

export type MoliyaTab = "umumiy" | "tarix" | "kategoriya" | "yigim" | "qarz";
export const TABS: { id: MoliyaTab; label: string }[] = [
  { id: "umumiy", label: "Umumiy" },
  { id: "tarix", label: "Tarix" },
  { id: "kategoriya", label: "Kirim-chiqim" },
  { id: "yigim", label: "Yig'im" },
  { id: "qarz", label: "Qarz" },
];

export type MoliyaCtx = {
  fin: ReturnType<typeof useFinance>;
  debtsApi: ReturnType<typeof useDebts>;
  catMap: Map<string, FinanceCategory>;
  month: string;
  /** Kirim-chiqim tabidagi faol tur. */
  catType: TransactionType;
  setCatType: (t: TransactionType) => void;
  selectTab: (t: MoliyaTab) => void;
  openTxn: (id: string) => void;
  /** Kategoriya oynasi: id yoki "none:EXPENSE" / "none:INCOME" (kategoriyasiz). */
  openCat: (key: string) => void;
  openGoal: (id: string) => void;
  openDebt: (id: string) => void;
  newCategory: () => void;
  newGoal: () => void;
  newDebt: () => void;
  editGoal: (id: string) => void;
  editDebt: (id: string) => void;
  openCapsule: () => void;
};

export const MoliyaContext = createContext<MoliyaCtx | null>(null);
export function useMoliya() {
  const ctx = useContext(MoliyaContext);
  if (!ctx) throw new Error("useMoliya: MoliyaContext yo'q");
  return ctx;
}
