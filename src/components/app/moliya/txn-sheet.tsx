"use client";

/* Yozuv: ro'yxat qatori, ko'rish oynasi va shu oynaning ichida tahrirlash. */

import { createElement, useMemo, useState } from "react";
import { CalendarDays, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionType } from "@/lib/types";
import { financeIcon } from "@/lib/finance-icons";
import { dateKey, formatSom } from "@/lib/money";
import { MonoSave, MonoSheet } from "../widgets/mono-sheet";
import { ConfirmDialog } from "../widgets/confirm-dialog";
import { CategoryForm } from "./category-form";
import { useMoliya } from "./context";
import { ActionGrid, CatBadge, Chip, DatePick, Expand, FieldLabel, INCOME_COLOR, MoneyInput, Segmented, SheetCard, TYPE_META, TextInput, catSolid, dayLabel, shiftDay, shortDate, useOnClose, type SheetState } from "./shared";

/** Ro'yxat qatori: izoh (yoki kategoriya), ostida kategoriya · kun. */
export function TxnRow({ t, onOpen, showCat = true }: { t: Transaction; onOpen: () => void; showCat?: boolean }) {
  const { catMap } = useMoliya();
  const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
  const inc = t.type === "INCOME";
  const catLabel = cat?.label ?? "Kategoriyasiz";
  return (
    <button type="button" onClick={onOpen} className="flex min-h-[60px] w-full items-center gap-3 px-3.5 py-2 text-left active:bg-hover">
      {showCat && <CatBadge cat={cat} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{t.note || catLabel}</span>
        <span className="block truncate text-[12.5px] text-faint">{showCat ? `${catLabel} · ${dayLabel(t.date)}` : dayLabel(t.date)}</span>
      </span>
      <span className="shrink-0 text-[15px] font-semibold tabular-nums" style={{ color: inc ? INCOME_COLOR : undefined }}>
        {inc ? "+" : "−"}{formatSom(t.amount)}
      </span>
    </button>
  );
}

export function TxnSheet({ state }: { state: SheetState }) {
  const { fin, catMap } = useMoliya();
  const t = state.id ? fin.transactions.find((x) => x.id === state.id) : undefined;
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useOnClose(state.open, () => setEditing(false));
  const cat = t?.categoryId ? catMap.get(t.categoryId) : undefined;
  const meta = TYPE_META[t?.type ?? "EXPENSE"];

  return (
    <>
      <MonoSheet open={state.open && !!t} onClose={state.hide} label={editing ? "Yozuvni tahrirlash" : "Yozuv"} dismissable={!editing}>
        {t && (
          <>
            <SheetCard kicker={`${meta.label} · ${dayLabel(t.date)}`} title={cat?.label ?? "Kategoriyasiz"} icon={<CatBadge cat={cat} size={48} />} onClose={state.hide}>
              <p className="mt-4 text-[32px] font-bold leading-none tracking-[-0.03em] tabular-nums" style={{ color: meta.color }}>
                {t.type === "INCOME" ? "+" : "−"}{formatSom(t.amount)}
                <span className="ml-1.5 text-[15px] font-medium tracking-normal text-faint">so&apos;m</span>
              </p>
              {t.note && <p className="mt-3 rounded-[16px] bg-subtle px-3.5 py-2.5 text-[15px] leading-snug">{t.note}</p>}
            </SheetCard>
            <ActionGrid
              items={[
                { icon: editing ? X : Pencil, label: editing ? "Yopish" : "Tahrirlash", onClick: () => setEditing((v) => !v), tone: editing ? "active" : undefined },
                { icon: Trash2, label: "O'chirish", onClick: () => setConfirm(true), tone: "danger" },
              ]}
            />
            <Expand open={editing}>
              <TxnForm key={t.id} txn={t} onSave={(p) => { fin.updateTransaction(t.id, p); setEditing(false); }} />
            </Expand>
          </>
        )}
      </MonoSheet>
      <ConfirmDialog
        open={confirm}
        title="Yozuvni o'chirish"
        description={t ? `"${t.note || cat?.label || meta.label} — ${formatSom(t.amount)} so'm" o'chiriladi. Bu amalni qaytarib bo'lmaydi.` : undefined}
        confirmLabel="O'chirish"
        destructive
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          const id = t?.id;
          setConfirm(false);
          state.hide();
          if (id) fin.removeTransaction(id);
        }}
      />
    </>
  );
}

