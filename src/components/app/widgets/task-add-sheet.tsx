"use client";

import { useRef, useState } from "react";
import { CalendarDays, Clock, Flag, SlidersHorizontal } from "lucide-react";
import type { Plan, PlanPriority } from "@/lib/types";
import { occupiedTimeSlots, startOfDay, toDateInputValue } from "@/lib/dates";
import { MonoHeader, MonoSave, MonoSheet, MonoTile } from "./mono-sheet";
import { DatePickerPopover } from "./date-picker-popover";
import { TimePickerPopover } from "./time-picker-popover";

/* Mobil: Bugun va Agenda uchun yangi task oynasi. Izoh, kichik vazifalar va
   eslatma — "Batafsil"da (TaskDetail). */

type CreateInput = { title: string; scope: "DAILY"; scheduledFor: string; time?: string; priority?: PlanPriority };

const PRIORITIES: { id: PlanPriority; label: string }[] = [
  { id: "HIGH", label: "Muhim" },
  { id: "MEDIUM", label: "O'rta" },
  { id: "LOW", label: "Past" },
];
const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateLabel(d: Date, today: Date) {
  const days = Math.round((startOfDay(d).getTime() - today.getTime()) / 86400000);
  if (days === 0) return "Bugun";
  if (days === 1) return "Ertaga";
  if (days === -1) return "Kecha";
  return `${d.getDate()}-${MONTHS[d.getMonth()]}`;
}

function Form({
  plans,
  defaultDate,
  placeholder,
  onClose,
  onCreate,
  onDetail,
}: {
  plans: Plan[];
  defaultDate: Date;
  placeholder: string;
  onClose: () => void;
  onCreate: (input: CreateInput) => void;
  onDetail: (draft: Plan) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<PlanPriority | null>(null);
  const [picker, setPicker] = useState<null | "date" | "time">(null);
  const [today] = useState(() => startOfDay(new Date()));
  const [now] = useState(() => new Date());
  const dateRef = useRef<HTMLButtonElement>(null);
  const timeRef = useRef<HTMLButtonElement>(null);

  const iso = toDateInputValue(date);
  const todayIso = toDateInputValue(today);
  const isToday = iso === todayIso;
  // TaskDetail bilan bir xil qoida: o'tgan sana/vaqtga saqlab bo'lmaydi.
  const isDatePast = iso < todayIso;
  const nowHm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const isTimePast = isToday && !!time && time < nowHm;
  const canSave = !!title.trim() && !isTimePast && !isDatePast;

  function cyclePriority() {
    const list = [null, ...PRIORITIES.map((p) => p.id)];
    setPriority(list[(list.indexOf(priority) + 1) % list.length]);
  }

  function save() {
    if (!canSave) return;
    onCreate({ title: title.trim(), scope: "DAILY", scheduledFor: iso, time: time || undefined, priority: priority ?? undefined });
    onClose();
  }

  function openDetail() {
    const t = title.trim();
    if (!t) return;
    onDetail({
      id: "__draft__", title: t, deferCount: 0, scope: "DAILY", scheduledFor: iso, time: time || undefined,
      priority: priority ?? undefined, status: "TODO", createdAt: new Date().toISOString(), order: 0,
    });
    onClose();
  }

  return (
    <>
      <MonoHeader label="Yangi task" value={title} onChange={setTitle} placeholder={placeholder} onEnter={save} onClose={onClose} />
      <div className="grid grid-cols-2 gap-2">
        <MonoTile icon={CalendarDays} label="Sana" value={dateLabel(date, today)} filled danger={isDatePast} buttonRef={dateRef} onClick={() => setPicker((p) => (p === "date" ? null : "date"))} />
        <MonoTile icon={Clock} label="Vaqt" value={time || undefined} filled={!!time} danger={isTimePast} buttonRef={timeRef} onClick={() => setPicker((p) => (p === "time" ? null : "time"))} />
        <MonoTile icon={Flag} label="Muhimlik" value={PRIORITIES.find((p) => p.id === priority)?.label} filled={!!priority} onClick={cyclePriority} />
        <MonoTile icon={SlidersHorizontal} label="Batafsil" value="Izoh, eslatma" disabled={!title.trim()} onClick={openDetail} className="[&>span:last-child]:text-[14.5px]" />
      </div>
      <MonoSave disabled={!canSave} onClick={save} />
      <DatePickerPopover
        open={picker === "date"}
        triggerRef={dateRef}
        today={today}
        selected={date}
        plans={plans}
        onSelect={(d) => { setDate(d); setPicker(null); }}
        onClose={() => setPicker(null)}
      />
      <TimePickerPopover
        open={picker === "time"}
        triggerRef={timeRef}
        value={time}
        onChange={setTime}
        onClear={() => setTime("")}
        onClose={() => setPicker(null)}
        disableBefore={isToday ? nowHm : undefined}
        occupiedSlots={occupiedTimeSlots(plans, iso)}
      />
    </>
  );
}

export function TaskAddSheet({
  open,
  onClose,
  ...form
}: {
  open: boolean;
  onClose: () => void;
  plans: Plan[];
  defaultDate: Date;
  placeholder: string;
  onCreate: (input: CreateInput) => void;
  onDetail: (draft: Plan) => void;
}) {
  return (
    <MonoSheet open={open} onClose={onClose} label="Yangi task">
      <Form {...form} onClose={onClose} />
    </MonoSheet>
  );
}
