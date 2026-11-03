"use client";

/* Reja va Odat mobil ko'rinishi uchun kichik umumiy bo'laklar: ixcham
   sarlavha, dumaloq belgi, halqa, segment, yig'iladigan bo'lim. */

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ro'yxat kartasi: ichidagi qatorlar orasida chiziq. */
export const groupCls = "overflow-hidden rounded-[22px] border border-border bg-surface [&>*+*]:border-t [&>*+*]:border-border";

/** 22px sarlavha + yonida qisqa holat; o'ngda tugmalar. */
export function MobileTitle({ title, sub, aside }: { title: string; sub?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-1">
      <div className="flex min-w-0 items-baseline gap-2">
        {title && <h1 className="shrink-0 text-[22px] font-bold leading-tight tracking-[-0.025em]">{title}</h1>}
        {sub && <p className="truncate text-[13px] text-muted">{sub}</p>}
      </div>
      {aside && <div className="flex shrink-0 items-center gap-1.5">{aside}</div>}
    </div>
  );
}

/** Dumaloq belgilash — qatorning o'ng tomonida. */
export function Tick({ on, onClick, size = 26, disabled }: { on: boolean; onClick?: () => void; size?: number; disabled?: boolean }) {
  const cls = cn("grid shrink-0 place-items-center rounded-full border-2 transition-colors", on ? "border-accent bg-accent text-accent-ink" : "border-border-strong", disabled && "opacity-30");
  const inner = on && <Check className="size-3.5" strokeWidth={3.5} />;
  if (!onClick || disabled) return <span className={cls} style={{ width: size, height: size }}>{inner}</span>;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={on ? "Bajarilmagan deb belgilash" : "Bajarildi"}
      className="-m-2 grid shrink-0 place-items-center p-2"
    >
      <span className={cls} style={{ width: size, height: size }}>{inner}</span>
    </button>
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

/** Ixcham segmentli tanlov (40px). `solid` — tanlangani to'liq rangda. */
export function Segment<T extends string>({ value, options, onChange, id, solid, className }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; id: string; solid?: boolean; className?: string }) {
  return (
    <div className={cn("flex h-10 rounded-full bg-subtle p-1", className)}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} type="button" onClick={() => onChange(o.id)} className={cn("relative flex-1 rounded-full text-[13.5px] font-semibold transition-colors", on ? (solid ? "text-accent-ink" : "text-foreground") : "text-muted")}>
            {on && <motion.span layoutId={id} transition={{ type: "spring", stiffness: 500, damping: 40 }} className={cn("absolute inset-0 rounded-full shadow-sm", solid ? "bg-accent" : "bg-surface")} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Ochib-yopiladigan joy: faqat balandlik va shaffoflik. */
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

/** Pastdagi yopiq bo'lim sarlavhasi (Bajarilgan, Arxivlangan). */
export function CollapseHead({ icon: Icon, label, count, open, onToggle }: { icon: LucideIcon; label: string; count: number; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} className="flex h-12 min-w-0 flex-1 items-center justify-between rounded-[18px] border border-border bg-subtle/30 px-4 text-left">
      <span className="flex items-center gap-2">
        <Icon className="size-4 text-faint" strokeWidth={2.6} />
        <span className="text-[13.5px] font-semibold text-muted">{label}</span>
        <span className="text-[13px] tabular-nums text-faint">{count}</span>
      </span>
      <ChevronDown className={cn("size-4 text-faint transition-transform duration-200", open && "rotate-180")} />
    </button>
  );
}

export function EmptyCard({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-dashed border-border px-6 py-10 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-subtle text-faint"><Icon className="size-6" /></span>
      <p className="mt-3 text-[17px] font-semibold">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-[260px] text-[14px] leading-relaxed text-muted">{text}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Kichik dumaloq ikonali tugma (40px). */
export function RoundButton({ icon: Icon, label, onClick, solid, disabled }: { icon: LucideIcon; label: string; onClick: () => void; solid?: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className={cn("grid size-10 shrink-0 place-items-center rounded-full transition-transform active:scale-95 disabled:opacity-30", solid ? "bg-accent text-accent-ink" : "bg-subtle text-foreground")}>
      <Icon className="size-5" strokeWidth={2.2} />
    </button>
  );
}

/** Oyna sarlavhasi kartasi (MonoHeader'ning o'qish uchun varianti). */
export function SheetHeadCard({ kicker, title, done, onClose, children, leading }: { kicker: React.ReactNode; title: string; done?: boolean; onClose: () => void; children?: React.ReactNode; leading?: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        {leading}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-[12.5px] font-semibold text-muted">{kicker}</p>
          <p className={cn("mt-0.5 text-[21px] font-bold leading-tight tracking-[-0.02em]", done && "text-faint line-through decoration-faint/60")}>{title}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Yopish" className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle text-foreground">
          <X className="size-4" strokeWidth={2.4} />
        </button>
      </div>
      {children}
    </div>
  );
}

/** Menyu qatori (PickerModal ichida): belgi, nom, o'ng strelka. */
export function MenuRow({ icon: Icon, label, onClick, danger, trailing }: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean; trailing?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex min-h-[56px] w-full items-center gap-3 px-3.5 text-left", danger ? "text-danger active:bg-danger-soft" : "active:bg-hover")}>
      <Icon className={cn("size-[18px]", !danger && "text-muted")} />
      <span className="flex-1 text-[15px] font-semibold">{label}</span>
      {trailing}
    </button>
  );
}

const noopSubscribe = () => () => {};

/** Qisqa xabar (pastki nav ustida, ~1.8 s). */
export function useMiniToast() {
  const [text, setText] = useState<string | null>(null);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  useEffect(() => {
    if (!text) return;
    const t = window.setTimeout(() => setText(null), 1800);
    return () => window.clearTimeout(t);
  }, [text]);
  const toastEl = mounted
    ? createPortal(
        <AnimatePresence>
          {text && (
            <motion.div key={text} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="pointer-events-none fixed inset-x-0 bottom-[calc(108px+env(safe-area-inset-bottom))] z-[140] flex justify-center px-6 md:hidden">
              <span className="rounded-full bg-accent px-4 py-2.5 text-center text-[13.5px] font-semibold text-accent-ink shadow-lg">{text}</span>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )
    : null;
  return { toast: setText, toastEl };
}
