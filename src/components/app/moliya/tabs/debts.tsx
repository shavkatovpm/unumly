"use client";

/* Qarz: jami (har valyuta alohida), bugungi eslatmalar, Menga qarzdor /
   Men qarzdorman ro'yxati (hal qilinganlari pastda yopiq), qarz oynasi —
   qisman to'lov, to'liq yopish, eslatmani surish; qarz formasi. */

import { useMemo, useState } from "react";
import { BellRing, CalendarDays, Check, ChevronRight, Clock, Pencil, RotateCcw, Trash2, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Currency, Debt, DebtType } from "@/lib/types";
import { CURRENCIES, CURRENCY_LABEL, dateKey, formatMoney, formatSom } from "@/lib/money";
import { daysBetween, debtLeadOptions, debtRemindersForToday, shiftIso } from "@/lib/debt-reminders";
import { MonoHeader, MonoSave, MonoSheet } from "../../widgets/mono-sheet";
import { ConfirmDialog } from "../../widgets/confirm-dialog";
import { useMoliya } from "../context";
import { ActionGrid, Chip, Collapsible, DashedButton, DatePick, EXPENSE_COLOR, Expand, FieldLabel, INCOME_COLOR, List, MoneyInput, SectionLabel, Segmented, SheetCard, TextInput, shortDate, useOnClose, type SheetState } from "../shared";

const META: Record<DebtType, { label: string; was: string; color: string; pay: string; ask: string }> = {
  LENT: { label: "Menga qarzdor", was: "Menga qarzdor edi", color: INCOME_COLOR, pay: "Oldim", ask: "Qancha oldingiz?" },
  BORROWED: { label: "Men qarzdorman", was: "Qarzdor edim", color: EXPENSE_COLOR, pay: "Qaytardim", ask: "Qancha qaytardingiz?" },
};
function ArrowIcon({ type, className }: { type: DebtType; className?: string }) {
  // LENT — pul menga keladi (↙), BORROWED — mendan ketadi (↗).
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {type === "LENT" ? <><path d="M17 7 7 17" /><path d="M17 17H7V7" /></> : <><path d="M7 7h10v10" /><path d="M7 17 17 7" /></>}
    </svg>
  );
}

const outstanding = (d: Debt) => Math.max(0, d.amount - d.paidAmount);
const isOverdue = (d: Debt) => !d.settledAt && !!d.dueDate && d.dueDate < dateKey();
const tint = (color: string) => `color-mix(in oklch, ${color} 14%, transparent)`;

export function DebtsTab({ filter, onFilter }: { filter: DebtType; onFilter: (f: DebtType) => void }) {
  const { debtsApi, openDebt, newDebt } = useMoliya();
  const { debts } = debtsApi;
  const totals = (type: DebtType) =>
    CURRENCIES.map((c) => ({ currency: c, amount: debts.filter((d) => !d.settledAt && d.type === type && (d.currency ?? "UZS") === c).reduce((s, d) => s + outstanding(d), 0) })).filter((r) => r.amount > 0);
  const reminders = useMemo(() => debtRemindersForToday(debts, dateKey()), [debts]);
  const active = debts
    .filter((d) => !d.settledAt && d.type === filter)
    .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"));
  const settled = debts.filter((d) => d.settledAt && d.type === filter);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {(["LENT", "BORROWED"] as DebtType[]).map((t) => {
          const rows = totals(t);
          return (
            <div key={t} className="rounded-[20px] border border-border bg-surface p-3.5">
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
                <span className="grid size-5 place-items-center rounded-full text-white" style={{ background: META[t].color }}><ArrowIcon type={t} className="size-3" /></span>
                {META[t].label}
              </p>
              {rows.length === 0
                ? <p className="mt-1.5 text-[17px] font-bold text-faint">0 so&apos;m</p>
                : rows.map((r) => <p key={r.currency} className="mt-1 truncate text-[17px] font-bold leading-tight tabular-nums">{formatMoney(r.amount, r.currency)}</p>)}
            </div>
          );
        })}
      </div>

      {reminders.length > 0 && (
        <>
          <SectionLabel aside={`${reminders.length} ta`}>Eslatmalar</SectionLabel>
          <List>
            {reminders.map(({ debt: d, overdue, outstanding: left }) => (
              <button key={d.id} type="button" onClick={() => openDebt(d.id)} className="flex min-h-[60px] w-full items-center gap-3 px-3.5 py-2 text-left active:bg-hover">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", overdue ? "bg-danger-soft text-danger" : "bg-subtle text-foreground")}><BellRing className="size-[18px]" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{d.counterparty} · <span className="tabular-nums">{formatMoney(left, d.currency)}</span></span>
                  <span className={cn("block truncate text-[12.5px]", overdue ? "font-medium text-danger" : "text-faint")}>
                    {overdue ? `Muddati ${daysBetween(d.dueDate!, dateKey())} kun o'tdi` : `Muddat: ${shortDate(d.dueDate!)}`} · {d.type === "LENT" ? "olish" : "qaytarish"}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-faint" />
              </button>
            ))}
          </List>
        </>
      )}

      <div className="mt-4">
        <Segmented<DebtType> value={filter} onChange={onFilter} options={[{ id: "LENT", label: "Menga qarzdor" }, { id: "BORROWED", label: "Men qarzdorman" }]} />
      </div>
      {active.length === 0 && settled.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-subtle text-faint"><Users className="size-6" /></span>
          <p className="mt-3 text-[17px] font-semibold">{filter === "LENT" ? "Sizga qarzdorlar yo'q" : "Siz qarzdor emassiz"}</p>
          <p className="mx-auto mt-1 max-w-[260px] text-[14px] leading-relaxed text-muted">Qarz berganingiz yoki olganingizni yozib qo&apos;ying — muddatida eslatamiz.</p>
        </div>
      ) : active.length > 0 ? (
        <List className="mt-2.5">{active.map((d) => <DebtRow key={d.id} d={d} onOpen={() => openDebt(d.id)} />)}</List>
      ) : (
        <p className="mt-2.5 rounded-[22px] border border-border bg-surface py-6 text-center text-[14px] text-faint">Faol qarz yo&apos;q</p>
      )}
      <DashedButton onClick={newDebt}>Yangi qarz</DashedButton>
      {settled.length > 0 && (
        <Collapsible label="Hal qilingan" count={settled.length}>
          <List>{settled.map((d) => <DebtRow key={d.id} d={d} onOpen={() => openDebt(d.id)} />)}</List>
        </Collapsible>
      )}
    </>
  );
}

