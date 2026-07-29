"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, X, Trash2, Clock, Flag, FileText, Calendar as CalendarIcon, Pencil, ListChecks, Tag } from "lucide-react";
import type { Plan, PlanPriority, Subtask } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRejaCategoryMap } from "@/lib/use-reja-category";
import {
  formatUzDate,
  fromDateInputValue,
  occupiedTimeSlots,
  startOfDay,
  toDateInputValue,
} from "@/lib/dates";
import {
  DEFAULT_LEAD_MIN,
  LEAD_MIN_OPTIONS,
  computeNotifyAt,
  formatLeadLabel,
  formatLeadOptionLabel,
  sanitizeLeadMin,
  type LeadMin,
} from "@/lib/notify-time";
import { getNotificationPrefs } from "@/lib/user-settings-actions";
import { Dialog } from "./dialog";
import { CollapseSection, SubtaskEditor, SubtaskViewList, makeSubtaskId } from "./subtask-ui";
import { TimePickerPopover } from "./time-picker-popover";
import { DatePickerPopover } from "./date-picker-popover";
import { DurationPicker } from "./duration-picker";

const PRIORITIES: { value: PlanPriority; label: string; dot: string; ring: string }[] = [
  { value: "HIGH",   label: "Yuqori", dot: "bg-priority-high",   ring: "ring-priority-high" },
  { value: "MEDIUM", label: "O'rta",  dot: "bg-priority-medium", ring: "ring-priority-medium" },
  { value: "LOW",    label: "Past",   dot: "bg-priority-low",    ring: "ring-priority-low" },
];


const PRIORITY_DISPLAY: Record<PlanPriority, { label: string; dot: string }> = {
  HIGH:   { label: "Yuqori", dot: "bg-priority-high" },
  MEDIUM: { label: "O'rta",  dot: "bg-priority-medium" },
  LOW:    { label: "Past",   dot: "bg-priority-low" },
};

/** True if the plan has any "detailed" data the user has filled in
 *  beyond the basics (title/date/time). Used to decide whether to open
 *  the dialog in read-only view mode or edit mode. */
function hasDetails(p: Plan): boolean {
  return (
    !!(p.notes && p.notes.trim()) ||
    (p.subtasks?.length ?? 0) > 0 ||
    p.duration != null ||
    p.priority != null ||
    p.notifyLeadMin != null
  );
}

