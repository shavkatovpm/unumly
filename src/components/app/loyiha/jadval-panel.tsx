"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectTasks } from "@/lib/project-tasks-store";
import { PriorityPicker } from "../widgets/priority-picker";
import { DatePickerButton } from "../widgets/date-picker-button";
import { ListLoader } from "../widgets/list-loader";
import { useConfirmRemove } from "../widgets/confirm-dialog";

/** Loyihaning "Jadval" ko'rinishi — sanaga bog'liq bo'lmagan, erkin task
 *  ro'yxati (post mavzulari, ish qatorlari va h.k.), jadval uslubida. */
export function JadvalPanel({ projectId }: { projectId: string }) {
  const { tasks, hydrated, create, update, remove } = useProjectTasks(projectId);
  const [draft, setDraft] = useState("");

  const confirmItems = tasks.map((t) => ({ id: t.id, title: t.title }));
  const { askRemove, confirmEl } = useConfirmRemove(confirmItems, remove, { itemLabel: "Taskni" });

  const done = tasks.filter((t) => t.done).length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    create({ title: t });
    setDraft("");
  }

  if (!hydrated) return <ListLoader />;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted">Tasklar</p>
        {tasks.length > 0 && (
          <p className="font-mono text-[11px] tabular-nums text-faint">{done}/{tasks.length}</p>
        )}
      </div>

      <form
        onSubmit={submit}
        className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 shadow-[0_1px_0_var(--border)] transition-colors focus-within:border-border-strong"
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
        <ul className="overflow-hidden rounded-xl border border-border bg-surface">
          {/* Ustun sarlavhalari — faqat kattaroq ekranlarda */}
          <li className="hidden items-center gap-3 border-b border-border bg-subtle/40 px-3 py-2 text-[10.5px] font-medium uppercase tracking-[0.1em] text-faint sm:flex">
            <span className="w-5 shrink-0" />
            <span className="min-w-0 flex-1">Nomi</span>
            <span className="w-16 shrink-0 text-center">Muhimlik</span>
            <span className="w-[104px] shrink-0 text-center">Muddat</span>
            <span className="w-8 shrink-0" />
          </li>
          {tasks.map((t, i) => (
            <li
              key={t.id}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5",
                i !== 0 && "border-t border-border"
              )}
            >
              <button
                type="button"
                onClick={() => update(t.id, { done: !t.done })}
                aria-label={t.done ? "Bekor qilish" : "Bajarildi"}
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                  t.done ? "border-accent bg-accent" : "border-border-strong hover:border-accent"
                )}
              >
                {t.done && <span className="size-2 rounded-sm bg-accent-ink" />}
              </button>

              <input
                value={t.title}
                onChange={(e) => update(t.id, { title: e.target.value })}
                className={cn(
                  "min-w-0 flex-1 bg-transparent text-[14px] focus:outline-none",
                  t.done && "text-faint line-through"
                )}
              />

              <span className="flex w-16 shrink-0 justify-center">
                <PriorityPicker value={t.priority} onChange={(p) => update(t.id, { priority: p })} />
              </span>

              <span className="w-[104px] shrink-0">
                <DatePickerButton
                  value={t.dueDate ?? ""}
                  onChange={(v) => update(t.id, { dueDate: v })}
                  onClear={t.dueDate ? () => update(t.id, { dueDate: undefined }) : undefined}
                  placeholder="Muddat"
                  className="w-full justify-center text-[11.5px]"
                />
              </span>

              <button
                type="button"
                onClick={() => askRemove(t.id)}
                aria-label="O'chirish"
                className="grid size-8 shrink-0 place-items-center rounded-md text-faint opacity-0 transition-opacity hover:bg-hover hover:text-danger group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {confirmEl}
    </div>
  );
}
