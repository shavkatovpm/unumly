"use client";

/* Mobil "Mono" uslubining kichik bo'laklari: ixcham tablar, dumaloq belgi,
   almashtirgich, qadam tugmasi, tanlov oynasi, yopiq "Bajarilgan" bo'limi.
   Loyiha / Bajarilgan / Arxiv / O'chirilgan / Sozlamalar mobil ko'rinishlari
   shulardan yig'iladi. */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Minus, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PickerModal } from "./picker-modal";

/** Ixcham tablar qatori (h-9, bitta "tabletka" ichida). */
export function MonoSeg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="grid gap-1 rounded-full bg-subtle p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn("h-9 truncate rounded-full px-1 text-[13.5px] font-semibold transition-colors", value === o.id ? "bg-accent text-accent-ink shadow-sm" : "text-muted")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Dumaloq tugma (×, ⋯, +). */
export function MonoIconButton({ icon: Icon, label, onClick, solid, className }: { icon: LucideIcon; label: string; onClick?: () => void; solid?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cn("grid size-10 shrink-0 place-items-center rounded-full transition-transform active:scale-95", solid ? "bg-accent text-accent-ink" : "bg-subtle text-foreground", className)}>
      <Icon className="size-5" strokeWidth={2.2} />
    </button>
  );
}

/** Dumaloq belgilash — qatorning o'ng tomonida. */
export function MonoTick({ on, onClick, size = 26, label }: { on: boolean; onClick?: () => void; size?: number; label?: string }) {
  const cls = cn("grid shrink-0 place-items-center rounded-full border-2 transition-colors", on ? "border-accent bg-accent text-accent-ink" : "border-border-strong");
  const inner = on && <Check className="size-3.5" strokeWidth={3.5} />;
  if (!onClick) return <span className={cls} style={{ width: size, height: size }}>{inner}</span>;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={label ?? (on ? "Bekor qilish" : "Bajarildi")}
      // Tegish maydoni 40px, ko'rinadigan doira kichikroq
      className="-m-2 grid shrink-0 place-items-center p-2"
    >
      <span className={cls} style={{ width: size, height: size }}>{inner}</span>
    </button>
  );
}

/** Yoqish/o'chirish (accent — yoqilgan). Faqat ko'rinish: bosish qatorda. */
export function MonoSwitch({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={cn("relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors", on ? "bg-accent" : "bg-subtle ring-1 ring-inset ring-border")}>
      <motion.span initial={false} animate={{ x: on ? 22 : 2 }} transition={{ type: "spring", stiffness: 600, damping: 36 }} className={cn("absolute top-[2px] size-[26px] rounded-full shadow", on ? "bg-accent-ink" : "bg-background")} />
    </span>
  );
}

/** − qiymat + */
export function MonoStepper({ value, onChange, step = 0.5, min = 0, max = 99, unit }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit: string }) {
  const round = (n: number) => Math.round(n * 10) / 10;
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button type="button" aria-label="Kamaytirish" disabled={value <= min} onClick={() => onChange(Math.max(min, round(value - step)))} className="grid size-10 place-items-center rounded-full bg-subtle disabled:opacity-35">
        <Minus className="size-4" strokeWidth={2.4} />
      </button>
      <span className="w-12 text-center text-[15px] font-semibold tabular-nums">{value}<span className="text-[12px] text-faint">{unit}</span></span>
      <button type="button" aria-label="Oshirish" disabled={value >= max} onClick={() => onChange(Math.min(max, round(value + step)))} className="grid size-10 place-items-center rounded-full bg-subtle disabled:opacity-35">
        <Plus className="size-4" strokeWidth={2.4} />
      </button>
    </span>
  );
}

/** Variantlardan birini tanlash (muhimlik, saralash va h.k.) — ekran o'rtasida. */
export function MonoOptions<T>({ open, label, options, value, onPick, onClose }: { open: boolean; label: string; options: { id: T; label: string; dot?: React.ReactNode; sub?: string }[]; value: T; onPick: (v: T) => void; onClose: () => void }) {
  return (
    <PickerModal open={open} onClose={onClose} label={label}>
      <div className="overflow-hidden rounded-[22px] border border-border bg-background [&>*+*]:border-t [&>*+*]:border-border">
        {options.map((o) => (
          <button key={String(o.id)} type="button" onClick={() => { onPick(o.id); onClose(); }} className="flex min-h-[56px] w-full items-center gap-3 px-3.5 text-left active:bg-hover">
            {o.dot}
            <span className="min-w-0 flex-1">
              <span className="block text-[15.5px] font-semibold">{o.label}</span>
              {o.sub && <span className="block text-[12.5px] text-faint">{o.sub}</span>}
            </span>
            <MonoTick on={o.id === value} size={24} />
          </button>
        ))}
      </div>
    </PickerModal>
  );
}

/** Yopiq "Bajarilgan" bo'limi (Maqsad'dagi kabi). */
export function MonoDoneFold({ count, children, label = "Bajarilgan" }: { count: number; children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <section className="mt-4">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-h-12 w-full items-center justify-between rounded-[18px] border border-border bg-subtle/30 px-4 text-left">
        <span className="flex items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</span>
          <span className="text-[12px] tabular-nums text-faint">{count}</span>
        </span>
        <ChevronDown className={cn("size-4 text-faint transition-transform", open && "rotate-180")} />
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

/** Bo'lim yorlig'i (ro'yxat ustida). */
export function MonoLabel({ children, aside, className }: { children: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-1.5 mt-4 flex items-baseline justify-between px-1", className)}>
      <p className="text-[13px] font-semibold text-muted">{children}</p>
      {aside !== undefined && <span className="text-[12.5px] tabular-nums text-faint">{aside}</span>}
    </div>
  );
}

/** Chiziqlar bilan bo'lingan ro'yxat kartasi. */
export const MONO_GROUP = "overflow-hidden rounded-[22px] border border-border bg-surface [&>*+*]:border-t [&>*+*]:border-border";

/** Bo'sh holat. */
export function MonoEmpty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-subtle text-faint"><Icon className="size-6" /></span>
      <p className="mt-3 text-[17px] font-semibold">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-[260px] text-[14px] leading-relaxed text-muted">{text}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Ixcham sahifa sarlavhasi (22px) — o'ngda hisoblagich yoki tugma. */
export function MonoTitle({ children, sub, aside }: { children: React.ReactNode; sub?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3">
      <div className="flex min-w-0 items-baseline gap-2">
        <h1 className="shrink-0 text-[22px] font-bold leading-tight tracking-[-0.025em]">{children}</h1>
        {sub && <p className="truncate text-[13px] text-muted">{sub}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

export function MonoCount({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-subtle px-3 py-1.5 text-[13px] font-semibold tabular-nums">{children}</span>;
}