export function TaskDetail({
  plan,
  plans,
  open,
  onClose,
  onUpdate,
  onRemove,
  draft = false,
  onCreate,
}: {
  plan: Plan | null;
  plans?: Plan[];
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Plan>) => void;
  onRemove: (id: string) => void;
  /** Yangi reja yaratish rejimi — plan store'ga faqat Saqlash bosilganda yoziladi */
  draft?: boolean;
  onCreate?: (input: Omit<Plan, "id" | "createdAt" | "order" | "status" | "deferCount">) => string;
}) {
  const rejaCategoryMap = useRejaCategoryMap();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSub, setNewSub] = useState("");
  // Form'dagi yig'iladigan sektsiyalar (izoh / ichki vazifalar)
  const [izohOpen, setIzohOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [priority, setPriority] = useState<PlanPriority>("LOW");
  const [leadMin, setLeadMin] = useState<LeadMin>(DEFAULT_LEAD_MIN);
  const [accountLead, setAccountLead] = useState<LeadMin>(DEFAULT_LEAD_MIN);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  // Mode resolution: `explicitMode` is set by Pencil / Bekor user actions.
  // When null, we derive the mode synchronously from the plan so the very
  // first render is already correct (avoids a one-frame keyboard pop).
  const [explicitMode, setExplicitMode] = useState<"view" | "edit" | null>(null);
  const timeBtnRef = useRef<HTMLButtonElement>(null);
  const dateBtnRef = useRef<HTMLButtonElement>(null);

  const today = useMemo(() => startOfDay(), []);
  const selectedDate = useMemo(
    () => (scheduledFor ? fromDateInputValue(scheduledFor) : today),
    [scheduledFor, today]
  );

  // Task vaqtigacha qancha daqiqa qolgani (lead presetlarini cheklash uchun).
  // null = vaqt belgilanmagan. Manfiy/0 = vaqt yetib kelgan/o'tgan.
  const availableMin = (() => {
    const dateIso = scheduledFor || plan?.scheduledFor;
    if (!time || !dateIso) return null;
    const at = computeNotifyAt(dateIso, time, 0);
    if (!at) return null;
    return Math.floor((at.getTime() - Date.now()) / 60_000);
  })();

  // Faqat vaqtga sig'adigan eng katta lead amal qiladi. Vaqt deyarli yo'q
  // bo'lsa (availableMin < 10) — faqat "O'z vaqtida" (0) qoladi, ya'ni eslatma
  // aynan belgilangan vaqtda ("vaqt bo'ldi") keladi. Tanlangan lead saqlanadi
  // (vaqt uzaytirilsa qaytadi), lekin amaldagi qiymat shu cheklov bilan.
  const effectiveLead: LeadMin =
    availableMin == null
      ? leadMin
      : (([...LEAD_MIN_OPTIONS].reverse().find(
          (o) => o <= availableMin && o <= leadMin
        ) ?? 0) as LeadMin);

  useEffect(() => {
    if (!plan) return;
    setTitle(plan.title);
    setNotes(plan.notes ?? "");
    setScheduledFor(plan.scheduledFor ?? "");
    setTime(plan.time ?? "");
    setDuration(plan.duration);
    setPriority(plan.priority ?? "LOW");
    // Per-task override if set; otherwise show the account default
    // (refined async below once we know it).
    setLeadMin(
      plan.notifyLeadMin != null ? sanitizeLeadMin(plan.notifyLeadMin) : accountLead
    );
  }, [plan, accountLead]);

  // Resolve initial (derived) mode synchronously from the plan so the very
  // first render lands in the right mode — no keyboard flash, no UI flip.
  // Drafts and "skeletal" tasks (no notes/duration/priority/lead override)
  // start in edit; existing tasks with details start in view.
  const initialMode: "view" | "edit" = plan
    ? draft || !hasDetails(plan)
      ? "edit"
      : "view"
    : "edit";
  const mode: "view" | "edit" = explicitMode ?? initialMode;

  // Reset transient UI state whenever the dialog re-opens or the shown plan
  // changes — so each open computes mode fresh and no popovers stay open
  // across opens.
  const planId = plan?.id ?? null;
  useEffect(() => {
    setExplicitMode(null);
    setShowLeadPicker(false);
    setShowTimePicker(false);
    setShowDatePicker(false);
    // Ichki vazifalarni FAQAT shu yerda (dialog ochilganda / boshqa task'ga
    // o'tilganda) tiklaymiz — asosiy [plan] useEffect'da emas. Aks holda
    // view'da darhol persist qilingan toggle prop yangilanishi bilan ortga
    // qaytib qoladi (server javobigacha "revert" bo'ladi).
    setSubtasks(plan?.subtasks ?? []);
    setIzohOpen(!!(plan?.notes && plan.notes.trim()));
    setSubOpen((plan?.subtasks?.length ?? 0) > 0);
    setNewSub("");
  }, [open, planId, draft]);

  /** Restore inputs to the plan's current persisted values. */
  function revertToPlan() {
    if (!plan) return;
    setTitle(plan.title);
    setNotes(plan.notes ?? "");
    setSubtasks(plan.subtasks ?? []);
    setScheduledFor(plan.scheduledFor ?? "");
    setTime(plan.time ?? "");
    setDuration(plan.duration);
    setPriority(plan.priority ?? "LOW");
    setLeadMin(
      plan.notifyLeadMin != null ? sanitizeLeadMin(plan.notifyLeadMin) : accountLead
    );
  }

  function handleCancel() {
    if (initialMode === "view") {
      revertToPlan();
      setExplicitMode(null); // back to derived → view
    } else {
      onClose();
    }
  }

  // Pull the user's account-level default each time the dialog opens so the
  // displayed value stays in sync with Settings.
  useEffect(() => {
    if (!open) return;
    void getNotificationPrefs().then((prefs) => {
      if (!prefs) return;
      setAccountLead(sanitizeLeadMin(prefs.notifyLeadMin));
    });
  }, [open]);

  if (!plan) return null;

  const effectiveDateIso = scheduledFor || plan.scheduledFor;
  const isDateInPast = effectiveDateIso < toDateInputValue(today);

  // Max duration allowed without overlapping the next task on the same day
  let maxDuration: number | null = null;
  if (plans && time && /^\d{2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(":").map(Number);
    const startMin = h * 60 + m;
    let nextStart = Infinity;
    for (const p of plans) {
      if (p.id === plan.id) continue;
      if (p.scope !== "DAILY" || p.scheduledFor !== effectiveDateIso || !p.time) continue;
      if (p.status === "DONE") continue; // completed tasks free their slot
      const [ph, pm] = p.time.split(":").map(Number);
      const ps = ph * 60 + pm;
      if (ps >= startMin && ps < nextStart) nextStart = ps;
    }
    if (nextStart !== Infinity) maxDuration = nextStart - startMin;
  }

  // Is the edited time in the past?
  let isTimePast = false;
  if (time && /^\d{2}:\d{2}$/.test(time)) {
    const nowDate = new Date();
    const todayIso = toDateInputValue(today);
    if (effectiveDateIso < todayIso) {
      isTimePast = true;
    } else if (effectiveDateIso === todayIso) {
      const [h, m] = time.split(":").map(Number);
      const slotMin = h * 60 + m;
      const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();
      isTimePast = slotMin < nowMin;
    }
  }

  const blockSave = isTimePast || isDateInPast;

  // ─── Ichki vazifalar (sub-task) ───
  function addSubtask() {
    const t = newSub.trim();
    if (!t) return;
    setSubtasks((s) => [...s, { id: makeSubtaskId(), title: t, done: false }]);
    setNewSub("");
  }
  /** View rejimida darhol saqlanadi; edit/create'da faqat Saqlash bosilganda. */
  function toggleSub(id: string) {
    const next = subtasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x));
    setSubtasks(next);
    if (mode === "view" && plan) onUpdate(plan.id, { subtasks: next });
  }
  function removeSub(id: string) {
    setSubtasks((s) => s.filter((x) => x.id !== id));
  }
  function editSubTitle(id: string, t: string) {
    setSubtasks((s) => s.map((x) => (x.id === id ? { ...x, title: t } : x)));
  }

  function save() {
    if (blockSave) return;
    const safeDuration =
      duration !== undefined && maxDuration !== null && duration > maxDuration
        ? maxDuration > 0
          ? maxDuration
          : undefined
        : duration;
    // Persist per-task lead override only when it differs from the user's
    // account-level default. Otherwise leave NULL so the plan follows future
    // account-default changes.
    const leadToPersist: number | undefined =
      effectiveLead === accountLead ? undefined : effectiveLead;
    if (draft && onCreate) {
      // Draft rejimi — yangi reja yaratamiz
      onCreate({
        title: title.trim() || plan!.title || "Yangi reja",
        notes: notes.trim() || undefined,
        subtasks: subtasks.length ? subtasks : undefined,
        scope: plan!.scope,
        scheduledFor: effectiveDateIso,
        time: time || undefined,
        duration: safeDuration,
        priority,
        notifyLeadMin: leadToPersist,
      });
    } else {
      onUpdate(plan!.id, {
        title: title.trim() || plan!.title,
        notes: notes.trim() || undefined,
        subtasks,
        scheduledFor: effectiveDateIso,
        time: time || undefined,
        duration: safeDuration,
        priority,
        notifyLeadMin: leadToPersist,
      });
    }
    onClose();
  }

  function handleDelete() {
    onRemove(plan!.id);
    onClose();
  }

  const isView = mode === "view";

  return (
    <Dialog open={open} onClose={onClose} mobilePlacement="top" dismissable={false} className="max-w-lg sm:min-h-[60vh]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isView) return;
          save();
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            {draft ? "Yangi reja" : "Reja tafsilotlari"}
          </p>
          <div className="flex items-center gap-1">
            {isView && (
              <button
                type="button"
                onClick={() => setExplicitMode("edit")}
                aria-label="Tahrirlash"
                title="Tahrirlash"
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] text-muted transition-colors hover:bg-hover hover:text-foreground"
              >
                <Pencil className="size-3.5" />
                Tahrirlash
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Yopish"
              className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        {isView ? (
          <ViewBody
            title={title}
            notes={notes}
            subtasks={subtasks}
            onToggleSub={toggleSub}
            time={time}
            duration={duration}
            priority={priority}
            leadMin={effectiveLead}
            selectedDate={selectedDate}
            isDateInPast={isDateInPast}
            isTimePast={isTimePast}
            rejaCategory={plan ? rejaCategoryMap.get(plan.id) : undefined}
          />
        ) : (

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Reja nomi"
            className="w-full bg-transparent text-[18px] font-semibold tracking-[-0.01em] placeholder:text-faint focus:outline-none"
          />

          {/* Izoh — yig'iladigan */}
          <CollapseSection
            icon={<FileText className="size-3.5" />}
            title="Izoh"
            hint={notes.trim() ? "to'ldirilgan" : undefined}
            open={izohOpen}
            onToggle={() => setIzohOpen((v) => !v)}
          >
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Qo'shimcha tafsilot..."
              rows={3}
              className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-2 text-[13px] leading-relaxed placeholder:text-faint focus:border-border-strong focus:outline-none"
            />
          </CollapseSection>

          {/* Ichki vazifalar — yig'iladigan */}
          <CollapseSection
            icon={<ListChecks className="size-3.5" />}
            title="Ichki vazifalar"
            hint={subtasks.length ? `${subtasks.filter((s) => s.done).length}/${subtasks.length}` : undefined}
            open={subOpen}
            onToggle={() => setSubOpen((v) => !v)}
          >
            <SubtaskEditor
              subtasks={subtasks}
              newSub={newSub}
              setNewSub={setNewSub}
              onAdd={addSubtask}
              onToggle={toggleSub}
              onRemove={removeSub}
              onEditTitle={editSubTitle}
            />
          </CollapseSection>

          {/* Date */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3" />
                Sana
              </span>
              {isDateInPast && (
                <span className="font-mono text-[10px] normal-case tracking-normal text-danger">
                  o&apos;tgan
                </span>
              )}
            </label>
            <button
              ref={dateBtnRef}
              type="button"
              onClick={() => {
                setShowDatePicker((v) => !v);
                setShowTimePicker(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-[13px] transition-colors",
                isDateInPast
                  ? "border-danger bg-danger-soft text-danger"
                  : showDatePicker
                  ? "border-border-strong bg-subtle text-foreground"
                  : "border-border bg-background text-foreground hover:border-border-strong"
              )}
            >
              <span>{formatUzDate(selectedDate)}</span>
              <CalendarIcon className="size-3.5 text-faint" />
            </button>
          </div>

          {/* Time + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 flex items-center justify-between text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3" />
                  Vaqt
                </span>
                {isTimePast && (
                  <span className="font-mono text-[10px] normal-case tracking-normal text-danger">
                    o&apos;tgan
                  </span>
                )}
              </label>
              <button
                ref={timeBtnRef}
                type="button"
                onClick={() => {
                  setShowTimePicker((v) => !v);
                  setShowDatePicker(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 font-mono text-[13px] tabular-nums transition-colors",
                  isTimePast
                    ? "border-danger bg-danger-soft text-danger"
                    : showTimePicker
                    ? "border-border-strong bg-subtle text-foreground"
                    : "border-border bg-background text-foreground hover:border-border-strong"
                )}
              >
                <span>{time || "—"}</span>
                <Clock className="size-3.5 text-faint" />
              </button>
            </div>
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
                <span>Davomiyligi</span>
                {maxDuration !== null && (
                  <span className="font-mono text-[10px] normal-case tracking-normal text-faint">
                    max {maxDuration}m
                  </span>
                )}
              </label>
              <DurationPicker value={duration} onChange={setDuration} max={maxDuration} />
            </div>
          </div>

          {/* Eslatma vaqti — minimal inline pill (always visible); click
              opens a small popover with 0 / 5 / 15 / 30 daqiqa options. */}
          <LeadPicker
            value={effectiveLead}
            onChange={(next) => setLeadMin(next)}
            open={showLeadPicker}
            onOpenChange={setShowLeadPicker}
            timeMissing={!time}
            availableMin={availableMin}
          />


          {/* Priority */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
              <Flag className="size-3" />
              Muhimlik
            </label>
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => {
                const active = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[12px] font-medium transition-all",
                      active
                        ? "border-foreground bg-subtle text-foreground"
                        : "border-border text-muted hover:bg-hover hover:text-foreground"
                    )}
                  >
                    <span className={cn("size-2 rounded-full", p.dot)} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        )}

        <footer className="flex items-center justify-between border-t border-border bg-subtle/30 px-4 py-2.5">
          {draft ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-faint transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-3" />
              O&apos;chirish
            </button>
          )}
          <div className="flex items-center gap-2">
            {isView ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-3 py-1.5 text-[12px] font-medium text-accent-ink bg-accent transition-opacity hover:opacity-90"
              >
                Yopish
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-md px-3 py-1.5 text-[12px] text-muted transition-colors hover:bg-hover hover:text-foreground"
                >
                  Bekor
                </button>
                <button
                  type="submit"
                  disabled={blockSave}
                  title={
                    isDateInPast
                      ? "O'tib ketgan sanaga saqlab bo'lmaydi"
                      : isTimePast
                      ? "O'tib ketgan vaqtga saqlab bo'lmaydi"
                      : undefined
                  }
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity",
                    blockSave
                      ? "cursor-not-allowed bg-foreground/40 text-background"
                      : "bg-accent text-accent-ink hover:opacity-90"
                  )}
                >
                  Saqlash
                </button>
              </>
            )}
          </div>
        </footer>
      </form>

      <TimePickerPopover
        open={showTimePicker}
        triggerRef={timeBtnRef}
        value={time}
        onChange={(v) => setTime(v)}
        onClear={() => setTime("")}
        onClose={() => setShowTimePicker(false)}
        disableBefore={
          effectiveDateIso === toDateInputValue(today)
            ? (() => {
                const n = new Date();
                return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
              })()
            : undefined
        }
        occupiedSlots={
          plans ? occupiedTimeSlots(plans, effectiveDateIso, plan.id) : []
        }
      />

      <DatePickerPopover
        open={showDatePicker}
        triggerRef={dateBtnRef}
        today={today}
        selected={selectedDate}
        plans={plans ?? []}
        onSelect={(d) => setScheduledFor(toDateInputValue(d))}
        onClose={() => setShowDatePicker(false)}
      />
    </Dialog>
  );
}

