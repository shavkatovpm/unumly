import type { CategoryColor, LoyihaKategoriya } from "@/lib/types";

/** Loyihalar taqsimoti — A/B/C/D kategoriya meta-ma'lumoti (Barchasi/Reja/
 *  Jadval/Analitika bo'limlarining barchasida bir xil ishlatiladi). */
export const KATEGORIYALAR: {
  key: LoyihaKategoriya;
  label: string;
  desc: string;
  color: CategoryColor;
  defaultPct: number;
}[] = [
  { key: "A", label: "A — Muhim",  desc: "Eng ko'p vaqt shu yerga ketadi", color: "red",   defaultPct: 50 },
  { key: "B", label: "B — O'rta",  desc: "Muntazam, lekin kamroq",         color: "amber", defaultPct: 30 },
  { key: "C", label: "C — Past",   desc: "Bo'sh vaqt bo'lganda",           color: "teal",  defaultPct: 15 },
  { key: "D", label: "D — Kutish", desc: "Imkon topilsa",                  color: "slate", defaultPct: 5 },
];

export const DEFAULT_WEEKLY_CAPACITY = [12, 12, 12, 12, 12, 4, 4];
