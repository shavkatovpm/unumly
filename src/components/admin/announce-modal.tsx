"use client";

import { useState, useTransition } from "react";
import { Send, X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendAnnouncement, type AnnounceTarget } from "@/app/admode/_actions";

export function AnnounceButton({
  label = "E'lon yuborish",
  target,
  targetSummary,
}: {
  label?: string;
  target: AnnounceTarget;
  /** Foydalanuvchiga ko'rinadi: "23 ta foydalanuvchi" yoki "@aliyev_b" */
  targetSummary: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
      >
        <Send className="size-3.5" strokeWidth={1.8} />
        {label}
      </button>
      {open && (
        <AnnounceModal
          target={target}
          targetSummary={targetSummary}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function AnnounceModal({
  target,
  targetSummary,
  onClose,
}: {
  target: AnnounceTarget;
  targetSummary: string;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { kind: "success"; sent: number; failed: number }
    | { kind: "error"; message: string }
    | null
  >(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || pending) return;
    setResult(null);
    startTransition(async () => {
      const r = await sendAnnouncement(target, text);
      if (!r.ok && r.error) {
        setResult({ kind: "error", message: r.error });
      } else {
        setResult({ kind: "success", sent: r.sent, failed: r.failed });
        if (r.sent > 0) setText("");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-[3px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <p className="text-[14px] font-semibold tracking-[-0.01em]">
              E&apos;lon yuborish
            </p>
            <p className="mt-0.5 text-[11px] text-faint">
              Qabul qiluvchi: <span className="text-muted">{targetSummary}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <form onSubmit={submit} className="px-5 py-4">
          <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
            Xabar
          </label>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (result) setResult(null);
            }}
            placeholder="Xabar matnini yozing. Markdown qo'llab-quvvatlanadi (*qalin*, _kursiv_)."
            rows={6}
            maxLength={4000}
            autoFocus
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[13px] leading-relaxed placeholder:text-faint focus:border-border-strong focus:outline-none"
          />
          <div className="mt-1 flex items-center justify-between text-[10.5px] text-faint">
            <span>Telegram bot orqali yuboriladi</span>
            <span className="font-mono tabular-nums">{text.length}/4000</span>
          </div>

          {result?.kind === "success" && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-[12px] text-accent">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
              <p>
                Yuborildi: <span className="font-medium">{result.sent}</span>
                {result.failed > 0 && (
                  <>
                    {" "}· xatolik:{" "}
                    <span className="font-medium text-danger">{result.failed}</span>
                  </>
                )}
              </p>
            </div>
          )}
          {result?.kind === "error" && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[12px] text-danger">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <p>{result.message}</p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-[12px] text-muted transition-colors hover:bg-hover hover:text-foreground"
            >
              Bekor
            </button>
            <button
              type="submit"
              disabled={!text.trim() || pending}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity",
                !text.trim() || pending
                  ? "cursor-not-allowed bg-foreground/40 text-background"
                  : "bg-foreground text-background hover:opacity-90",
              )}
            >
              <Send className="size-3.5" strokeWidth={2} />
              {pending ? "Yuborilmoqda..." : "Yuborish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
