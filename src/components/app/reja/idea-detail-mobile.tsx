"use client";

/* Mobil: reja tafsiloti — Bajarildi · Tahrirlash · O'chirish, ichki vazifalar,
   izoh, muhimlik, toifa va kunga o'tkazish (sana/vaqt/davomiylik). O'zgarishlar
   darhol saqlanadi; izoh esa yozib bo'lingach (blur/yopilganda). */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, CalendarDays, ChevronDown, Clock, FileText, Flag, ListChecks, Plus, Tag, Timer, X } from "lucide-react";
import type { Category, Idea, PlanPriority, Subtask } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CATEGORY_PALETTE } from "@/lib/category-palette";
import { formatUzDate, fromDateInputValue, occupiedTimeSlots, startOfDay, toDateInputValue } from "@/lib/dates";
import { usePlans } from "@/lib/plans-store";
import { MonoActions, MonoBlock, MonoExpand, MonoSave, MonoSheet, MonoTile } from "../widgets/mono-sheet";
import { PickerModal } from "../widgets/picker-modal";
import { BigMonth } from "../widgets/big-month";
import { TimePicker } from "../widgets/time-picker";
import { DURATION_PRESETS } from "../widgets/duration-picker";
import { makeSubtaskId } from "../widgets/subtask-ui";
import { Expand, SheetHeadCard, Tick } from "../widgets/mobile-bits";
import { relAgo, shortDay, toDay, durLabel } from "./reja-format";

export const PRIORITIES: { value: PlanPriority; label: string; dot: string }[] = [
  { value: "HIGH", label: "Yuqori", dot: "bg-priority-high" },
  { value: "MEDIUM", label: "O'rta", dot: "bg-priority-medium" },
  { value: "LOW", label: "Past", dot: "bg-priority-low" },
];

function nowHHMM() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

export function IdeaDetailMobile({ idea, categories, onClose, onUpdate, onToggleDone, onDelete, onScheduled }: {
  idea: Idea | null;
  categories: Category[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Idea>) => void;
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
  onScheduled: (label: string) => void;
}) {
  return (
    <MonoSheet open={!!idea} onClose={onClose} label={idea?.title ?? "Reja"}>
      {idea && (
        <Body
          key={idea.id}
          idea={idea}
          categories={categories}
          onClose={onClose}
          onPatch={(p) => onUpdate(idea.id, p)}
          onToggleDone={() => onToggleDone(idea.id)}
          onDelete={() => onDelete(idea.id)}
          onScheduled={onScheduled}
        />
      )}
    </MonoSheet>
  );
}