function DebtRow({ d, onOpen }: { d: Debt; onOpen: () => void }) {
  const meta = META[d.type];
  const overdue = isOverdue(d);
  if (d.settledAt) {
    return (
      <button type="button" onClick={onOpen} className="flex min-h-[60px] w-full items-center gap-3 px-3.5 py-2 text-left active:bg-hover">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-faint line-through decoration-faint/60">{d.counterparty}</span>
          <span className="block truncate text-[12.5px] text-faint">{meta.was} · {formatMoney(d.amount, d.currency)}</span>
        </span>
        <span className="grid size-[26px] shrink-0 place-items-center rounded-full border-2 border-accent bg-accent text-accent-ink"><Check className="size-3.5" strokeWidth={3.5} /></span>
      </button>
    );
  }
  const partial = d.paidAmount > 0;
  return (
    <button type="button" onClick={onOpen} className="block min-h-[64px] w-full px-3.5 py-2.5 text-left active:bg-hover">
      <span className="flex w-full items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: tint(meta.color), color: meta.color }}><ArrowIcon type={d.type} className="size-[18px]" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{d.counterparty}</span>
          <span className={cn("flex items-center gap-1 truncate text-[12.5px]", overdue ? "font-medium text-danger" : "text-faint")}>
            {d.dueDate ? <><CalendarDays className="size-3 shrink-0" />{overdue ? "Muddati o'tdi" : `${shortDate(d.dueDate)} gacha`}</> : "Muddatsiz"}
            {d.agendaReminder && d.dueDate && <BellRing className="ml-0.5 size-3 shrink-0" />}
            {d.note && <span className="truncate text-faint"> · {d.note}</span>}
          </span>
        </span>
        <span className="shrink-0 text-right tabular-nums">
          <span className="block text-[15px] font-semibold">{formatMoney(outstanding(d), d.currency)}</span>
          {partial && <span className="block text-[12px] text-faint">/ {formatMoney(d.amount, d.currency)}</span>}
        </span>
      </span>
      {partial && (
        <span className="mt-2 block pl-12">
          <span className="block h-1.5 overflow-hidden rounded-full bg-subtle"><span className="block h-full rounded-full" style={{ width: `${Math.min(100, (d.paidAmount / d.amount) * 100)}%`, background: meta.color }} /></span>
        </span>
      )}
    </button>
  );
}

