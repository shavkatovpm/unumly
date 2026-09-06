"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectTask } from "@/lib/types";

/** Loyiha board'iga (workspace-view.tsx) task qo'shish — tez-yaratish
 *  (nom + davomiylik) yoki shu loyihaning workspace'da hali yo'q real
 *  tasklaridan birini tanlash. */
export function WorkspaceTaskPicker({
  open,
  onClose,
  tasks,
  onCreate,
  onAddExisting,
}: {
  open: boolean;
  onClose: () => void;
  tasks: ProjectTask[]; // shu loyihaning workspace'ga hali qo'shilmagan tasklari
  onCreate: (title: string, durationHours: number) => void;
  onAddExisting: (taskId: string, durationHours: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(1);

  if (!open) return null;

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onCreate(t, duration);
    setTitle("");
  }

  return (
    <div className="task-status-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="task-status-modal">
        <div className="task-status-modal-head">
          <span>Workspace&apos;ga task qo&apos;shish</span>
          <button type="button" onClick={onClose}><X className="size-4" /></button>
        </div>

        <form onSubmit={submitCreate} className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3.5 py-2.5">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Yangi task nomi..."
            className="min-w-0 flex-1 bg-transparent text-[14px] text-white/90 placeholder:text-white/30 outline-none"
          />
          <DurationToggle value={duration} onChange={setDuration} />
          <button
            type="submit"
            disabled={!title.trim()}
            aria-label="Task yaratish"
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-white/80 transition-opacity disabled:opacity-30"
          >
            <Plus className="size-4" />
          </button>
        </form>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[.1em] text-white/30">Loyihaning rejadagi tasklari</p>
        {tasks.length > 0 ? (
          <div className="-mx-1 mt-2 max-h-[280px] overflow-y-auto px-1">
            {tasks.map((t) => (
              <ExistingTaskRow key={t.id} task={t} onAdd={(hours) => onAddExisting(t.id, hours)} />
            ))}
          </div>
        ) : (
          <p className="mt-2 py-4 text-center text-[12.5px] text-white/25">Boshqa rejadagi task yo&apos;q — yangisini yarating</p>
        )}
      </div>
    </div>
  );
}

function ExistingTaskRow({ task, onAdd }: { task: ProjectTask; onAdd: (hours: number) => void }) {
  const [duration, setDuration] = useState(1);
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/[.05]">
      <span className="min-w-0 flex-1 truncate text-[13.5px] text-white/80">{task.title}</span>
      <DurationToggle value={duration} onChange={setDuration} />
      <button
        type="button"
        onClick={() => onAdd(duration)}
        aria-label={`${task.title} taskini workspace'ga qo'shish`}
        className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-white/70 transition-colors hover:bg-white/20"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function DurationToggle({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-white/10 bg-white/[.03] p-0.5 text-[11px] font-medium">
      {[1, 4].map((h) => (
        <button
          key={h}
          type="button"
          onClick={() => onChange(h)}
          className={cn("rounded-md px-2 py-1 transition-colors", value === h ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70")}
        >
          {h} soat
        </button>
      ))}
    </div>
  );
}
