"use client";

/* Moliya (mobil) — umumiy bo'laklar: ranglar, sana yorliqlari, ro'yxat
   qatorlari, maydonlar va sana tanlash oynasi. */

import { createElement, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Plus, Tag, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryColor, FinanceCategory, TransactionType } from "@/lib/types";
import { CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import { financeIcon } from "@/lib/finance-icons";
import { dateKey, formatSom } from "@/lib/money";
import { fromDateInputValue, toDateInputValue } from "@/lib/dates";
import { PickerModal } from "../widgets/picker-modal";
import { BigMonth } from "../widgets/big-month";

export const INCOME_COLOR = "oklch(0.62 0.13 158)";
export const EXPENSE_COLOR = "oklch(0.62 0.17 22)";
export const WARN_COLOR = "oklch(0.78 0.15 80)";

export const TYPE_META: Record<TransactionType, { label: string; icon: LucideIcon; color: string }> = {
  EXPENSE: { label: "Chiqim", icon: ArrowUpRight, color: EXPENSE_COLOR },
  INCOME: { label: "Kirim", icon: ArrowDownLeft, color: INCOME_COLOR },
};

export function budgetColor(pct: number) {
  if (pct > 1) return EXPENSE_COLOR;
  if (pct >= 0.8) return WARN_COLOR;
  return INCOME_COLOR;
}

/** Kategoriya rangi shaffofligi bilan ("Asosiy" — foreground uchun alohida). */
export function catSoft(c: CategoryColor, a: number) {
  if (c === "white") return `color-mix(in oklch, var(--foreground) ${Math.round(a * 100)}%, transparent)`;
  return colorWithAlpha(c, a);
}
export const catSolid = (c: CategoryColor) => CATEGORY_PALETTE[c].oklch;

/** Qisqa summa: 1 250 000 → "1,3 mln", 540 000 → "540 ming". */
export function short(n: number) {
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toFixed(a % 1_000_000 && a < 100_000_000 ? 1 : 0).replace(".", ",").replace(",0", "")} mln`;
  if (a >= 1_000) return `${sign}${Math.round(a / 1000)} ming`;
  return `${sign}${formatSom(a)}`;
}

/* ─── Sanalar ─── */

const MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];
const DAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
export const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

export function shiftDay(iso: string, days: number) {
  const d = fromDateInputValue(iso);
  d.setDate(d.getDate() + days);
  return toDateInputValue(d);
}
/** "Bugun" / "Kecha" / "3-noy, Seshanba". */
export function dayLabel(iso: string) {
  const today = dateKey();
  if (iso === today) return "Bugun";
  if (iso === shiftDay(today, -1)) return "Kecha";
  const d = fromDateInputValue(iso);
  return `${d.getDate()}-${MONTHS_SHORT[d.getMonth()]}, ${DAYS[d.getDay()]}`;
}
/** "Bugun" / "Ertaga" / "3-noy" (boshqa yil bo'lsa — yil bilan). */
export function shortDate(iso: string) {
  const today = dateKey();
  if (iso === today) return "Bugun";
  if (iso === shiftDay(today, -1)) return "Kecha";
  if (iso === shiftDay(today, 1)) return "Ertaga";
  const d = fromDateInputValue(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${d.getDate()}-${MONTHS_SHORT[d.getMonth()]}${sameYear ? "" : ` ${d.getFullYear()}`}`;
}

/* ─── Ko'rinish bo'laklari ─── */

export function CatBadge({ cat, size = 36 }: { cat: FinanceCategory | undefined; size?: number }) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center", size > 40 ? "rounded-[16px]" : "rounded-[12px]")}
      style={{ width: size, height: size, background: cat ? catSoft(cat.color, 0.15) : "var(--subtle)", color: cat ? catSolid(cat.color) : "var(--faint)" }}
    >
      {cat ? createElement(financeIcon(cat.icon), { className: size > 40 ? "size-6" : "size-[18px]", strokeWidth: 2 }) : <Tag className="size-[18px]" />}
    </span>
  );
}

export function BudgetBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <span className={cn("block h-1.5 overflow-hidden rounded-full bg-subtle", className)}>
      <motion.span className="block h-full rounded-full" style={{ background: budgetColor(pct) }} initial={false} animate={{ width: `${Math.min(100, pct * 100)}%` }} transition={{ duration: 0.3 }} />
    </span>
  );
}

export function Ring({ value, size = 40, stroke = 4, children }: { value: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--subtle)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--foreground)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} initial={false} animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, value))) }} transition={{ duration: 0.35 }} />
      </svg>
      {children}
    </span>
  );
}

export function SectionLabel({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-1.5 mt-4 flex min-h-6 items-center justify-between px-1">
      <p className="text-[13px] font-semibold text-muted">{children}</p>
      {aside && <span className="text-[12.5px] tabular-nums text-faint">{aside}</span>}
    </div>
  );
}

/** Ichida bo'luvchi chiziqli ro'yxat kartasi. */
export function List({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("overflow-hidden rounded-[22px] border border-border bg-surface [&>*+*]:border-t [&>*+*]:border-border", className)}>{children}</div>;
}

