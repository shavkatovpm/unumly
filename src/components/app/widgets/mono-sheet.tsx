"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil, Trash2, Undo2, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileSheetClose } from "@/lib/mobile-add";
import { useScrollLock } from "@/lib/use-scroll-lock";

/* Mobil qo'shish oynalari uchun umumiy "Mono" qobiq: yuqorida Telegram zonasi
   ostidan boshlanadi, pastki nav ko'rinib turadi va undagi × oynani yopadi.
   Klaviatura ochilsa nav yashirinadi, oyna ko'rinadigan maydonga sig'adi. */

const noopSubscribe = () => () => {};
const NAV_SPACE = 104; // nav va uning ko'tarilgan "+" tugmasi uchun joy
const KEYBOARD_MIN = 120;

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const q = window.matchMedia("(max-width: 767px)");
      q.addEventListener("change", cb);
      return () => q.removeEventListener("change", cb);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false
  );
}

function useVisibleArea() {
  const [area, setArea] = useState<{ height: number; top: number } | null>(null);
  const base = useRef(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    base.current = vv.height;
    const update = () => setArea({ height: vv.height, top: Math.max(0, vv.offsetTop) });
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return { area, base };
}

function Panel({ onClose, label, children }: { onClose: () => void; label: string; children: React.ReactNode }) {
  useScrollLock(true);
  useMobileSheetClose(onClose);
  const { area, base } = useVisibleArea();
  const keyboard = !!area && base.current - area.height > KEYBOARD_MIN;
  const height = area ? `${area.height}px` : "var(--tg-vh, 100dvh)";
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -24, opacity: 0, transition: { duration: 0.16, ease: "easeIn" } }}
      transition={{ type: "spring", damping: 30, stiffness: 360 }}
      className="fixed inset-x-3 z-[25] space-y-2 overflow-y-auto overscroll-contain rounded-[30px] bg-background p-2 shadow-2xl"
      style={{
        top: `calc(${area?.top ?? 0}px + var(--modal-safe-top))`,
        maxHeight: `calc(${height} - var(--modal-safe-top) - ${keyboard ? 12 : NAV_SPACE}px)`,
      }}
    >
      {children}
    </motion.div>
  );
}

export function MonoSheet({
  open,
  onClose,
  label,
  dismissable = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  /** false — fon bosilganda yopilmaydi (tahrirlanayotgan ma'lumot yo'qolmasin). */
  dismissable?: boolean;
  children: React.ReactNode;
}) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="mono-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={dismissable ? onClose : undefined}
          className="fixed inset-0 z-20 bg-black/35 backdrop-blur-[2px]"
        />
      )}
      {open && <Panel key="mono-panel" onClose={onClose} label={label}>{children}</Panel>}
    </AnimatePresence>,
    document.body
  );
}

export function MonoHeader({
  label,
  value,
  onChange,
  placeholder,
  onEnter,
  onClose,
  autoFocus = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onEnter?: () => void;
  onClose: () => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] font-semibold text-muted">{label}</p>
        <button type="button" onClick={onClose} aria-label="Yopish" className="grid size-8 place-items-center rounded-full bg-subtle text-foreground">
          <X className="size-4" strokeWidth={2.4} />
        </button>
      </div>
      <textarea
        autoFocus={autoFocus}
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        enterKeyHint="done"
        placeholder={placeholder}
        className="mt-1 w-full resize-none bg-transparent text-[23px] font-bold leading-tight tracking-[-0.02em] outline-none placeholder:text-faint"
      />
    </div>
  );
}

const tileBase = "flex h-[78px] min-w-0 flex-col justify-between overflow-hidden rounded-[22px] p-3 text-left transition-[transform,background-color,color] active:scale-[0.97]";
const tileColor = (filled: boolean, danger?: boolean) =>
  danger ? "bg-danger-soft text-danger" : filled ? "bg-accent text-accent-ink" : "border border-border bg-surface";

