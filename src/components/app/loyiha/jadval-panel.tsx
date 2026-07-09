"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectTasks } from "@/lib/project-tasks-store";
import type { ProjectTask } from "@/lib/types";
import { PriorityPicker, priorityColorClass } from "../widgets/priority-picker";
import { DatePickerButton } from "../widgets/date-picker-button";
import { ListLoader } from "../widgets/list-loader";
import { useConfirmRemove } from "../widgets/confirm-dialog";
import { Dialog } from "../widgets/dialog";
import { playOnComplete } from "@/lib/sounds";

const UZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];

/** Kun+oyni qisqa ko'rsatadi ("15-iyul") — yil faqat joriy yildan farq
 *  qilsa qo'shiladi. Xom "YYYY-MM-DD" satrni to'g'ridan-to'g'ri chiqarish
 *  tor ustunda kesilib, faqat yil qismi ko'rinib qolardi. */
function formatDueDateShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  const short = `${d}-${UZ_MONTHS_SHORT[m - 1]}`;
  return y === new Date().getFullYear() ? short : `${short} ${y}`;
}

/** Loyihaning "Jadval" ko'rinishi — sanaga bog'liq bo'lmagan, erkin task
 *  ro'yxati (post mavzulari, ish qatorlari va h.k.), "Bugun" bo'limidagi
 *  qatorlar bilan bir xil til (bosish tuyg'usi, check animatsiyasi,
 *  tipografiya) — faqat batafsil (muhimlik/muddat/o'chirish) qatorga
 *  bosilganda ochiladigan yengil panelda. */