/** Oyna boshidagi karta: belgi, kichik sarlavha, nom va ×. */
export function SheetCard({ kicker, title, icon, onClose, children }: { kicker: string; title: string; icon?: React.ReactNode; onClose: () => void; children?: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-muted">{kicker}</p>
          <p className="mt-0.5 text-[21px] font-bold leading-tight tracking-[-0.02em]">{title}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Yopish" className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle text-foreground">
          <X className="size-4" strokeWidth={2.4} />
        </button>
      </div>
      {children}
    </div>
  );
}

export type ActionItem = { icon: LucideIcon; label: string; onClick: () => void; tone?: "danger" | "active" | "primary" };

export function ActionGrid({ items }: { items: ActionItem[] }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          onClick={it.onClick}
          className={cn(
            "flex h-[66px] flex-col items-center justify-center gap-1 rounded-[20px] text-[12.5px] font-semibold transition-colors",
            it.tone === "active" ? "bg-subtle" : it.tone === "primary" ? "bg-accent text-accent-ink" : "border border-border bg-surface",
            it.tone === "danger" && "text-danger"
          )}
        >
          <it.icon className="size-5" />{it.label}
        </button>
      ))}
    </div>
  );
}

export function FieldLabel({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex min-h-5 items-center justify-between px-1">
      <p className="text-[13px] font-semibold text-muted">{children}</p>
      {aside}
    </div>
  );
}

export function MoneyInput({ value, onChange, placeholder = "0", suffix = "so'm", autoFocus, right }: { value: number; onChange: (n: number) => void; placeholder?: string; suffix?: string; autoFocus?: boolean; right?: React.ReactNode }) {
  return (
    <div className="flex h-14 items-center gap-2 rounded-[18px] border border-border bg-background pl-4 pr-2 focus-within:border-border-strong">
      <input
        autoFocus={autoFocus}
        inputMode="numeric"
        value={value ? formatSom(value) : ""}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "").slice(0, 12) || 0))}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[21px] font-bold tabular-nums outline-none placeholder:text-[16px] placeholder:font-medium placeholder:text-faint"
      />
      {right ?? <span className="shrink-0 pr-2 text-[14px] text-faint">{suffix}</span>}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-12 w-full min-w-0 rounded-[18px] border border-border bg-background px-4 text-[16px] outline-none placeholder:text-faint focus:border-border-strong" />;
}

export function Chip({ on, onClick, children, icon: Icon }: { on: boolean; onClick: () => void; children: React.ReactNode; icon?: LucideIcon }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors", on ? "bg-accent text-accent-ink" : "bg-subtle text-muted")}>
      {Icon && <Icon className="size-4" />}{children}
    </button>
  );
}

/** Ikki-uch variantli bo'lak tanlov (pill). */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1 rounded-full bg-subtle p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} className={cn("h-9 truncate rounded-full px-2 text-[13.5px] font-semibold transition-colors", value === o.id ? "bg-surface text-foreground shadow-sm" : "text-muted")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DashedButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="mt-3 flex h-12 w-full items-center justify-center gap-1.5 rounded-[20px] border border-dashed border-border text-[14px] font-semibold text-muted active:bg-hover">
      <Plus className="size-4" /> {children}
    </button>
  );
}

/** Yopiq bo'lim (Bajarilgan / Hal qilingan). */
export function Collapsible({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-4">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex h-12 w-full items-center justify-between rounded-[18px] border border-border bg-subtle/30 px-4">
        <span className="flex items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</span>
          <span className="text-[12px] tabular-nums text-faint">{count}</span>
        </span>
        <ChevronDown className={cn("size-4 text-faint transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function Expand({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Sana tanlash: real PickerModal + katta oy jadvali. */
export function DatePick({ open, label, value, min, max, onPick, onClose }: { open: boolean; label: string; value: string | null; min?: string; max?: string; onPick: (iso: string) => void; onClose: () => void }) {
  return (
    <PickerModal open={open} onClose={onClose} label={label}>
      <BigMonth
        today={new Date()}
        selected={value ? fromDateInputValue(value) : null}
        min={min}
        max={max}
        onSelect={(d) => { onPick(toDateInputValue(d)); onClose(); }}
      />
    </PickerModal>
  );
}

/** Oyna yopilganda ichki holatni tiklash (render paytida, effektsiz). */
export function useOnClose(open: boolean, fn: () => void) {
  const [prev, setPrev] = useState(open);
  if (prev !== open) {
    setPrev(open);
    if (!open) fn();
  }
}

/** Oyna holati: id yopilganda ham qoladi — chiqish animatsiyasi bo'sh qolmasin. */
export function useSheet() {
  const [s, setS] = useState<{ id: string; open: boolean } | null>(null);
  return {
    id: s?.id ?? null,
    open: !!s?.open,
    show: (id: string) => setS({ id, open: true }),
    hide: () => setS((v) => (v ? { ...v, open: false } : v)),
  };
}
export type SheetState = ReturnType<typeof useSheet>;
