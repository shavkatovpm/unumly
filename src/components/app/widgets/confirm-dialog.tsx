"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Dialog } from "./dialog";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Tasdiqlash",
  cancelLabel = "Bekor",
  destructive = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
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
            destructive ? "bg-danger text-white" : "bg-foreground text-background"
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
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
