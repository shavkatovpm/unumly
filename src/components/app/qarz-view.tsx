"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Debt, DebtType } from "@/lib/types";
import { useDebts, useHydratedDebts } from "@/lib/debts-store";
import { dateKey, formatSom } from "@/lib/money";
import { Dialog } from "./widgets/dialog";
import { DatePickerButton } from "./widgets/date-picker-button";
import { useConfirmRemove } from "./widgets/confirm-dialog";
import { ListLoader } from "./widgets/list-loader";

const LENT_COLOR = "oklch(0.62 0.13 158)"; // yashil — menga qarzdor (keladi)
const BORROWED_COLOR = "oklch(0.62 0.17 22)"; // qizil — men qarzdorman

type Filter = "lent" | "borrowed";

function outstanding(d: Debt): number {
  return Math.max(0, d.amount - d.paidAmount);
}
function isOverdue(d: Debt): boolean {
  return !d.settledAt && !!d.dueDate && d.dueDate < dateKey();
}

/* ════════════════════════════════════════════════════════════ */

/** Moliya ichidagi "Qarz" tabi sifatida ishlatiladi (tashqi konteyner,
 *  sarlavha va sinov banneri Moliya tomonidan beriladi). */
export function QarzPanel() {
  const { debts, addDebt, updateDebt, recordPayment, setSettled, removeDebt } = useDebts();
  const hydrated = useHydratedDebts();

  const [filter, setFilter] = useState<Filter>("lent");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);

  const totals = useMemo(() => {
    let lent = 0;
    let borrowed = 0;
    for (const d of debts) {
      if (d.settledAt) continue;
      if (d.type === "LENT") lent += outstanding(d);
      else borrowed += outstanding(d);
    }
    return { lent, borrowed, net: lent - borrowed };
  }, [debts]);

  const active = useMemo(() => debts.filter((d) => !d.settledAt), [debts]);
  const settled = useMemo(() => debts.filter((d) => d.settledAt), [debts]);
  const wantType = filter === "lent" ? "LENT" : "BORROWED";
  const filteredActive = useMemo(
    () => active.filter((d) => d.type === wantType),
    [active, wantType]
  );
  const filteredSettled = useMemo(
    () => settled.filter((d) => d.type === wantType),
    [settled, wantType]
  );

  const confirmItems = useMemo(
    () => debts.map((d) => ({ id: d.id, title: `${d.counterparty} — ${formatSom(d.amount)} so'm` })),
    [debts]
  );
  const { askRemove, confirmEl } = useConfirmRemove(confirmItems, removeDebt, { itemLabel: "Qarzni" });

  function openEdit(d: Debt) { setEditing(d); setDialogOpen(true); }

  return (
    <>
      {/* Summary */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center gap-1.5 text-[11.5px] text-faint">
            <ArrowDownLeft className="size-3.5" style={{ color: LENT_COLOR }} />
            Menga qarzdor
          </div>
          <p className="mt-0.5 text-[16px] font-semibold tabular-nums" style={{ color: LENT_COLOR }}>
            {formatSom(totals.lent)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center gap-1.5 text-[11.5px] text-faint">
            <ArrowUpRight className="size-3.5" style={{ color: BORROWED_COLOR }} />
            Men qarzdorman
          </div>
          <p className="mt-0.5 text-[16px] font-semibold tabular-nums" style={{ color: BORROWED_COLOR }}>
            {formatSom(totals.borrowed)}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-0.5 rounded-lg bg-subtle/60 p-0.5 text-[12px]">
        <FilterButton active={filter === "lent"} onClick={() => setFilter("lent")}>Menga qarzdor</FilterButton>
        <FilterButton active={filter === "borrowed"} onClick={() => setFilter("borrowed")}>Men qarzdorman</FilterButton>
      </div>

      {!hydrated ? (
        <ListLoader />
      ) : (
        <div className="min-h-0 flex-1 space-y-2">
          {filteredActive.length === 0 && filteredSettled.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-faint">
              {filter === "lent" ? "Sizga qarzdorlar yo'q" : "Siz qarzdor emassiz"}
            </p>
          ) : (
            <>
              {filteredActive.map((d) => (
                <DebtCard
                  key={d.id}
                  debt={d}
                  onPay={(delta) => recordPayment(d.id, delta)}
                  onSettle={() => setSettled(d.id, true)}
                  onEdit={() => openEdit(d)}
                  onRemove={() => askRemove(d.id)}
                />
              ))}
              {filteredSettled.length > 0 && (
                <div className="pt-2">
                  <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-faint">
                    Hal qilingan
                  </p>
                  {filteredSettled.map((d) => (
                    <SettledCard
                      key={d.id}
                      debt={d}
                      onReopen={() => setSettled(d.id, false)}
                      onRemove={() => askRemove(d.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Desktopda past qismda kesik chiziqli tugma */}
      <button
        onClick={() => { setEditing(null); setDialogOpen(true); }}
        className="mt-2 hidden w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-[13.5px] font-medium text-muted transition-colors hover:border-border-strong hover:bg-hover hover:text-foreground md:flex"
      >
        <Plus className="size-4" />
        Yangi qarz
      </button>
      {/* Mobilda FAB */}
      <button
        onClick={() => { setEditing(null); setDialogOpen(true); }}
        aria-label="Yangi qarz"
        className="fixed bottom-20 right-4 z-30 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_10px_30px_-5px_rgba(0,0,0,0.35)] transition-transform hover:scale-105 active:scale-95 md:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <Plus className="size-6" strokeWidth={2.5} />
      </button>

      <DebtDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onCreate={(input) => { addDebt(input); setDialogOpen(false); }}
        onUpdate={(id, patch) => { updateDebt(id, patch); setDialogOpen(false); setEditing(null); }}
      />
      {confirmEl}
    </>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 whitespace-nowrap rounded-[7px] px-2 py-1.5 font-medium transition-all duration-150 active:scale-[0.96]",
        active
          ? "bg-accent font-semibold text-accent-ink shadow-sm"
          : "text-muted hover:bg-hover/50 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

/* ─── Active debt card ─── */
function DebtCard({
  debt,
  onPay,
  onSettle,
  onEdit,
  onRemove,
}: {
  debt: Debt;
  onPay: (delta: number) => void;
  onSettle: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const isLent = debt.type === "LENT";
  const color = isLent ? LENT_COLOR : BORROWED_COLOR;
  const left = outstanding(debt);
  const partial = debt.paidAmount > 0;
  const pct = debt.amount > 0 ? debt.paidAmount / debt.amount : 0;
  const overdue = isOverdue(debt);

  function pay() {
    const amount = Number(amountStr || "0");
    if (amount <= 0) return;
    onPay(amount);
    setAmountStr("");
    setPaying(false);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3.5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: isLent ? "oklch(0.62 0.13 158 / 0.14)" : "oklch(0.62 0.17 22 / 0.14)", color }}>
          {isLent ? <ArrowDownLeft className="size-[18px]" /> : <ArrowUpRight className="size-[18px]" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-medium">{debt.counterparty}</p>
          <p className="text-[11.5px]" style={{ color }}>
            {isLent ? "Menga qarzdor" : "Men qarzdorman"}
          </p>
          {debt.note && <p className="mt-0.5 truncate text-[12px] text-faint">{debt.note}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-semibold tabular-nums">{formatSom(left)}</p>
          <p className="text-[10.5px] text-faint">so&apos;m{partial && ` / ${formatSom(debt.amount)}`}</p>
        </div>
      </div>

      {partial && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-subtle">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct * 100)}%`, background: color }} />
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11.5px]">
          {debt.dueDate ? (
            <span className={cn("flex items-center gap-1", overdue ? "font-medium" : "text-faint")} style={overdue ? { color: BORROWED_COLOR } : undefined}>
              <CalendarDays className="size-3" />
              {overdue ? "Muddati o'tdi" : formatDate(debt.dueDate)}
            </span>
          ) : (
            <span className="text-faint">Muddatsiz</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setPaying((v) => !v)} className="rounded-md px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-hover hover:text-foreground">
            {isLent ? "Oldim" : "Qaytardim"}
          </button>
          <button onClick={onEdit} aria-label="Tahrirlash" className="grid size-7 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><Pencil className="size-3.5" /></button>
          <button onClick={onRemove} aria-label="O'chirish" className="grid size-7 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><Trash2 className="size-3.5" /></button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {paying && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex flex-1 items-baseline gap-1.5 rounded-lg border border-border bg-subtle/30 px-2.5 py-2 focus-within:border-foreground/30">
                <input
                  autoFocus
                  inputMode="numeric"
                  value={amountStr ? formatSom(Number(amountStr)) : ""}
                  onChange={(e) => setAmountStr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  onKeyDown={(e) => { if (e.key === "Enter") pay(); }}
                  placeholder={`Qaytarilgan summa (qoldi: ${formatSom(left)})`}
                  className="min-w-0 flex-1 bg-transparent text-[14px] font-medium tabular-nums outline-none placeholder:text-faint/50"
                />
                <span className="shrink-0 text-[12px] text-faint">so&apos;m</span>
              </div>
              <button onClick={pay} disabled={Number(amountStr || "0") <= 0} aria-label="Qo'shish" className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-foreground hover:bg-hover disabled:opacity-40"><Check className="size-4" /></button>
              <button onClick={onSettle} className="grid h-9 shrink-0 place-items-center rounded-lg bg-foreground px-3 text-[12.5px] font-medium text-background">To&apos;liq</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Settled debt card ─── */
function SettledCard({ debt, onReopen, onRemove }: { debt: Debt; onReopen: () => void; onRemove: () => void }) {
  const isLent = debt.type === "LENT";
  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-surface/50 px-3.5 py-2.5 opacity-70">
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-subtle text-faint">
        <Check className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium line-through decoration-faint/60">{debt.counterparty}</p>
        <p className="text-[11px] text-faint">{isLent ? "Menga qarzdor edi" : "Qarzdor edim"} · {formatSom(debt.amount)} so&apos;m</p>
      </div>
      <button onClick={onReopen} aria-label="Qayta ochish" className="grid size-7 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><RotateCcw className="size-3.5" /></button>
      <button onClick={onRemove} aria-label="O'chirish" className="grid size-7 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><Trash2 className="size-3.5" /></button>
    </div>
  );
}

/* ─── Create / edit dialog ─── */
function DebtDialog({
  open,
  editing,
  onClose,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  editing: Debt | null;
  onClose: () => void;
  onCreate: (input: { type: DebtType; counterparty: string; amount: number; dueDate?: string | null; note?: string }) => void;
  onUpdate: (id: string, patch: { counterparty: string; amount: number; dueDate: string | null; note: string }) => void;
}) {
  const [type, setType] = useState<DebtType>("BORROWED");
  const [counterparty, setCounterparty] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setLastOpen(true);
    if (editing) {
      setType(editing.type);
      setCounterparty(editing.counterparty);
      setAmountStr(String(editing.amount));
      setDueDate(editing.dueDate ?? "");
      setNote(editing.note ?? "");
    } else {
      setType("BORROWED");
      setCounterparty("");
      setAmountStr("");
      setDueDate("");
      setNote("");
    }
  }
  if (!open && lastOpen) setLastOpen(false);

  const amount = Number(amountStr || "0");
  const valid = counterparty.trim().length > 0 && amount > 0;

  function save() {
    if (!valid) return;
    if (editing) {
      onUpdate(editing.id, { counterparty: counterparty.trim(), amount, dueDate: dueDate || null, note });
    } else {
      onCreate({ type, counterparty: counterparty.trim(), amount, dueDate: dueDate || null, note: note || undefined });
    }
  }

  return (
    <Dialog open={open} onClose={onClose} mobilePlacement="top" className="w-full max-w-md">
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-[15px] font-semibold">{editing ? "Qarzni tahrirlash" : "Yangi qarz"}</p>
          <button onClick={onClose} aria-label="Yopish" className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"><X className="size-4" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch]">
        {!editing && (
          <div className="mb-3 grid grid-cols-2 gap-2 text-[13.5px]">
            <button
              onClick={() => setType("BORROWED")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border py-2.5 font-semibold transition-all",
                type === "BORROWED" ? "border-transparent text-white shadow-sm" : "border-border font-medium text-muted hover:bg-hover"
              )}
              style={type === "BORROWED" ? { background: BORROWED_COLOR } : undefined}
            >
              <ArrowDownLeft className="size-4" />
              Men oldim
            </button>
            <button
              onClick={() => setType("LENT")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border py-2.5 font-semibold transition-all",
                type === "LENT" ? "border-transparent text-white shadow-sm" : "border-border font-medium text-muted hover:bg-hover"
              )}
              style={type === "LENT" ? { background: LENT_COLOR } : undefined}
            >
              <ArrowUpRight className="size-4" />
              Men berdim
            </button>
          </div>
        )}

        <input
          autoFocus
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
          placeholder={type === "BORROWED" ? "Kimdan oldim (ism)" : "Kimga berdim (ism)"}
          className="mb-3 w-full rounded-lg border border-border bg-subtle/30 px-3 py-2.5 text-[14px] outline-none placeholder:text-faint/50 focus:border-foreground/30"
        />

        <div className="mb-3 flex items-baseline gap-2 rounded-lg border border-border bg-subtle/30 px-3 py-2.5 focus-within:border-foreground/30">
          <input
            inputMode="numeric"
            value={amountStr ? formatSom(amount) : ""}
            onChange={(e) => setAmountStr(e.target.value.replace(/\D/g, "").slice(0, 12))}
            placeholder="Summa"
            className="min-w-0 flex-1 bg-transparent text-[18px] font-semibold tabular-nums outline-none placeholder:text-faint/50"
          />
          <span className="shrink-0 text-[13px] text-faint">so&apos;m</span>
        </div>

        <div className="mb-3">
          <p className="mb-1.5 text-[12px] text-faint">Muddat (ixtiyoriy)</p>
          <DatePickerButton
            value={dueDate}
            onChange={setDueDate}
            onClear={() => setDueDate("")}
            format={formatDate}
            placeholder="Sana tanlash"
            min={dateKey()}
          />
        </div>

        <div className="mb-3">
          <p className="mb-1.5 text-[12px] text-faint">Izoh</p>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ixtiyoriy" className="w-full rounded-lg border border-border bg-subtle/30 px-2.5 py-2 text-[13px] outline-none placeholder:text-faint/50 focus:border-foreground/30" />
        </div>
        {dueDate && (
          <p className="mb-3 -mt-1 text-[11.5px] text-faint">Muddat kuni ertalab bot eslatma yuboradi.</p>
        )}
        </div>

        <footer className="shrink-0 border-t border-border px-4 py-3">
        <button onClick={save} disabled={!valid} className="w-full rounded-lg bg-foreground py-2.5 text-[14px] font-medium text-background transition-opacity disabled:opacity-40">
          {editing ? "Saqlash" : "Qo'shish"}
        </button>
        </footer>
      </div>
    </Dialog>
  );
}

/* ─── Helpers ─── */
const UZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];
function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return `${d}-${UZ_MONTHS_SHORT[m - 1]} ${y}`;
}