function ViewBody({
  title,
  notes,
  subtasks,
  onToggleSub,
  time,
  duration,
  priority,
  leadMin,
  selectedDate,
  isDateInPast,
  isTimePast,
  rejaCategory,
}: {
  title: string;
  notes: string;
  subtasks: Subtask[];
  onToggleSub: (id: string) => void;
  time: string;
  duration: number | undefined;
  priority: PlanPriority;
  leadMin: LeadMin;
  selectedDate: Date;
  isDateInPast: boolean;
  isTimePast: boolean;
  /** Set when this task originated from a Reja (idea) — shows which reja category it came from. */
  rejaCategory?: { label: string; color: string };
}) {
  const trimmedNotes = notes.trim();
  const pri = PRIORITY_DISPLAY[priority];
  const subDone = subtasks.filter((s) => s.done).length;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-7">
      {/* Title — large, prominent */}
      <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-foreground sm:text-[24px]">
        {title || "Sarlavhasiz"}
      </h2>

      {/* Manba reja — faqat Reja'dan o'tgan tasklarda ko'rinadi */}
      {rejaCategory && (
        <Row label="Reja" icon={<Tag className="size-3" />}>
          <span
            className="inline-flex items-center gap-1.5 text-[15px] font-medium sm:text-[14px]"
            style={{ color: rejaCategory.color }}
          >
            <Tag className="size-3.5" />
            {rejaCategory.label}
          </span>
        </Row>
      )}

      {/* Sana */}
      <Row label="Sana" icon={<CalendarIcon className="size-3" />}>
        <span
          className={cn(
            "text-[15px] sm:text-[14px]",
            isDateInPast ? "text-danger" : "text-foreground"
          )}
        >
          {formatUzDate(selectedDate)}
        </span>
      </Row>

      {/* Vaqt + Davomiyligi (only when time is set) */}
      {time && (
        <Row label="Vaqt" icon={<Clock className="size-3" />}>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "font-mono text-[16px] tabular-nums sm:text-[15px]",
                isTimePast ? "text-danger" : "text-foreground"
              )}
            >
              {time}
            </span>
            {duration != null && (
              <span className="font-mono text-[12.5px] tabular-nums text-faint">
                · {duration} daq.
              </span>
            )}
          </div>
        </Row>
      )}

      {/* Muhimlik */}
      <Row label="Muhimlik" icon={<Flag className="size-3" />}>
        <span className="inline-flex items-center gap-2 text-[15px] sm:text-[14px] text-foreground">
          <span aria-hidden className={cn("size-2.5 rounded-full", pri.dot)} />
          {pri.label}
        </span>
      </Row>

      {/* Eslatma — only when time is set (no time → no reminder) */}
      {time && (
        <Row label="Eslatma" icon={<Bell className="size-3" />}>
          <span className="text-[15px] text-foreground sm:text-[14px]">
            {formatLeadLabel(leadMin)}
          </span>
        </Row>
      )}

      {/* Ichki vazifalar — bosib bajarish mumkin */}
      {subtasks.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
            <ListChecks className="size-3" />
            Ichki vazifalar
            <span className="ml-auto font-mono text-[10.5px] tabular-nums normal-case tracking-normal">
              {subDone}/{subtasks.length}
            </span>
          </p>
          <SubtaskViewList subtasks={subtasks} onToggle={onToggleSub} />
        </div>
      )}

      {/* Izoh — prominent block (only when present) */}
      {trimmedNotes && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
            <FileText className="size-3" />
            Izoh
          </p>
          <p className="whitespace-pre-wrap rounded-md border border-border bg-background px-3.5 py-3 text-[14px] leading-relaxed text-foreground sm:text-[13.5px]">
            {trimmedNotes}
          </p>
        </div>
      )}
    </div>
  );
}


