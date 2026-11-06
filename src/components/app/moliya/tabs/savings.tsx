"use client";

/* Yig'im: maqsadlar ro'yxati (yetilganlari pastda yopiq), maqsad oynasi —
   hissa qo'shish/yechish, tarixni tahrirlash/o'chirish; maqsad formasi. */

import { createElement, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Minus, Pencil, Vault, Plus, Target, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinancialGoal, GoalContribution } from "@/lib/types";
import { listGoalContributions, removeGoalContribution, updateGoalContribution } from "@/lib/finance-store";
import { FINANCE_ICON_KEYS, financeIcon } from "@/lib/finance-icons";
import { dateKey, formatSom } from "@/lib/money";
import { daysBetween } from "@/lib/debt-reminders";
import { MonoHeader, MonoSave, MonoSheet } from "../../widgets/mono-sheet";
import { ConfirmDialog } from "../../widgets/confirm-dialog";
import { useMoliya } from "../context";
import { ActionGrid, Collapsible, DashedButton, DatePick, EXPENSE_COLOR, FieldLabel, INCOME_COLOR, List, MoneyInput, Ring, SectionLabel, SheetCard, TextInput, short, shortDate, useOnClose, type SheetState } from "../shared";

const isDone = (g: FinancialGoal) => g.targetAmount > 0 && g.savedAmount >= g.targetAmount;

function GoalIcon({ goal, className }: { goal: FinancialGoal; className?: string }) {
  return createElement(goal.icon ? financeIcon(goal.icon) : Target, { className, strokeWidth: 2 });
}

export function SavingsTab() {
  const { fin, openGoal, newGoal } = useMoliya();
  const sorted = useMemo(() => [...fin.goals].sort((a, b) => a.order - b.order), [fin.goals]);
  const active = sorted.filter((g) => !isDone(g));
  const done = sorted.filter(isDone);
  const saved = fin.goals.reduce((s, g) => s + g.savedAmount, 0);
  const target = fin.goals.reduce((s, g) => s + g.targetAmount, 0);

  if (sorted.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-subtle text-faint"><Vault className="size-6" /></span>
        <p className="mt-3 text-[17px] font-semibold">Hali yig&apos;im maqsadi yo&apos;q</p>
        <p className="mx-auto mt-1 max-w-[260px] text-[14px] leading-relaxed text-muted">Mashina, safar yoki zaxira — nimaga pul yig&apos;yapsiz?</p>
        <button type="button" onClick={newGoal} className="mx-auto mt-5 flex h-11 items-center gap-1.5 rounded-full bg-accent px-5 text-[14px] font-semibold text-accent-ink">
          <Plus className="size-4" strokeWidth={2.6} /> Maqsad qo&apos;shish
        </button>
      </div>
    );
  }
  return (
    <>
      <div className="flex items-center gap-4 rounded-[22px] border border-border bg-surface p-3.5">
        <Ring value={target ? saved / target : 0} size={60} stroke={6}>
          <span className="text-[13px] font-bold tabular-nums">{target ? Math.round((saved / target) * 100) : 0}%</span>
        </Ring>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-muted">Yig&apos;imga ajratilgan</p>
          <p className="text-[22px] font-bold leading-tight tracking-[-0.02em] tabular-nums">{formatSom(saved)} <span className="text-[13px] font-medium text-faint">so&apos;m</span></p>
          <p className="text-[12.5px] text-faint">{sorted.length} ta maqsad · jami {short(target)} so&apos;m</p>
        </div>
      </div>
      {active.length > 0 && (
        <>
          <SectionLabel aside={`${active.length} ta`}>Maqsadlar</SectionLabel>
          <List>{active.map((g) => <GoalRow key={g.id} goal={g} onOpen={() => openGoal(g.id)} />)}</List>
        </>
      )}
      <DashedButton onClick={newGoal}>Yangi maqsad</DashedButton>
      {done.length > 0 && (
        <Collapsible label="Yig'ilgan" count={done.length}>
          <List>{done.map((g) => <GoalRow key={g.id} goal={g} onOpen={() => openGoal(g.id)} />)}</List>
        </Collapsible>
      )}
    </>
  );
}

