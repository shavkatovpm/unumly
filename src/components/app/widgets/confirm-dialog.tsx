"use client";

import { useCallback, useState } from "react";
import { Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog } from "./dialog";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Tasdiqlash",
  cancelLabel = "Bekor",
  destructive = false,
  icon,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Mobil oynadagi belgi (destructive bo'lsa standart — savatcha). */
  icon?: LucideIcon;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="max-w-sm max-md:rounded-[28px]"
      mobilePlacement="center"
    >
      {/* Mobil — katta, markazlashgan Mono uslubi */}
      <ConfirmMobile title={title} description={description} confirmLabel={confirmLabel} cancelLabel={cancelLabel} destructive={destructive} icon={icon ?? (destructive ? Trash2 : undefined)} onConfirm={onConfirm} onClose={onClose} />
      <div className="hidden md:block">
      <div className="px-5 pb-4 pt-5">
        <p className="text-[14.5px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </p>
        {description && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border bg-subtle/30 px-4 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-[12px] text-muted transition-colors hover:bg-hover hover:text-foreground"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          autoFocus
          className={cn(
            "rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity hover:opacity-90",
            destructive ? "bg-danger text-white" : "bg-accent text-accent-ink"
          )}
        >
          {confirmLabel}
        </button>
      </div>
      </div>
    </Dialog>
  );
}

function ConfirmMobile({ title, description, confirmLabel, cancelLabel, destructive, icon: Icon, onConfirm, onClose }: {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  icon?: LucideIcon;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-5 text-center md:hidden">
      {Icon && (
        <span className={cn("mx-auto mb-3 grid size-12 place-items-center rounded-full", destructive ? "bg-danger-soft text-danger" : "bg-subtle text-foreground")}>
          <Icon className="size-5" />
        </span>
      )}
      <p className="text-[18px] font-bold tracking-[-0.01em] text-foreground">{title}</p>
      {description && <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{description}</p>}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} className="h-12 rounded-[18px] bg-subtle text-[15px] font-semibold text-foreground">
          {cancelLabel === "Bekor" ? "Bekor qilish" : cancelLabel}
        </button>
        <button type="button" onClick={onConfirm} className={cn("h-12 rounded-[18px] text-[15px] font-semibold", destructive ? "bg-danger text-white" : "bg-accent text-accent-ink")}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

export function useConfirmRemove(
  items: { id: string; title: string }[],
  remove: (id: string) => void,
  opts?: {
    title?: string;
    itemLabel?: string;
    /** Override the body. `{title}` is replaced with the item's title. */
    description?: string;
    confirmLabel?: string;
  }
) {
  const [askingId, setAskingId] = useState<string | null>(null);
  const asked = askingId ? items.find((p) => p.id === askingId) ?? null : null;

  const askRemove = useCallback((id: string) => {
    setAskingId(id);
  }, []);

  const itemLabel = opts?.itemLabel ?? "Rejani";

  const description = asked
    ? (opts?.description ?? `"{title}" o'chiriladi. Bu amalni qaytarib bo'lmaydi.`)
        .replace("{title}", asked.title)
    : undefined;

  const element = (
    <ConfirmDialog
      open={!!asked}
      title={opts?.title ?? `${itemLabel} o'chirish`}
      description={description}
      confirmLabel={opts?.confirmLabel ?? "O'chirish"}
      cancelLabel="Bekor"
      destructive
      onConfirm={() => {
        if (asked) remove(asked.id);
        setAskingId(null);
      }}
      onClose={() => setAskingId(null)}
    />
  );

  return { askRemove, confirmEl: element };
}