function Row({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
      <span className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
        {icon}
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function LeadPicker({
  value,
  onChange,
  open,
  onOpenChange,
  timeMissing,
  availableMin,
}: {
  value: LeadMin;
  onChange: (v: LeadMin) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Hint text when no time set — reminder won't actually fire. */
  timeMissing: boolean;
  /** Minutes until the task (null = no time). Lead presets larger than this
   *  are disabled; when none fit, the picker locks to "O'z vaqtida". */
  availableMin: number | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // Eng kichik nol bo'lmagan preset (10) ham sig'masa — lead bloklanadi.
  const minLeadOption = LEAD_MIN_OPTIONS.find((o) => o > 0) ?? 10;
  const noLeadRoom = availableMin != null && availableMin < minLeadOption;

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) onOpenChange(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, onOpenChange]);

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        disabled={noLeadRoom}
        onClick={() => onOpenChange(!open)}
        title={
          noLeadRoom
            ? "Vaqt yaqin — eslatma aynan belgilangan vaqtda keladi"
            : timeMissing
            ? "Vaqt belgilanmagan — eslatma yuborilmaydi"
            : "Bosib o'zgartiring"
        }
        className={cn(
          "flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[11.5px] transition-colors",
          noLeadRoom
            ? "cursor-not-allowed border-border/60 text-faint opacity-70"
            : timeMissing
            ? "border-border/60 text-faint hover:border-border hover:text-muted"
            : "border-border text-muted hover:border-border-strong hover:text-foreground"
        )}
      >
        <Bell className="size-3 text-faint" />
        Eslatma:{" "}
        <span
          className={cn(
            "font-mono tabular-nums",
            timeMissing || noLeadRoom ? "text-faint" : "text-foreground"
          )}
        >
          {formatLeadLabel(value)}
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-md border border-border bg-surface shadow-lg"
          role="listbox"
        >
          {LEAD_MIN_OPTIONS.map((opt) => {
            const active = opt === value;
            // Vaqtga sig'maydigan lead (masalan 7 daq qolganda 10) — bloklanadi.
            const optDisabled =
              opt > 0 && availableMin != null && opt > availableMin;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={active}
                disabled={optDisabled}
                onClick={() => {
                  if (optDisabled) return;
                  onChange(opt);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors",
                  optDisabled
                    ? "cursor-not-allowed text-faint/50"
                    : "hover:bg-hover",
                  active && !optDisabled && "bg-subtle font-medium text-foreground"
                )}
              >
                <span>{formatLeadOptionLabel(opt)}</span>
                {active && !optDisabled && <Check className="size-3.5 text-foreground" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