function Body({ idea, categories, onClose, onPatch, onToggleDone, onDelete, onScheduled }: {
  idea: Idea; categories: Category[]; onClose: () => void; onPatch: (p: Partial<Idea>) => void; onToggleDone: () => void; onDelete: () => void; onScheduled: (label: string) => void;
}) {
  const { plans } = usePlans();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(idea.title);
  const [notes, setNotes] = useState(idea.notes ?? "");
  const [notesOpen, setNotesOpen] = useState(!!idea.notes?.trim());
  const [date, setDate] = useState(idea.scheduledFor ?? "");
  const [time, setTime] = useState(idea.time ?? "");
  const [duration, setDuration] = useState<number | undefined>(idea.duration);
  const [picker, setPicker] = useState<"date" | "time" | "duration" | null>(null);

  const today = useMemo(() => startOfDay(), []);
  const todayIso = toDateInputValue(today);
  const isToday = date === todayIso;
  const timePast = isToday && !!time && time < nowHHMM();
  const cat = categories.find((c) => c.id === idea.categoryId);
  const subtasks = idea.subtasks ?? [];
  const subDone = subtasks.filter((s) => s.done).length;

  // Izoh: yopilganda ham saqlansin.
  const notesRef = useRef(notes);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => () => {
    const v = notesRef.current.trim();
    if (v !== (idea.notes ?? "").trim()) onPatch({ notes: v || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function saveNotes() {
    const v = notes.trim();
    if (v !== (idea.notes ?? "").trim()) onPatch({ notes: v || undefined });
  }

  function saveTitle() {
    const v = title.trim();
    if (v && v !== idea.title) onPatch({ title: v });
    setEditing(false);
  }
  function setSubs(fn: (s: Subtask[]) => Subtask[]) { onPatch({ subtasks: fn(subtasks) }); }
  function schedule() {
    if (!date || timePast) return;
    onPatch({ scheduledFor: date, time: time || undefined, duration });
    onScheduled(`${toDay(date, today)} o'tkazildi${time ? ` · ${time}` : ""}`);
  }

  return (
    <>
      <SheetHeadCard
        kicker={<>{cat && <span className="size-2 shrink-0 rounded-full" style={{ background: CATEGORY_PALETTE[cat.color].oklch }} />}{cat?.label ?? "Toifasiz"} · {relAgo(idea.createdAt)} yozilgan</>}
        title={idea.title}
        done={idea.done}
        onClose={onClose}
      >
        {subtasks.length > 0 && (
          <span className="mt-3 flex gap-1">
            {subtasks.map((s) => <span key={s.id} className={cn("h-1 flex-1 rounded-full transition-colors", s.done ? "bg-foreground" : "bg-subtle")} />)}
          </span>
        )}
      </SheetHeadCard>

      <MonoActions done={idea.done} onToggleDone={onToggleDone} editing={editing} onToggleEdit={() => { setTitle(idea.title); setEditing((v) => !v); }} onDelete={onDelete} />
      <MonoExpand open={editing}>
        <div className="rounded-[22px] border border-border bg-surface p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); }} enterKeyHint="done" placeholder="Reja nomi" className="w-full bg-transparent text-[17px] font-semibold outline-none placeholder:text-faint" />
        </div>
        <MonoSave disabled={!title.trim()} onClick={saveTitle}>Saqlash</MonoSave>
      </MonoExpand>

      {/* Ichki vazifalar: × chapda, matn, belgi o'ngda */}
      <MonoBlock icon={ListChecks} label="Ichki vazifalar" aside={subtasks.length ? <span className="tabular-nums opacity-60">{subDone}/{subtasks.length}</span> : undefined}>
        <AnimatePresence initial={false}>
          {subtasks.map((s) => (
            <motion.div key={s.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.16 }} className="overflow-hidden">
              <SubRow
                sub={s}
                onToggle={() => setSubs((arr) => arr.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
                onRemove={() => setSubs((arr) => arr.filter((x) => x.id !== s.id))}
                onRename={(v) => setSubs((arr) => arr.map((x) => (x.id === s.id ? { ...x, title: v } : x)))}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        <AddSub onAdd={(v) => setSubs((arr) => [...arr, { id: makeSubtaskId(), title: v, done: false }])} />
      </MonoBlock>

      {/* Izoh */}
      <div className="rounded-[22px] border border-border bg-surface">
        <button type="button" onClick={() => setNotesOpen((v) => !v)} aria-expanded={notesOpen} className="flex h-12 w-full items-center justify-between px-3 text-[11.5px] font-semibold">
          <span className="flex items-center gap-1 opacity-75"><FileText className="size-3.5" /> Izoh</span>
          <span className="flex items-center gap-1.5 text-faint">
            {!notesOpen && notes.trim() && <span className="max-w-[170px] truncate text-[12.5px] font-medium">{notes}</span>}
            <ChevronDown className={cn("size-4 transition-transform", notesOpen && "rotate-180")} />
          </span>
        </button>
        <Expand open={notesOpen}>
          <div className="px-3 pb-3">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} rows={3} placeholder="Qo'shimcha tafsilot..." className="w-full resize-none rounded-[16px] bg-subtle/60 px-3 py-2.5 text-[16px] leading-relaxed outline-none placeholder:text-faint" />
          </div>
        </Expand>
      </div>

      <MonoBlock icon={Flag} label="Muhimlik">
        <div className="grid grid-cols-3 gap-1.5">
          {PRIORITIES.map((p) => {
            const on = idea.priority === p.value;
            return (
              <button key={p.value} type="button" onClick={() => onPatch({ priority: on ? undefined : p.value })} className={cn("flex h-11 items-center justify-center gap-2 rounded-[14px] text-[14px] font-semibold transition-colors", on ? "bg-accent text-accent-ink" : "bg-subtle text-muted")}>
                <span className={cn("size-2 rounded-full", p.dot)} /> {p.label}
              </button>
            );
          })}
        </div>
      </MonoBlock>

      <MonoBlock icon={Tag} label="Toifa">
        <CategoryChips categories={categories} value={idea.categoryId} onChange={(id) => onPatch({ categoryId: id })} />
      </MonoBlock>

      {!idea.done && (
        <MonoBlock icon={CalendarCheck} label="Kunga o'tkazish" aside={date ? <button type="button" onClick={() => { setDate(""); setTime(""); setDuration(undefined); }} className="h-7 rounded-full px-2 text-faint">Tozalash</button> : undefined}>
          <div className="grid grid-cols-3 gap-1.5">
            <MonoTile icon={CalendarDays} label="Sana" value={date ? shortDay(date, today) : undefined} filled={!!date} onClick={() => setPicker("date")} />
            <MonoTile icon={Clock} label="Vaqt" value={date ? time || undefined : undefined} filled={!!time} danger={timePast} onClick={() => setPicker(date ? "time" : "date")} />
            <MonoTile icon={Timer} label="Davomiylik" value={duration ? durLabel(duration) : undefined} filled={!!duration} onClick={() => setPicker("duration")} />
          </div>
          <p className="mt-2.5 px-0.5 text-[12.5px] leading-relaxed text-faint">
            {date ? `${formatUzDate(fromDateInputValue(date))} — reja shu kunga o'tadi va Bugun, Agenda, Kalendarda ko'rinadi.` : "Sana qo'yilsa, reja ro'yxatdan chiqib, o'sha kunning vazifasiga aylanadi."}
          </p>
          {date && (
            <button type="button" disabled={timePast} onClick={schedule} className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-[22px] bg-accent text-[15.5px] font-bold text-accent-ink disabled:bg-subtle disabled:text-faint">
              <CalendarCheck className="size-5" /> {timePast ? "Vaqt o'tib ketgan" : `${toDay(date, today)} o'tkazish`}
            </button>
          )}
        </MonoBlock>
      )}

      <PickerModal open={picker === "date"} onClose={() => setPicker(null)} label="Sana">
        <BigMonth today={today} selected={date ? fromDateInputValue(date) : null} min={todayIso} onSelect={(d) => { setDate(toDateInputValue(d)); setPicker(null); }} />
      </PickerModal>
      <PickerModal open={picker === "time"} onClose={() => setPicker(null)} label="Vaqt">
        <TimePicker
          large
          value={time}
          onChange={(v) => { setTime(v); setPicker(null); }}
          onClear={() => { setTime(""); setPicker(null); }}
          disableBefore={isToday ? nowHHMM() : undefined}
          occupiedSlots={date ? occupiedTimeSlots(plans, date, idea.id) : []}
        />
      </PickerModal>
      <PickerModal open={picker === "duration"} onClose={() => setPicker(null)} label="Davomiylik">
        <DurationGrid value={duration} onChange={(v) => { setDuration(v); setPicker(null); }} />
      </PickerModal>
    </>
  );
}

export function CategoryChips({ categories, value, onChange }: { categories: Category[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((c) => {
        const on = c.id === value;
        return (
          <button key={c.id} type="button" onClick={() => onChange(c.id)} className={cn("inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[14px] font-semibold transition-colors", on ? "bg-accent text-accent-ink" : "bg-subtle text-muted")}>
            <span className="size-2 rounded-full" style={{ background: CATEGORY_PALETTE[c.color].oklch, boxShadow: on ? "0 0 0 1.5px var(--accent-ink)" : undefined }} />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

function SubRow({ sub, onToggle, onRemove, onRename }: { sub: Subtask; onToggle: () => void; onRemove: () => void; onRename: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(sub.title);
  function commit() {
    setEditing(false);
    const n = v.trim();
    if (n && n !== sub.title) onRename(n);
    else setV(sub.title);
  }
  return (
    <div className="flex min-h-11 items-center gap-1.5">
      <button type="button" onClick={onRemove} aria-label="Ichki vazifani o'chirish" className="-ml-1.5 grid size-9 shrink-0 place-items-center rounded-full text-faint active:bg-hover">
        <X className="size-4" />
      </button>
      {editing ? (
        <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} enterKeyHint="done" className="min-w-0 flex-1 bg-transparent text-[16px] outline-none" />
      ) : (
        <button type="button" onClick={() => setEditing(true)} className={cn("min-w-0 flex-1 truncate py-2 text-left text-[15px]", sub.done && "text-faint line-through decoration-faint/60")}>{sub.title}</button>
      )}
      <Tick on={sub.done} onClick={onToggle} size={24} />
    </div>
  );
}

/* Enter'dan keyin fokus qoladi — ketma-ket yozish uchun. */
function AddSub({ onAdd }: { onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  function add() { if (!v.trim()) return; onAdd(v.trim()); setV(""); }
  return (
    <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex min-h-11 items-center gap-2.5">
      <Plus className="size-5 shrink-0 text-faint" strokeWidth={1.8} />
      <input value={v} onChange={(e) => setV(e.target.value)} enterKeyHint="send" placeholder="Ichki vazifa qo'shish" className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint" />
      {v.trim() && <button type="submit" className="h-8 shrink-0 rounded-full bg-accent px-3.5 text-[13px] font-semibold text-accent-ink">Qo&apos;shish</button>}
    </form>
  );
}

function DurationGrid({ value, onChange }: { value: number | undefined; onChange: (v: number | undefined) => void }) {
  const isCustom = value != null && !DURATION_PRESETS.includes(value);
  const [custom, setCustom] = useState(isCustom ? String(value) : "");
  const n = parseInt(custom, 10);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        {DURATION_PRESETS.map((d) => (
          <button key={d} type="button" onClick={() => onChange(value === d ? undefined : d)} className={cn("h-12 rounded-2xl text-[15px] font-semibold tabular-nums transition-colors", value === d ? "bg-accent text-accent-ink" : "bg-subtle/60 active:bg-hover")}>
            {durLabel(d)}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (n > 0) onChange(n); }} className={cn("flex h-12 items-center gap-2 rounded-2xl border pl-3.5 pr-1.5", isCustom ? "border-accent" : "border-dashed border-border-strong")}>
        <span className="text-[14px] text-muted">Boshqa:</span>
        <input inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="0" className="w-14 bg-transparent text-right font-mono text-[16px] tabular-nums outline-none placeholder:text-faint" />
        <span className="flex-1 text-[14px] text-muted">daqiqa</span>
        <button type="submit" disabled={!(n > 0)} className="h-9 rounded-xl bg-accent px-3.5 text-[13px] font-semibold text-accent-ink disabled:opacity-35">Tayyor</button>
      </form>
      {value != null && (
        <button type="button" onClick={() => onChange(undefined)} className="flex h-10 w-full items-center justify-center gap-1 rounded-full text-[13.5px] text-faint active:bg-hover"><X className="size-3.5" /> Tozalash</button>
      )}
    </div>
  );
}