const SNOOZE = [{ days: 1, label: "Ertaga" }, { days: 3, label: "3 kun" }, { days: 7, label: "1 hafta" }];
type ReminderState = "none" | "waiting" | "active" | "snoozed";
function reminderState(d: Debt): ReminderState {
  if (!d.agendaReminder || !d.dueDate || d.settledAt || outstanding(d) <= 0) return "none";
  const today = dateKey();
  if (today < shiftIso(d.dueDate, -(d.reminderLeadDays ?? 0))) return "waiting";
  if (d.snoozedUntil && today < d.snoozedUntil) return "snoozed";
  return "active";
}

export function DebtSheet({ state }: { state: SheetState }) {
  const { debtsApi, editDebt } = useMoliya();
  const d = state.id ? debtsApi.debts.find((x) => x.id === state.id) : undefined;
  const [amount, setAmount] = useState(0);
  const [confirm, setConfirm] = useState(false);
  useOnClose(state.open, () => setAmount(0));
  if (!d) return <MonoSheet open={false} onClose={state.hide} label="Qarz">{null}</MonoSheet>;
  const meta = META[d.type];
  const overdue = isOverdue(d);
  const rs = reminderState(d);
  const left = outstanding(d);

  function pay() {
    if (!d || amount <= 0) return;
    debtsApi.recordPayment(d.id, amount);
    setAmount(0);
  }

  return (
    <>
      <MonoSheet open={state.open} onClose={state.hide} label={d.counterparty}>
        <SheetCard
          kicker={d.settledAt ? `${meta.was} · hal qilingan` : meta.label}
          title={d.counterparty}
          icon={<span className="grid size-12 shrink-0 place-items-center rounded-full" style={{ background: tint(meta.color), color: meta.color }}><ArrowIcon type={d.type} className="size-6" /></span>}
          onClose={state.hide}
        >
          <p className={cn("mt-4 text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums", d.settledAt && "text-faint line-through decoration-faint/60")}>{formatMoney(d.settledAt ? d.amount : left, d.currency)}</p>
          {!d.settledAt && d.paidAmount > 0 && (
            <>
              <span className="mt-3 block h-2 overflow-hidden rounded-full bg-subtle"><span className="block h-full rounded-full transition-[width] duration-300" style={{ width: `${(d.paidAmount / d.amount) * 100}%`, background: meta.color }} /></span>
              <p className="mt-1.5 text-[13px] text-muted">Jami {formatMoney(d.amount, d.currency)} — {formatMoney(d.paidAmount, d.currency)} qaytarildi</p>
            </>
          )}
          {d.note && <p className="mt-3 rounded-[16px] bg-subtle px-3.5 py-2.5 text-[15px] leading-snug">{d.note}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Info icon={CalendarDays} label={d.type === "LENT" ? "Berilgan" : "Olingan"} value={d.issuedDate ? shortDate(d.issuedDate) : "—"} />
            <Info icon={Clock} label="Muddat" value={d.dueDate ? (overdue ? "O'tib ketdi" : shortDate(d.dueDate)) : "Muddatsiz"} danger={overdue} />
          </div>
        </SheetCard>

        {!d.settledAt && (
          <div className="rounded-[24px] border border-border bg-surface p-3">
            <FieldLabel>{meta.ask}</FieldLabel>
            <MoneyInput value={amount} onChange={(v) => setAmount(Math.min(v, left))} placeholder={`qoldi: ${formatSom(left)}`} suffix={CURRENCY_LABEL[d.currency]} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" disabled={amount <= 0} onClick={pay} className="flex h-12 items-center justify-center gap-1.5 rounded-[18px] border border-border text-[15px] font-semibold disabled:opacity-35"><Check className="size-4" strokeWidth={2.6} /> {meta.pay}</button>
              <button type="button" onClick={() => debtsApi.setSettled(d.id, true)} className="h-12 rounded-[18px] bg-accent text-[15px] font-semibold text-accent-ink">To&apos;liq yopildi</button>
            </div>
          </div>
        )}

        {!d.settledAt && d.dueDate && (
          <div className="rounded-[24px] border border-border bg-surface p-3.5">
            <p className="flex items-center gap-2 text-[15px] font-semibold"><BellRing className="size-4 text-muted" />
              {d.agendaReminder ? ((d.reminderLeadDays ?? 0) > 0 ? `Muddatdan ${d.reminderLeadDays} kun oldin eslatiladi` : "Muddat kuni eslatiladi") : "Eslatma o'chiq"}
            </p>
            {rs === "active" && (
              <>
                <p className="mt-1 text-[13px] text-muted">Eslatma Bugun ro&apos;yxatida turibdi. Keyinroqqa surish:</p>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {SNOOZE.map((o) => (
                    <button key={o.days} type="button" onClick={() => debtsApi.snoozeDebt(d.id, shiftIso(dateKey(), o.days))} className="h-10 rounded-full bg-subtle text-[14px] font-semibold">{o.label}</button>
                  ))}
                </div>
              </>
            )}
            {rs === "snoozed" && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[13px] text-muted">{shortDate(d.snoozedUntil!)} gacha surilgan</p>
                <button type="button" onClick={() => debtsApi.updateDebt(d.id, { snoozedUntil: null })} className="h-10 shrink-0 rounded-full bg-subtle px-4 text-[13px] font-semibold">Bekor qilish</button>
              </div>
            )}
            {rs === "waiting" && <p className="mt-1 text-[13px] text-muted">{shortDate(shiftIso(d.dueDate, -(d.reminderLeadDays ?? 0)))} kuni ertalab bot eslatma yuboradi.</p>}
          </div>
        )}

        <ActionGrid
          items={d.settledAt ? [
            { icon: RotateCcw, label: "Qayta ochish", onClick: () => debtsApi.setSettled(d.id, false) },
            { icon: Trash2, label: "O'chirish", onClick: () => setConfirm(true), tone: "danger" },
          ] : [
            { icon: Pencil, label: "Tahrirlash", onClick: () => { state.hide(); editDebt(d.id); } },
            { icon: Trash2, label: "O'chirish", onClick: () => setConfirm(true), tone: "danger" },
          ]}
        />
      </MonoSheet>
      <ConfirmDialog
        open={confirm}
        title="Qarzni o'chirish"
        description={`"${d.counterparty} — ${formatMoney(d.amount, d.currency)}" o'chiriladi. Bu amalni qaytarib bo'lmaydi.`}
        confirmLabel="O'chirish"
        destructive
        onClose={() => setConfirm(false)}
        onConfirm={() => { const id = d.id; setConfirm(false); state.hide(); debtsApi.removeDebt(id); }}
      />
    </>
  );
}