function GoalRow({ goal, onOpen }: { goal: FinancialGoal; onOpen: () => void }) {
  const pct = goal.targetAmount ? goal.savedAmount / goal.targetAmount : 0;
  const done = isDone(goal);
  return (
    <button type="button" onClick={onOpen} className="flex min-h-[68px] w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-hover">
      <Ring value={pct} size={44} stroke={4}>
        <GoalIcon goal={goal} className={cn("size-[18px]", done ? "text-foreground" : "text-muted")} />
      </Ring>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[15px] font-semibold", done && "text-muted")}>{goal.title}</span>
        <span className="block truncate text-[13px] tabular-nums text-muted">{formatSom(goal.savedAmount)} <span className="text-faint">/ {formatSom(goal.targetAmount)} so&apos;m</span></span>
        <span className="flex items-center gap-1 text-[12.5px] text-faint">
          {done ? <><Check className="size-3" strokeWidth={3} /> Yig&apos;ildi</> : goal.deadline ? <><CalendarDays className="size-3" /> {shortDate(goal.deadline)} gacha</> : "Muddatsiz"}
        </span>
      </span>
      <span className="shrink-0 text-[14px] font-semibold tabular-nums text-muted">{Math.round(pct * 100)}%</span>
    </button>
  );
}

export function GoalSheet({ state }: { state: SheetState }) {
  const { fin, editGoal } = useMoliya();
  const goal = state.id ? fin.goals.find((g) => g.id === state.id) : undefined;
  const [amount, setAmount] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [items, setItems] = useState<GoalContribution[] | null>(null);
  const [removing, setRemoving] = useState<GoalContribution | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [ver, setVer] = useState(0);
  useOnClose(state.open, () => { setAmount(0); setEditId(null); setItems(null); setWarn(null); });

  // Tarix serverdan o'qiladi; maqsad yangilansa (hissa/tahrir) — qayta o'qiymiz.
  const goalId = goal?.id;
  const savedAmount = goal?.savedAmount;
  useEffect(() => {
    if (!state.open || !goalId) return;
    let alive = true;
    listGoalContributions(goalId).then((rows) => { if (alive) setItems(rows); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [state.open, goalId, savedAmount, ver]);
  const reload = () => setVer((v) => v + 1);

  if (!goal) return <MonoSheet open={false} onClose={state.hide} label="Maqsad">{null}</MonoSheet>;
  const pct = goal.targetAmount ? goal.savedAmount / goal.targetAmount : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
  const days = goal.deadline ? daysBetween(dateKey(), goal.deadline) : 0;

  function apply(sign: 1 | -1) {
    if (!goal || amount <= 0) return;
    if (sign < 0 && amount > goal.savedAmount) { setWarn("Yig'ilgan summadan ko'p yechib bo'lmaydi"); return; }
    fin.contributeFinancialGoal(goal.id, sign * amount, dateKey());
    setAmount(0);
    setWarn(null);
  }

  return (
    <>
      <MonoSheet open={state.open} onClose={state.hide} label={goal.title} dismissable={!editId}>
        <SheetCard
          kicker={goal.deadline ? `Muddat: ${shortDate(goal.deadline)}${days > 0 ? ` · ${days} kun qoldi` : ""}` : "Muddatsiz maqsad"}
          title={goal.title}
          icon={<span className="grid size-12 shrink-0 place-items-center rounded-[16px] bg-subtle"><GoalIcon goal={goal} className="size-6" /></span>}
          onClose={state.hide}
        >
          <p className="mt-4 text-[28px] font-bold leading-none tracking-[-0.03em] tabular-nums">
            {formatSom(goal.savedAmount)}<span className="ml-1.5 text-[14px] font-medium tracking-normal text-faint">/ {formatSom(goal.targetAmount)} so&apos;m</span>
          </p>
          <span className="mt-3 block h-2 overflow-hidden rounded-full bg-subtle">
            <span className="block h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.min(100, pct * 100)}%`, background: pct >= 1 ? INCOME_COLOR : "var(--foreground)" }} />
          </span>
          <p className="mt-1.5 flex justify-between text-[13px]">
            <span className="text-muted">{pct >= 1 ? "Maqsadga yetdingiz" : `Yana ${formatSom(remaining)} so'm`}</span>
            <span className="font-semibold tabular-nums">{Math.round(pct * 100)}%</span>
          </p>
        </SheetCard>

        <div className="rounded-[24px] border border-border bg-surface p-3">
          <FieldLabel>Hissa qo&apos;shish yoki yechish</FieldLabel>
          <MoneyInput value={amount} onChange={(v) => { setAmount(v); setWarn(null); }} placeholder="Summa" />
          {warn && <p className="mt-1.5 px-1 text-[12.5px] font-medium text-danger">{warn}</p>}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" disabled={amount <= 0} onClick={() => apply(-1)} className="flex h-12 items-center justify-center gap-1.5 rounded-[18px] border border-border text-[15px] font-semibold disabled:opacity-35"><Minus className="size-4" /> Yechish</button>
            <button type="button" disabled={amount <= 0} onClick={() => apply(1)} className="flex h-12 items-center justify-center gap-1.5 rounded-[18px] bg-accent text-[15px] font-semibold text-accent-ink disabled:opacity-35"><Plus className="size-4" strokeWidth={2.6} /> Qo&apos;shish</button>
          </div>
        </div>

        <ActionGrid
          items={[
            { icon: Pencil, label: "Tahrirlash", onClick: () => { state.hide(); editGoal(goal.id); } },
            { icon: Trash2, label: "O'chirish", onClick: () => setConfirm(true), tone: "danger" },
          ]}
        />

        <div className="flex items-center justify-between px-2 pt-2">
          <p className="text-[13px] font-semibold text-muted">Hissalar tarixi</p>
          {items && items.length > 0 && <span className="text-[12.5px] tabular-nums text-faint">{items.length} ta</span>}
        </div>
        {items === null ? (
          <p className="rounded-[22px] border border-border bg-surface py-8 text-center text-[14px] text-faint">Yuklanmoqda…</p>
        ) : items.length === 0 ? (
          <p className="rounded-[22px] border border-border bg-surface py-8 text-center text-[14px] text-faint">Hali hissalar yo&apos;q</p>
        ) : (
          <List>
            {items.map((c) => editId === c.id ? (
              <ContributionEdit key={c.id} c={c} onCancel={() => setEditId(null)} onSaved={() => { setEditId(null); reload(); }} />
            ) : (
              <div key={c.id} className="flex min-h-[60px] items-center gap-1 pl-1.5 pr-3.5">
                <button type="button" onClick={() => setRemoving(c)} aria-label="Hissani o'chirish" className="grid size-10 shrink-0 place-items-center rounded-full text-faint active:bg-hover"><X className="size-4" /></button>
                <button type="button" onClick={() => setEditId(c.id)} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold tabular-nums" style={{ color: c.amount < 0 ? EXPENSE_COLOR : undefined }}>{c.amount < 0 ? "−" : "+"}{formatSom(Math.abs(c.amount))} so&apos;m</span>
                    <span className="block truncate text-[12.5px] text-faint">{shortDate(c.date)}{c.note ? ` · ${c.note}` : ""}</span>
                  </span>
                  <Pencil className="size-4 shrink-0 text-faint" />
                </button>
              </div>
            ))}
          </List>
        )}
      </MonoSheet>
      <ConfirmDialog
        open={confirm}
        title="Maqsadni o'chirish"
        description={`"${goal.title}" o'chiriladi. Bu amalni qaytarib bo'lmaydi.`}
        confirmLabel="O'chirish"
        destructive
        onClose={() => setConfirm(false)}
        onConfirm={() => { const id = goal.id; setConfirm(false); state.hide(); fin.removeFinancialGoal(id); }}
      />
      <ConfirmDialog
        open={!!removing}
        title="Yozuvni o'chirish"
        description={removing ? `"${removing.amount < 0 ? "-" : "+"}${formatSom(Math.abs(removing.amount))} so'm" o'chiriladi. Bu amalni qaytarib bo'lmaydi.` : undefined}
        confirmLabel="O'chirish"
        destructive
        onClose={() => setRemoving(null)}
        onConfirm={() => { const c = removing; setRemoving(null); if (c) void removeGoalContribution(c.id).then(reload, reload); }}
      />
    </>
  );
}

function ContributionEdit({ c, onCancel, onSaved }: { c: GoalContribution; onCancel: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(Math.abs(c.amount));
  const [date, setDate] = useState(c.date);
  const [note, setNote] = useState(c.note ?? "");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (amount <= 0) return;
    setBusy(true);
    // Ishora (qo'shildi/yechildi) o'zgarmaydi.
    await updateGoalContribution(c.id, { amount: c.amount < 0 ? -amount : amount, date, note: note.trim() || undefined }).catch(() => {});
    setBusy(false);
    onSaved();
  }
  return (
    <div className="space-y-2 p-3">
      <p className="px-1 text-[13px] font-semibold text-muted">{c.amount < 0 ? "Yechilgan summa" : "Qo'shilgan summa"}</p>
      <MoneyInput value={amount} onChange={setAmount} autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setPicking(true)} className="flex h-12 items-center gap-2 rounded-[18px] border border-border px-3.5 text-[15px] font-semibold"><CalendarDays className="size-4 text-muted" />{shortDate(date)}</button>
        <TextInput value={note} onChange={setNote} placeholder="Izoh" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="h-12 rounded-[18px] bg-subtle text-[15px] font-semibold">Bekor</button>
        <button type="button" disabled={busy || amount <= 0} onClick={() => void save()} className="h-12 rounded-[18px] bg-accent text-[15px] font-semibold text-accent-ink disabled:opacity-35">Saqlash</button>
      </div>
      <DatePick open={picking} label="Sana" value={date} max={dateKey()} onClose={() => setPicking(false)} onPick={setDate} />
    </div>
  );
}

export function GoalFormSheet({ state, onClose }: { state: { id?: string } | null; onClose: () => void }) {
  return (
    <MonoSheet open={!!state} onClose={onClose} label={state?.id ? "Maqsadni tahrirlash" : "Yangi maqsad"} dismissable={false}>
      {state && <GoalForm key={state.id ?? "new"} id={state.id} onClose={onClose} />}
    </MonoSheet>
  );
}

function GoalForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const { fin } = useMoliya();
  const goal = id ? fin.goals.find((g) => g.id === id) : undefined;
  const [title, setTitle] = useState(goal?.title ?? "");
  const [target, setTarget] = useState(goal?.targetAmount ?? 0);
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [icon, setIcon] = useState<string | null>(goal?.icon ?? null);
  const [picking, setPicking] = useState(false);
  const [allIcons, setAllIcons] = useState(false);
  const valid = title.trim().length > 0 && target > 0;
  const head = FINANCE_ICON_KEYS.slice(0, 14);
  const icons = allIcons ? FINANCE_ICON_KEYS : !icon || head.includes(icon) ? head : [icon, ...head.slice(0, 13)];

  function save() {
    if (!valid) return;
    const payload = { title: title.trim(), targetAmount: target, icon: icon ?? null, deadline: deadline || null };
    if (goal) fin.updateFinancialGoal(goal.id, payload);
    else fin.addFinancialGoal(payload);
    onClose();
  }

  return (
    <>
      <MonoHeader label={goal ? "Maqsadni tahrirlash" : "Yangi yig'im maqsadi"} value={title} onChange={setTitle} placeholder="Nimaga yig'yapsiz? (masalan: Mashina)" onClose={onClose} />
      <div className="space-y-3 rounded-[24px] border border-border bg-surface p-3">
        <div>
          <FieldLabel>Maqsad summa</FieldLabel>
          <MoneyInput value={target} onChange={setTarget} />
        </div>
        <div>
          <FieldLabel>Muddat (ixtiyoriy)</FieldLabel>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPicking(true)} className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-[18px] border border-border px-3.5 text-[15px] font-semibold">
              <CalendarDays className="size-4 shrink-0 text-muted" />
              <span className={cn("truncate", !deadline && "font-medium text-faint")}>{deadline ? shortDate(deadline) : "Sana tanlash"}</span>
            </button>
            {deadline && (
              <button type="button" onClick={() => setDeadline("")} aria-label="Muddatni olib tashlash" className="grid size-12 shrink-0 place-items-center rounded-full bg-subtle"><X className="size-4" /></button>
            )}
          </div>
        </div>
        <div>
          <FieldLabel aside={<button type="button" onClick={() => setAllIcons((v) => !v)} className="h-8 px-1 text-[12.5px] font-semibold text-muted">{allIcons ? "Kamroq" : "Hammasi"}</button>}>Belgi (ixtiyoriy)</FieldLabel>
          <div className="grid grid-cols-7 gap-1.5">
            {icons.map((k) => {
              const on = icon === k;
              return (
                <button key={k} type="button" onClick={() => setIcon(on ? null : k)} aria-label={k} aria-pressed={on} className={cn("grid aspect-square place-items-center rounded-[14px] border transition-colors", on ? "border-accent bg-accent text-accent-ink" : "border-border text-faint")}>
                  {createElement(financeIcon(k), { className: "size-[18px]" })}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <MonoSave disabled={!valid} onClick={save}>{goal ? "Saqlash" : undefined}</MonoSave>
      <DatePick open={picking} label="Muddat" value={deadline || null} min={dateKey()} onClose={() => setPicking(false)} onPick={setDeadline} />
    </>
  );
}
