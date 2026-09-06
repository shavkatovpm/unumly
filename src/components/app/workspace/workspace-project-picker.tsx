"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { refreshProjects, useProjects } from "@/lib/projects-store";
import { createProject } from "@/lib/projects-actions";
import type { CategoryColor, Project } from "@/lib/types";
import { CATEGORY_COLOR_KEYS, CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import { ProjectIcon } from "../loyiha-icons";

/** /workspace grid'iga real loyiha qo'shish uchun tanlagich — Dialog widget
 *  o'rniga workspace-view.tsx'dagi qorong'i-shisha `.task-status-modal`
 *  klasslaridan foydalanadi (Dialog'ning yorug' `bg-surface` skini bilan
 *  to'qnashmasligi uchun). Tanlangan loyihaning to'liq ma'lumoti (nafaqat
 *  id) beriladi — chaqiruvchi shu asosda grid'ga darhol (optimistik)
 *  qo'sha oladi, server javobini kutmasdan. */
export function WorkspaceProjectPicker({
  open,
  onClose,
  onPick,
  excludeIds,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (project: Project) => void;
  excludeIds: string[];
}) {
  const { projects } = useProjects();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [title, setTitle] = useState("");
  const [color, setColor] = useState<CategoryColor>("indigo");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const project = await createProject({ title: title.trim(), color, addToWorkspace: true });
      await refreshProjects();
      onPick(project);
      setTitle("");
      onClose();
    } catch {
      setError("Loyiha yaratilmadi. Qayta urinib ko‘ring.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  const available = useMemo(() => {
    const excluded = new Set(excludeIds);
    const q = query.trim().toLowerCase();
    return projects.filter((p) => !excluded.has(p.id) && (!q || p.title.toLowerCase().includes(q)));
  }, [projects, excludeIds, query]);

  if (!open) return null;

  return (
    <div className="task-status-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="task-status-modal">
        <div className="task-status-modal-head">
          <span>Workspace&apos;ga loyiha qo&apos;shish</span>
          <button type="button" onClick={onClose}><X className="size-4" /></button>
        </div>

        <div className="mt-5 flex gap-2" aria-label="Loyiha qo‘shish usuli">
          {([['existing', 'Mavjud loyiha'], ['new', 'Yangi loyiha']] as const).map(([value, label]) => (
            <button key={value} type="button" disabled={saving} aria-pressed={mode === value} onClick={() => setMode(value)} className={`flex-1 rounded-lg px-3 py-2 text-sm ${mode === value ? 'bg-white/15 text-white' : 'text-white/45 hover:bg-white/5'}`}>{label}</button>
          ))}
        </div>

        {mode === "new" ? (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm text-white/60">
              Loyiha nomi
              <input autoFocus required disabled={saving} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Yangi loyiha nomi..." className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3.5 py-3 text-white outline-none focus:border-white/40" />
            </label>
            <fieldset disabled={saving}>
              <legend className="mb-2 text-sm text-white/60">Rangi</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLOR_KEYS.map((key) => <button key={key} type="button" aria-label={CATEGORY_PALETTE[key].label} title={CATEGORY_PALETTE[key].label} aria-pressed={color === key} onClick={() => setColor(key)} className="grid size-8 place-items-center rounded-full border border-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{ background: key === 'white' ? '#d8d8d2' : CATEGORY_PALETTE[key].oklch }}>{color === key && <Check className="size-4 text-black" />}</button>)}
              </div>
            </fieldset>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={saving || !title.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-3 text-sm text-white hover:bg-white/20 disabled:opacity-40"><Plus className="size-4" />{saving ? 'Yaratilmoqda…' : 'Yaratish va Workspace’ga qo‘shish'}</button>
          </form>
        ) : <>
        <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.04] px-3.5 py-2.5">
          <Search className="size-4 shrink-0 text-white/35" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Loyiha qidirish..."
            className="min-w-0 flex-1 bg-transparent text-[14px] text-white/90 placeholder:text-white/30 outline-none"
          />
        </div>

        <div className="-mx-1 mt-3 max-h-[340px] overflow-y-auto px-1">
          {available.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-white/35">
              {query.trim() ? "Loyiha topilmadi" : projects.length === 0 ? "Hali loyiha yo'q" : "Barcha loyihalar allaqachon qo'shilgan"}
            </p>
          ) : (
            available.map((p) => {
              const tint = p.color ? CATEGORY_PALETTE[p.color].oklch : "rgba(255,255,255,.55)";
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onPick(p); onClose(); }}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/[.06]"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-lg"
                    style={{ background: p.color ? colorWithAlpha(p.color, 0.14) : "rgba(255,255,255,.08)", color: tint }}
                  >
                    <ProjectIcon k={p.icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-white/85">{p.title}</span>
                </button>
              );
            })
          )}
        </div>
        </>}
      </div>
    </div>
  );
}