type TxnPatch = { type: TransactionType; amount: number; categoryId: string | null; note: string; date: string };

function TxnForm({ txn, onSave }: { txn: Transaction; onSave: (p: TxnPatch) => void }) {
  const { fin } = useMoliya();
  const [type, setType] = useState<TransactionType>(txn.type);
  const [amount, setAmount] = useState(txn.amount);
  const [categoryId, setCategoryId] = useState<string | null>(txn.categoryId);
  const [date, setDate] = useState(txn.date);
  const [note, setNote] = useState(txn.note ?? "");
  const [creating, setCreating] = useState(false);
  const [picking, setPicking] = useState(false);
  // Ko'p ishlatilgan kategoriya oldinda.
  const usage = useMemo(() => {
    const u = new Map<string, number>();
    for (const x of fin.transactions) if (x.categoryId) u.set(x.categoryId, (u.get(x.categoryId) ?? 0) + 1);
    return u;
  }, [fin.transactions]);
  const cats = fin.categories.filter((c) => c.type === type).sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0));
  const today = dateKey();
  const yest = shiftDay(today, -1);
  const custom = date !== today && date !== yest;

  return (
    <div className="space-y-3 rounded-[24px] border border-border bg-surface p-3">
      <Segmented<TransactionType> value={type} onChange={(t) => { setType(t); setCategoryId(null); setCreating(false); }} options={[{ id: "EXPENSE", label: "Chiqim" }, { id: "INCOME", label: "Kirim" }]} />
      <MoneyInput value={amount} onChange={setAmount} />
      <div>
        <FieldLabel>Kategoriya</FieldLabel>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
          {cats.map((c) => {
            const on = categoryId === c.id;
            return (
              <button key={c.id} type="button" onClick={() => setCategoryId(on ? null : c.id)} className={cn("flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-semibold transition-colors", on ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-muted")}>
                {createElement(financeIcon(c.icon), { className: "size-4", style: on ? undefined : { color: catSolid(c.color) } })}
                {c.label}
              </button>
            );
          })}
          <button type="button" onClick={() => setCreating((v) => !v)} className={cn("flex h-10 shrink-0 items-center gap-1 rounded-full border border-dashed px-3.5 text-[14px] font-semibold", creating ? "border-foreground/40 text-foreground" : "border-border text-faint")}>
            <Plus className="size-4" /> Yangi
          </button>
        </div>
        <Expand open={creating}>
          <div className="pt-2">
            <CategoryForm
              type={type}
              inline
              onCancel={() => setCreating(false)}
              onSubmit={(c) => { const id = fin.addCategory({ type, label: c.label, icon: c.icon, color: c.color }); setCategoryId(id); setCreating(false); }}
            />
          </div>
        </Expand>
      </div>
      <div>
        <FieldLabel>Sana</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Chip on={date === today} onClick={() => setDate(today)}>Bugun</Chip>
          <Chip on={date === yest} onClick={() => setDate(yest)}>Kecha</Chip>
          <Chip on={custom} onClick={() => setPicking(true)} icon={CalendarDays}>{custom ? shortDate(date) : "Boshqa sana"}</Chip>
        </div>
      </div>
      <div>
        <FieldLabel>Izoh</FieldLabel>
        <TextInput value={note} onChange={setNote} placeholder="ixtiyoriy" />
      </div>
      <MonoSave disabled={amount <= 0} onClick={() => onSave({ type, amount, categoryId, date, note })}>Saqlash</MonoSave>
      <DatePick open={picking} label="Sana" value={date} onClose={() => setPicking(false)} onPick={setDate} />
    </div>
  );
}