function Info({ icon: Icon, label, value, danger }: { icon: typeof Clock; label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-[16px] bg-subtle px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-muted"><Icon className="size-3.5" />{label}</p>
      <p className={cn("mt-0.5 truncate text-[15px] font-semibold", danger && "text-danger")}>{value}</p>
    </div>
  );
}

export function DebtFormSheet({ state, defaultType, onClose }: { state: { id?: string } | null; defaultType: DebtType; onClose: () => void }) {
  return (
    <MonoSheet open={!!state} onClose={onClose} label={state?.id ? "Qarzni tahrirlash" : "Yangi qarz"} dismissable={false}>
      {state && <DebtForm key={state.id ?? "new"} id={state.id} defaultType={defaultType} onClose={onClose} />}
    </MonoSheet>
  );
}

function DebtForm({ id, defaultType, onClose }: { id?: string; defaultType: DebtType; onClose: () => void }) {
  const { debtsApi } = useMoliya();
  const debt = id ? debtsApi.debts.find((d) => d.id === id) : undefined;
  const today = dateKey();
  const yest = shiftIso(today, -1);
  const [type, setType] = useState<DebtType>(debt?.type ?? defaultType);
  const [name, setName] = useState(debt?.counterparty ?? "");
  const [amount, setAmount] = useState(debt?.amount ?? 0);
  const [currency, setCurrency] = useState<Currency>(debt?.currency ?? "UZS");
  const [issued, setIssued] = useState(debt?.issuedDate || today);
  const [due, setDue] = useState(debt?.dueDate ?? "");
  const [note, setNote] = useState(debt?.note ?? "");
  const [reminder, setReminder] = useState(debt?.agendaReminder ?? false);
  const [lead, setLead] = useState(debt?.reminderLeadDays ?? 0);
  const [picker, setPicker] = useState<null | "issued" | "due">(null);
  const customIssued = issued !== today && issued !== yest;
  const leadOptions = debtLeadOptions(due ? daysBetween(today, due) : 0);
  const leadValid = leadOptions.some((o) => o.value === lead) ? lead : 0;
  const remindOn = !!due && reminder;
  const valid = name.trim().length > 0 && amount > 0;

  function save() {
    if (!valid) return;
    if (debt) {
      debtsApi.updateDebt(debt.id, { counterparty: name.trim(), amount, currency, issuedDate: issued, dueDate: due || null, note, agendaReminder: remindOn, reminderLeadDays: leadValid });
    } else {
      debtsApi.addDebt({ type, counterparty: name.trim(), amount, currency, issuedDate: issued, dueDate: due || null, note: note || undefined, agendaReminder: remindOn, reminderLeadDays: leadValid });
    }
    onClose();
  }

  return (
    <>
      <MonoHeader label={debt ? "Qarzni tahrirlash" : "Yangi qarz"} value={name} onChange={setName} placeholder={type === "BORROWED" ? "Kimdan oldim? (ism)" : "Kimga berdim? (ism)"} onClose={onClose} />
      {!debt && <Segmented<DebtType> value={type} onChange={setType} options={[{ id: "BORROWED", label: "Men oldim" }, { id: "LENT", label: "Men berdim" }]} />}
      <div className="space-y-3 rounded-[24px] border border-border bg-surface p-3">
        <div>
          <FieldLabel>Summa</FieldLabel>
          <MoneyInput
            value={amount}
            onChange={setAmount}
            right={
              <span className="flex shrink-0 gap-0.5 rounded-full bg-subtle p-1">
                {CURRENCIES.map((c) => (
                  <button key={c} type="button" onClick={() => setCurrency(c)} aria-pressed={currency === c} className={cn("h-8 min-w-[40px] rounded-full px-2 text-[13.5px] font-semibold transition-colors", currency === c ? "bg-accent text-accent-ink" : "text-muted")}>{CURRENCY_LABEL[c]}</button>
                ))}
              </span>
            }
          />
        </div>
        <div>
          <FieldLabel>{type === "BORROWED" ? "Qachon oldim" : "Qachon berdim"}</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <Chip on={issued === today} onClick={() => setIssued(today)}>Bugun</Chip>
            <Chip on={issued === yest} onClick={() => setIssued(yest)}>Kecha</Chip>
            <Chip on={customIssued} onClick={() => setPicker("issued")} icon={CalendarDays}>{customIssued ? shortDate(issued) : "Boshqa sana"}</Chip>
          </div>
        </div>
        <div>
          <FieldLabel>Muddat (ixtiyoriy)</FieldLabel>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPicker("due")} className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-[18px] border border-border px-3.5 text-[15px] font-semibold">
              <CalendarDays className="size-4 shrink-0 text-muted" />
              <span className={cn("truncate", !due && "font-medium text-faint")}>{due ? shortDate(due) : "Sana tanlash"}</span>
            </button>
            {due && <button type="button" onClick={() => setDue("")} aria-label="Muddatni olib tashlash" className="grid size-12 shrink-0 place-items-center rounded-full bg-subtle"><X className="size-4" /></button>}
          </div>
        </div>
        <Expand open={!!due}>
          <div className="rounded-[18px] bg-subtle/60 p-3">
            <button type="button" role="switch" aria-checked={reminder} onClick={() => setReminder((v) => !v)} className="flex min-h-10 w-full items-center justify-between">
              <span className="flex items-center gap-2 text-[15px] font-semibold"><BellRing className="size-4 text-muted" /> Eslatma yoqish</span>
              <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", reminder ? "bg-accent" : "bg-border-strong")}>
                <span className={cn("absolute top-1 size-5 rounded-full bg-background shadow transition-[left] duration-200", reminder ? "left-6" : "left-1")} />
              </span>
            </button>
            <Expand open={reminder}>
              <p className="mb-2 mt-3 text-[13px] text-muted">Qachon eslatilsin?</p>
              <div className="flex flex-wrap gap-2">
                {leadOptions.map((o) => <Chip key={o.value} on={leadValid === o.value} onClick={() => setLead(o.value)}>{o.label}</Chip>)}
              </div>
              <p className="mt-2.5 text-[12.5px] text-faint">{leadValid > 0 ? `Muddatdan ${leadValid} kun oldin ertalab bot eslatma yuboradi.` : "Muddat kuni ertalab bot eslatma yuboradi."}</p>
            </Expand>
          </div>
        </Expand>
        <div>
          <FieldLabel>Izoh</FieldLabel>
          <TextInput value={note} onChange={setNote} placeholder="ixtiyoriy" />
        </div>
      </div>
      <MonoSave disabled={!valid} onClick={save}>{debt ? "Saqlash" : undefined}</MonoSave>
      <DatePick open={picker === "issued"} label={type === "BORROWED" ? "Qachon oldim" : "Qachon berdim"} value={issued} max={today} onClose={() => setPicker(null)} onPick={setIssued} />
      <DatePick open={picker === "due"} label="Muddat" value={due || null} min={today} onClose={() => setPicker(null)} onPick={setDue} />
    </>
  );
}