export function JadvalPanel({ projectId }: { projectId: string }) {
  const { tasks, hydrated, create, update, remove } = useProjectTasks(projectId);
  const [draft, setDraft] = useState("");
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);

  // Mobil: tepadagi inline qator o'rniga pastki-o'ng burchakdagi FAB + markazdagi
  // dialog — Bugun/Reja bo'limlaridagi bilan bir xil naqsh.
  const [mobileAdd, setMobileAdd] = useState(false);
  const [mobileDraft, setMobileDraft] = useState("");
  const mobileAddRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (mobileAdd) mobileAddRef.current?.focus(); }, [mobileAdd]);

  const confirmItems = tasks.map((t) => ({ id: t.id, title: t.title }));
  const { askRemove, confirmEl } = useConfirmRemove(confirmItems, remove, { itemLabel: "Taskni" });

  const active = tasks.filter((t) => !t.done);
  const doneList = tasks.filter((t) => t.done);
  const detailTask = detailId ? tasks.find((t) => t.id === detailId) ?? null : null;

  function addTask(title: string) {
    const t = title.trim();
    if (!t) return;
    const id = create({ title: t });
    setJustCreatedId(id);
    window.setTimeout(() => setJustCreatedId((cur) => (cur === id ? null : cur)), 900);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addTask(draft);
    setDraft("");
  }

  function submitMobile(e: React.FormEvent) {
    e.preventDefault();
    addTask(mobileDraft);
    setMobileDraft("");
    setMobileAdd(false);
  }

  function toggle(id: string) {
    update(id, { done: !tasks.find((x) => x.id === id)?.done });
  }

  if (!hydrated) return <ListLoader />;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted">Tasklar</p>
        {tasks.length > 0 && (
          <p className="font-mono text-[11px] tabular-nums text-faint">{doneList.length}/{tasks.length}</p>
        )}
      </div>

      <form
        onSubmit={submit}
        className="mb-3 hidden items-center gap-2 overflow-hidden rounded-lg border border-border bg-surface px-3 py-2 shadow-[0_1px_0_var(--border)] transition-colors focus-within:border-border-strong md:flex"
      >
        <Plus className="size-3.5 shrink-0 text-faint" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Yangi task qo'shish..."
          className="min-w-0 flex-1 bg-transparent text-[13.5px] placeholder:text-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className={cn(
            "rounded-md px-2.5 py-1 text-[12px] font-medium transition-opacity",
            draft.trim() ? "bg-foreground text-background hover:opacity-90" : "cursor-not-allowed bg-subtle text-faint"
          )}
        >
          Qo&apos;shish
        </button>
      </form>

      {tasks.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-faint">Hali task yo&apos;q</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <ul className="divide-y divide-border/70">
            {active.map((t) => (
              <ProjectTaskRow
                key={t.id}
                task={t}
                onToggle={toggle}
                onOpen={setDetailId}
                isNew={t.id === justCreatedId}
              />
            ))}
          </ul>

          {doneList.length > 0 && (
            <div className="border-t border-border bg-subtle/40">
              <button
                type="button"
                onClick={() => setDoneOpen((v) => !v)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-muted transition-colors hover:bg-hover/40 hover:text-foreground"
              >
                <ChevronRight className={cn("size-3 transition-transform", doneOpen && "rotate-90")} />
                <Check className="size-3" strokeWidth={3} />
                <span className="text-[11.5px] font-medium uppercase tracking-wider">Bajarilgan</span>
                <span className="font-mono text-[10.5px] tabular-nums">{doneList.length}</span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: doneOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <ul className="divide-y divide-border/70 border-t border-border">
                    {doneList.map((t) => (
                      <ProjectTaskRow key={t.id} task={t} onToggle={toggle} onOpen={setDetailId} />
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile FAB — bottom-right circular "+" button */}
      <button
        type="button"
        onClick={() => setMobileAdd(true)}
        aria-label="Yangi task qo'shish"
        className={cn(
          "fixed right-4 z-30 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_10px_30px_-5px_rgba(0,0,0,0.35)] transition-all duration-200 hover:scale-105 active:scale-95 md:hidden",
          mobileAdd && "pointer-events-none scale-75 opacity-0"
        )}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)" }}
      >
        <Plus className="size-6" strokeWidth={2.5} />
      </button>

      <Dialog open={mobileAdd} onClose={() => setMobileAdd(false)} className="max-w-sm" mobilePlacement="center">
        <div className="flex flex-col">
          <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <p className="text-[15px] font-semibold">Yangi task</p>
            <button
              onClick={() => setMobileAdd(false)}
              aria-label="Yopish"
              className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </header>
          <form onSubmit={submitMobile} className="px-4 py-4">
            <input
              ref={mobileAddRef}
              value={mobileDraft}
              onChange={(e) => setMobileDraft(e.target.value)}
              placeholder="Yangi task qo'shish..."
              className="w-full rounded-lg border border-border bg-subtle/30 px-3 py-2.5 text-[14px] outline-none placeholder:text-faint/50 focus:border-foreground/30"
            />
          </form>
        </div>
      </Dialog>

      <ProjectTaskDetail
        task={detailTask}
        open={!!detailTask}
        onClose={() => setDetailId(null)}
        onUpdate={update}
        onRemove={(id) => { setDetailId(null); askRemove(id); }}
      />
      {confirmEl}
    </div>
  );
}

/** "Bugun" bo'limidagi `TaskRow` bilan bir xil til (bosish/animatsiya/
 *  tovush) — faqat vaqt o'rniga (Jadval taskida vaqt tushunchasi yo'q)
 *  muddat qisqa qilib ko'rsatiladi. Batafsil (muhimlik/muddat/o'chirish)
 *  qatorga bosilganda ochiladigan panelda. */
function ProjectTaskRow({
  task,
  onToggle,
  onOpen,
  isNew,
}: {
  task: ProjectTask;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  isNew?: boolean;
}) {
  const done = task.done;
  const priorityDot = task.priority ? priorityColorClass(task.priority) : "bg-faint/40";

  // Bugun'ning TaskRow'idagi kabi "belgilanguncha kutish" emas — u yerda
  // bajarilgan task boshqa (yopiq) bo'limga ko'chib, qator DOM'dan butunlay
  // chiqib ketadi, shu sabab vaqtincha maxHeight/opacity animatsiyasi va
  // motion.li `layout` bir-biriga xalaqit bermaydi. Jadval'da esa qator
  // O'Z JOYIDA qoladi (faqat chizib qo'yiladi) — xuddi shu animatsiyani shu
  // yerda ishlatish `layout` bilan to'qnashib, qator abadiy shaffof/yig'iq
  // holatda "qotib" qolishiga sabab bo'lardi. Shu sabab bosilganda faqat
  // ovoz + darhol vizual holat, DOM'dan hech narsa yashirilmaydi.
  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!done) playOnComplete();
    onToggle(task.id);
  }

  return (
    <li
      onClick={() => onOpen(task.id)}
      className={cn(
        "group flex cursor-pointer items-center gap-3 overflow-hidden px-3 py-3 transition-colors hover:bg-hover/60 sm:py-2",
        done && "bg-subtle/30",
        isNew && "task-pop"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full transition-opacity",
          priorityDot,
          done && "opacity-40"
        )}
      />

      {task.dueDate && (
        <span
          className={cn(
            "flex items-center gap-1 rounded-md bg-subtle px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-foreground",
            done && "text-faint"
          )}
        >
          <CalendarDays className="size-2.5" />
          {formatDueDateShort(task.dueDate)}
        </span>
      )}

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[17px] leading-snug sm:text-[13.5px]",
          done && "text-faint line-through decoration-faint/60"
        )}
      >
        {task.title || "Nomsiz"}
      </span>

      <button
        type="button"
        onClick={handleToggle}
        aria-label={done ? "Bekor qilish" : "Bajarildi"}
        className="group/check -my-2 -mr-3 flex shrink-0 cursor-pointer items-center py-2 pl-3 pr-3 transition-colors hover:bg-hover/40"
      >
        <span
          className={cn(
            "grid size-[21px] place-items-center rounded-md border transition-all duration-200",
            done
              ? "border-accent bg-accent check-fill"
              : "border-border-strong group-hover/check:border-accent"
          )}
        >
          {done && (
            <Check className="size-[14px] text-background check-pop" strokeWidth={5} />
          )}
        </span>
      </button>
    </li>
  );
}