/** Katak: yuqorida nomi, pastda qiymati. Qiymat tanlangach to'ladi. */
export function MonoTile({
  icon: Icon,
  label,
  value,
  filled,
  danger,
  disabled,
  onClick,
  buttonRef,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  filled?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  className?: string;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      // Input fokusi saqlanadi — klaviatura yopilib, oyna sakramaydi.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={`${label}: ${value ?? "tanlanmagan"}`}
      className={cn(tileBase, tileColor(!!filled, danger), disabled && "opacity-45", className)}
    >
      <span className="flex items-center gap-1 text-[11.5px] font-semibold opacity-75">
        <Icon className="size-3.5 shrink-0" /> <span className="truncate">{label}</span>
      </span>
      <span className={cn("block truncate text-[19px] font-bold tracking-[-0.01em]", !value && "opacity-35")}>{value ?? "—"}</span>
    </button>
  );
}

export function MonoBlock({ icon: Icon, label, aside, children }: { icon: LucideIcon; label: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-[11.5px] font-semibold">
        <span className="flex items-center gap-1 opacity-75"><Icon className="size-3.5 shrink-0" /> {label}</span>
        {aside}
      </div>
      {children}
    </div>
  );
}

/* Task/maqsad ochilganda: Bajarildi · Tahrirlash · O'chirish. Tahrirlash
   shu oynaning ichida ochiladi, belgisi × ga aylanadi. */
export function MonoActions({
  done,
  onToggleDone,
  editing,
  onToggleEdit,
  onDelete,
}: {
  done: boolean;
  onToggleDone: () => void;
  editing: boolean;
  onToggleEdit: () => void;
  onDelete: () => void;
}) {
  const base = "flex h-[70px] flex-col items-center justify-center gap-1 rounded-[20px] text-[12.5px] font-semibold transition-colors";
  const DoneIcon = done ? Undo2 : Check;
  return (
    <div className="grid grid-cols-3 gap-2">
      <button type="button" onClick={onToggleDone} className={cn(base, done ? "border border-border bg-surface" : "bg-accent text-accent-ink")}>
        <DoneIcon className="size-5" /> {done ? "Qaytarish" : "Bajarildi"}
      </button>
      <button type="button" onClick={onToggleEdit} aria-expanded={editing} className={cn(base, editing ? "border border-transparent bg-subtle" : "border border-border bg-surface")}>
        <span className="relative grid size-5 place-items-center">
          {/* Qalam ↔ ×: bir joyda aylanib almashadi, tugma sakramaydi */}
          <AnimatePresence initial={false}>
            <motion.span
              key={editing ? "close" : "edit"}
              initial={{ opacity: 0, rotate: editing ? -90 : 90, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: editing ? 90 : -90, scale: 0.6 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 grid place-items-center"
            >
              {editing ? <X className="size-5" strokeWidth={2.4} /> : <Pencil className="size-5" />}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="grid">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span key={editing ? "yopish" : "tahrir"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>
              {editing ? "Yopish" : "Tahrirlash"}
            </motion.span>
          </AnimatePresence>
        </span>
      </button>
      <button type="button" onClick={onDelete} className={cn(base, "border border-border bg-surface text-danger")}>
        <Trash2 className="size-5" /> O&apos;chirish
      </button>
    </div>
  );
}

/* Ochilib-yopiladigan bo'lim: faqat balandlik va shaffoflik. */
export function MonoExpand({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0, overflow: "hidden" }}
          animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
          exit={{ height: 0, opacity: 0, overflow: "hidden" }}
          transition={{ duration: 0.18 }}
          className="space-y-2"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MonoSave({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="sticky bottom-0 flex h-[52px] w-full items-center justify-center gap-2 rounded-[22px] bg-accent text-[15.5px] font-bold text-accent-ink transition-colors disabled:bg-subtle disabled:text-faint"
    >
      <Check className="size-5" strokeWidth={3} /> {children ?? "Qo'shish"}
    </button>
  );
}