/** Qatorga bosilganda ochiladigan yengil panel — nom, muhimlik, muddat va
 *  o'chirish shu yerda; "Bugun"dagi TaskDetail'ning Jadval uchun soddalashgan
 *  varianti (izoh/ichki vazifa/vaqt/eslatma kabi Plan'ga xos maydonlarsiz). */
function ProjectTaskDetail({
  task,
  open,
  onClose,
  onUpdate,
  onRemove,
}: {
  task: ProjectTask | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<ProjectTask>) => void;
  onRemove: (id: string) => void;
}) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (task) setTitle(task.title);
  }, [task?.id, task?.title]);

  function saveTitle() {
    if (!task) return;
    const t = title.trim();
    if (t && t !== task.title) onUpdate(task.id, { title: t });
    else setTitle(task.title);
  }

  if (!task) return null;

  return (
    <Dialog open={open} onClose={onClose} mobilePlacement="bottom" className="max-w-md">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <p className="text-[15px] font-semibold tracking-[-0.01em]">Task</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="-mr-1 grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="space-y-5 px-5 py-5">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
            if (e.key === "Escape") setTitle(task.title);
          }}
          placeholder="Nomsiz"
          className="w-full bg-transparent text-[18px] font-medium leading-snug text-foreground outline-none placeholder:text-faint"
        />

        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted">Muhimlik</span>
          <PriorityPicker
            value={task.priority}
            onChange={(p) => onUpdate(task.id, { priority: p })}
            align="right"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted">Muddat</span>
          <DatePickerButton
            value={task.dueDate ?? ""}
            onChange={(v) => onUpdate(task.id, { dueDate: v })}
            onClear={task.dueDate ? () => onUpdate(task.id, { dueDate: undefined }) : undefined}
            format={formatDueDateShort}
            placeholder="Belgilanmagan"
          />
        </div>
      </div>

      <div className="border-t border-border px-5 py-3">
        <button
          type="button"
          onClick={() => onRemove(task.id)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-danger transition-colors hover:bg-danger-soft"
        >
          <Trash2 className="size-3.5" /> Taskni o&apos;chirish
        </button>
      </div>
    </Dialog>
  );
}
