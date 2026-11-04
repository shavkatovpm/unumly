"use client";

/* Loyiha ichi — mobil: ixcham sarlavha (ikon · nom · ⋯ · ×), Reja/Hujjatlar/
   Tasklar tablari, Hujjatlar (ichma-ich sahifalar, matn — BlockNote) va
   Tasklar (o'ngda dumaloq belgi, batafsil — MonoSheet). */

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import { ArrowLeft, CalendarDays, ChevronRight, CornerDownRight, FileText, Flag, GripVertical, ListChecks, MoreHorizontal, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import type { PartialBlock } from "@blocknote/core";
import { cn } from "@/lib/utils";
import { usePages } from "@/lib/pages-store";
import { useProjectTasks } from "@/lib/project-tasks-store";
import { useMobileAdd } from "@/lib/mobile-add";
import { playOnComplete } from "@/lib/sounds";
import { fromDateInputValue, toDateInputValue } from "@/lib/dates";
import type { Page, PlanPriority, Project, ProjectTask } from "@/lib/types";
import { MonoActions, MonoExpand, MonoSave, MonoSheet, MonoTile } from "../widgets/mono-sheet";
import { PickerModal } from "../widgets/picker-modal";
import { BigMonth } from "../widgets/big-month";
import { ListLoader } from "../widgets/list-loader";
import { useConfirmRemove } from "../widgets/confirm-dialog";
import { MONO_GROUP, MonoDoneFold, MonoEmpty, MonoIconButton, MonoLabel, MonoOptions, MonoSeg, MonoTick } from "../widgets/mono-bits";
import { PAGE_ICON_CHOICES, PageIcon, SOCIAL_ICON_CHOICES } from "./page-icons";
import { CatDot, ProjectTile, katMeta } from "./loyiha-mobile";

const BlockNoteEditor = dynamic(() => import("../widgets/block-note-editor").then((m) => m.BlockNoteEditor), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-full rounded bg-subtle/60" />
      <div className="h-4 w-5/6 rounded bg-subtle/50" />
    </div>
  ),
});

export type WorkspaceTab = "reja" | "hujjatlar" | "tasklar";

/* ─── Sarlavha ─── */

export function WorkspaceMobileHeader({ project, taskCount, tab, onTab, onClose, onEdit, onRemove }: {
  project: Project;
  taskCount: number;
  tab: WorkspaceTab;
  onTab: (t: WorkspaceTab) => void;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const kat = katMeta(project.category);
  return (
    <div className="shrink-0 px-4 pb-2.5 pt-1 md:hidden">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setMenu(true)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <ProjectTile icon={project.icon} color={project.color} size={38} />
          <span className="min-w-0">
            <span className="block truncate text-[18px] font-bold leading-tight tracking-[-0.02em]">{project.title}</span>
            <span className="flex items-center gap-1.5 text-[12.5px] text-muted"><CatDot color={kat.color} className="size-1.5" />{kat.key ?? "Kategoriyasiz"} · {taskCount} task</span>
          </span>
        </button>
        <MonoIconButton icon={MoreHorizontal} label="Amallar" onClick={() => setMenu(true)} />
        <MonoIconButton icon={X} label="Loyihalarga qaytish" onClick={onClose} />
      </div>
      <div className="mt-2.5">
        <MonoSeg<WorkspaceTab> value={tab} onChange={onTab} options={[{ id: "reja", label: "Reja" }, { id: "hujjatlar", label: "Hujjatlar" }, { id: "tasklar", label: "Tasklar" }]} />
      </div>

      <MonoSheet open={menu} onClose={() => setMenu(false)} label={project.title}>
        <div className="flex items-center gap-3 rounded-[24px] border border-border bg-surface p-4">
          <ProjectTile icon={project.icon} color={project.color} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[18px] font-bold">{project.title}</span>
            <span className="block text-[13px] text-muted">{kat.label}</span>
          </span>
          <button type="button" onClick={() => setMenu(false)} aria-label="Yopish" className="grid size-8 place-items-center rounded-full bg-subtle"><X className="size-4" strokeWidth={2.4} /></button>
        </div>
        <div className={MONO_GROUP}>
          <MenuRow icon={Pencil} label="Tahrirlash" hint="nom, rang, ikon, kategoriya" onClick={() => { setMenu(false); onEdit(); }} />
          <MenuRow icon={Trash2} label="Loyihani o'chirish" danger onClick={() => { setMenu(false); onRemove(); }} />
        </div>
      </MonoSheet>
    </div>
  );
}

function MenuRow({ icon: Icon, label, hint, onClick, danger }: { icon: React.ComponentType<{ className?: string }>; label: string; hint?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex min-h-[58px] w-full items-center gap-3 px-4 text-left text-[15.5px] font-semibold active:bg-hover", danger && "text-danger")}>
      <Icon className={cn("size-5 shrink-0", !danger && "text-muted")} />
      <span className="flex-1">{label}</span>
      {hint && <span className="truncate text-[12.5px] font-normal text-faint">{hint}</span>}
    </button>
  );
}

/** Inline qo'shish qatori. */
function AddRow({ placeholder, onAdd, autoFocus, onCancel }: { placeholder: string; onAdd: (v: string) => void; autoFocus?: boolean; onCancel?: () => void }) {
  const [v, setV] = useState("");
  function submit() {
    if (!v.trim()) { onCancel?.(); return; }
    onAdd(v.trim());
    setV("");
  }
  return (
    <div className="flex min-h-[58px] items-center gap-2 rounded-[22px] border border-border bg-surface py-2 pl-4 pr-2">
      <input autoFocus={autoFocus} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel?.(); }} enterKeyHint="done" placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint" />
      {onCancel && <MonoIconButton icon={X} label="Bekor qilish" onClick={onCancel} />}
      <MonoIconButton icon={Plus} label="Qo'shish" solid onClick={submit} className={cn(!v.trim() && "opacity-35")} />
    </div>
  );
}

/* ─── Hujjatlar ─── */

export function HujjatlarMobile({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const { pages, hydrated, create, update, remove, reorder } = usePages(projectId);
  const [path, setPath] = useState<string[]>([]);
  const [dir, setDir] = useState(1);
  const [adding, setAdding] = useState(false);
  useMobileAdd(() => setAdding(true), path.length === 0);

  const sorted = [...pages].sort((a, b) => a.order - b.order);
  const roots = sorted.filter((p) => !p.parentId);
  // O'chirilgan sahifalar yo'ldan tushib qoladi
  const validPath = path.filter((id) => pages.some((p) => p.id === id));
  const current = pages.find((p) => p.id === validPath[validPath.length - 1]) ?? null;
  const childCount = (id: string) => pages.filter((p) => p.parentId === id).length;
  const { askRemove, confirmEl } = useConfirmRemove(pages.map((p) => ({ id: p.id, title: p.title })), (id) => { setDir(-1); setPath((l) => l.filter((x) => x !== id)); remove(id); }, {
    itemLabel: "Sahifani",
    description: '"{title}" va uning ichidagi barcha bo\'lim sahifalar o\'chiriladi.',
  });

  function open(id: string) { setDir(1); setPath([...validPath, id]); }
  function back() { setDir(-1); setPath(validPath.slice(0, -1)); }

  if (!hydrated) return <ListLoader />;

  return (
    <>
      <AnimatePresence mode="wait" initial={false} custom={dir}>
        {current ? (
          <motion.div key={current.id} initial={{ x: dir > 0 ? 24 : -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: dir > 0 ? -24 : 24, opacity: 0 }} transition={{ duration: 0.18 }}>
            <PageViewMobile
              page={current}
              crumbs={[projectTitle, ...validPath.slice(0, -1).map((id) => pages.find((p) => p.id === id)?.title ?? "")]}
              subPages={sorted.filter((p) => p.parentId === current.id)}
              childCount={childCount}
              onBack={back}
              onOpen={open}
              onUpdate={update}
              onCreate={(parentId, title) => create({ parentId, title })}
              onReorder={reorder}
              onRemove={() => askRemove(current.id)}
            />
          </motion.div>
        ) : (
          <motion.div key="root" initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} transition={{ duration: 0.18 }}>
            {roots.length === 0 && !adding ? (
              <MonoEmpty icon={FileText} title="Hali sahifa yo'q" text="TZ, checklist, g'oyalar — har biri alohida sahifa. Ichida yana bo'lim sahifa ochish mumkin." action={<button type="button" onClick={() => setAdding(true)} className="flex h-[52px] items-center gap-2 rounded-[22px] bg-accent px-5 text-[15px] font-semibold text-accent-ink"><Plus className="size-5" /> Sahifa qo&apos;shish</button>} />
            ) : (
              <>
                <MonoLabel aside={roots.length} className="mt-1">Hujjatlar</MonoLabel>
                {roots.length > 0 && <PageList list={roots} childCount={childCount} onOpen={open} onReorder={reorder} />}
                <div className="mt-2">
                  {adding ? (
                    <AddRow autoFocus placeholder="Sahifa nomi..." onAdd={(t) => { create({ parentId: null, title: t }); setAdding(false); }} onCancel={() => setAdding(false)} />
                  ) : (
                    <button type="button" onClick={() => setAdding(true)} className="flex min-h-[56px] w-full items-center gap-3 rounded-[22px] border border-dashed border-border-strong px-4 text-[15px] font-semibold text-muted">
                      <Plus className="size-5" /> Yangi sahifa
                    </button>
                  )}
                </div>
                {roots.length > 1 && <p className="mt-3 px-1 text-[12.5px] text-faint">⠿ dan ushlab tartibini o&apos;zgartiring.</p>}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {confirmEl}
    </>
  );
}

function PageRowItem({ page, count, onOpen }: { page: Page; count: number; onOpen: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item as="div" value={page.id} dragListener={false} dragControls={controls} whileDrag={{ scale: 1.02, boxShadow: "0 12px 28px -10px rgba(0,0,0,0.3)", zIndex: 2, position: "relative" }} className="flex min-h-[62px] items-center bg-surface">
      <button type="button" aria-label="Tartibini o'zgartirish" onPointerDown={(e) => controls.start(e)} className="grid h-[62px] w-9 shrink-0 cursor-grab touch-none place-items-center text-faint">
        <GripVertical className="size-4" />
      </button>
      <button type="button" onClick={onOpen} className="flex min-h-[62px] min-w-0 flex-1 items-center gap-3 pr-3.5 text-left active:bg-hover">
        <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-subtle text-muted"><PageIcon k={page.icon} className="size-[18px]" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15.5px] font-semibold">{page.title || "Nomsiz"}</span>
          <span className="block truncate text-[12.5px] text-faint">{count ? `${count} bo'lim sahifa` : "Sahifa"}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-faint" />
      </button>
    </Reorder.Item>
  );
}

function PageList({ list, childCount, onOpen, onReorder }: { list: Page[]; childCount: (id: string) => number; onOpen: (id: string) => void; onReorder: (ids: string[]) => void }) {
  const ids = list.map((p) => p.id);
  // Sudrash paytida mahalliy tartib, qo'yib yuborilganda store'ga yoziladi
  const [order, setOrder] = useState<string[] | null>(null);
  const shown = order && order.length === ids.length && order.every((id) => ids.includes(id)) ? order : ids;
  return (
    <Reorder.Group
      as="div"
      axis="y"
      values={shown}
      onReorder={setOrder}
      onPointerUp={() => { if (order && order.join() !== ids.join()) onReorder(order); }}
      className={MONO_GROUP}
    >
      {shown.map((id) => {
        const p = list.find((x) => x.id === id);
        return p ? <PageRowItem key={id} page={p} count={childCount(id)} onOpen={() => onOpen(id)} /> : null;
      })}
    </Reorder.Group>
  );
}

function PageViewMobile({ page, crumbs, subPages, childCount, onBack, onOpen, onUpdate, onCreate, onReorder, onRemove }: {
  page: Page;
  crumbs: string[];
  subPages: Page[];
  childCount: (id: string) => number;
  onBack: () => void;
  onOpen: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Page>) => void;
  onCreate: (parentId: string | null, title: string) => void;
  onReorder: (ids: string[]) => void;
  onRemove: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [pickIcon, setPickIcon] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [addingSibling, setAddingSibling] = useState(false);
  const [title, setTitle] = useState(page.title);
  useMobileAdd(() => setAddingChild(true));

  function commitTitle() {
    const t = title.trim();
    if (t && t !== page.title) onUpdate(page.id, { title: t });
    else setTitle(page.title);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <MonoIconButton icon={ArrowLeft} label="Orqaga" onClick={onBack} />
        <p className="min-w-0 flex-1 truncate text-[13.5px] text-muted">{crumbs.join(" / ")}</p>
        <MonoIconButton icon={MoreHorizontal} label="Sahifa amallari" onClick={() => setMenu(true)} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={() => setPickIcon(true)} aria-label="Ikonani o'zgartirish" className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-subtle text-muted">
          <PageIcon k={page.icon} className="size-5" />
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          enterKeyHint="done"
          placeholder="Nomsiz"
          className="min-w-0 flex-1 bg-transparent text-[24px]! font-bold tracking-[-0.025em] outline-none placeholder:text-faint"
        />
      </div>
      {/* Matn — haqiqiy BlockNote muharriri */}
      <div className="-mx-1 mt-3 min-h-[160px] rounded-[22px] border border-border bg-surface py-3 pr-2">
        <BlockNoteEditor key={page.id} initialContent={page.content as PartialBlock[] | null} onChange={(blocks) => onUpdate(page.id, { content: blocks as unknown[] })} />
      </div>

      <MonoLabel aside={subPages.length || undefined}>Bo&apos;lim sahifalar</MonoLabel>
      {subPages.length > 0 && <PageList list={subPages} childCount={childCount} onOpen={onOpen} onReorder={onReorder} />}
      <div className={cn(subPages.length > 0 && "mt-2")}>
        {addingChild ? (
          <AddRow autoFocus placeholder="Bo'lim sahifa nomi..." onAdd={(t) => { onCreate(page.id, t); setAddingChild(false); }} onCancel={() => setAddingChild(false)} />
        ) : (
          <button type="button" onClick={() => setAddingChild(true)} className="flex min-h-[56px] w-full items-center gap-3 rounded-[22px] border border-dashed border-border-strong px-4 text-[15px] font-semibold text-muted">
            <CornerDownRight className="size-5" /> Bo&apos;lim sahifa qo&apos;shish
          </button>
        )}
      </div>

      <MonoSheet open={menu} onClose={() => setMenu(false)} label={page.title}>
        <div className="flex items-center gap-3 rounded-[24px] border border-border bg-surface p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-subtle text-muted"><PageIcon k={page.icon} className="size-5" /></span>
          <span className="min-w-0 flex-1 truncate text-[18px] font-bold">{page.title || "Nomsiz"}</span>
          <button type="button" onClick={() => setMenu(false)} aria-label="Yopish" className="grid size-8 place-items-center rounded-full bg-subtle"><X className="size-4" strokeWidth={2.4} /></button>
        </div>
        <div className={MONO_GROUP}>
          <MenuRow icon={Plus} label="Yonidan sahifa qo'shish" onClick={() => { setMenu(false); setAddingSibling(true); }} />
          <MenuRow icon={CornerDownRight} label="Ostidan bo'lim sahifa" onClick={() => { setMenu(false); setAddingChild(true); }} />
          <MenuRow icon={Tag} label="Ikonani o'zgartirish" onClick={() => { setMenu(false); setPickIcon(true); }} />
          <MenuRow icon={Trash2} label="Sahifani o'chirish" danger onClick={() => { setMenu(false); onRemove(); }} />
        </div>
      </MonoSheet>

      <PickerModal open={addingSibling} onClose={() => setAddingSibling(false)} label="Yonidan yangi sahifa">
        <AddRow autoFocus placeholder="Sahifa nomi..." onAdd={(t) => { onCreate(page.parentId, t); setAddingSibling(false); }} />
      </PickerModal>

      <PickerModal open={pickIcon} onClose={() => setPickIcon(false)} label="Ikonani tanlash">
        {([["Hujjat", PAGE_ICON_CHOICES], ["Ijtimoiy tarmoq", SOCIAL_ICON_CHOICES]] as const).map(([label, keys]) => (
          <div key={label} className="mb-4 last:mb-0">
            <p className="mb-2 px-1 text-[13px] font-semibold text-muted">{label}</p>
            <div className="grid grid-cols-6 gap-1.5">
              {(keys as readonly string[]).map((k) => (
                <button key={k} type="button" aria-label={k} onClick={() => { onUpdate(page.id, { icon: k }); setPickIcon(false); }} className={cn("grid aspect-square place-items-center rounded-[14px] border", page.icon === k ? "border-accent bg-accent text-accent-ink" : "border-border text-muted")}>
                  <PageIcon k={k} className="size-5" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </PickerModal>
    </>
  );
}

/* ─── Tasklar ─── */

const PRIORITIES: { id: PlanPriority | null; label: string; dot: string }[] = [
  { id: "HIGH", label: "Muhim", dot: "bg-priority-high" },
  { id: "MEDIUM", label: "O'rta", dot: "bg-priority-medium" },
  { id: "LOW", label: "Past", dot: "bg-priority-low" },
  { id: null, label: "Darajasiz", dot: "bg-faint/40" },
];
const prio = (p?: PlanPriority | null) => PRIORITIES.find((x) => x.id === (p ?? null))!;
const MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];
function shortDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return s;
  const base = `${d}-${MONTHS_SHORT[m - 1]}`;
  return y === new Date().getFullYear() ? base : `${base} ${y}`;
}

function TaskRow({ task, onOpen, onToggle, dragControls }: { task: ProjectTask; onOpen: () => void; onToggle: () => void; dragControls?: ReturnType<typeof useDragControls> }) {
  return (
    <>
      {dragControls ? (
        <button type="button" aria-label="Tartibini o'zgartirish" onPointerDown={(e) => dragControls.start(e)} className="grid h-[62px] w-9 shrink-0 cursor-grab touch-none place-items-center text-faint">
          <GripVertical className="size-4" />
        </button>
      ) : <span className="w-3.5 shrink-0" />}
      <button type="button" onClick={onOpen} className="flex min-h-[62px] min-w-0 flex-1 items-center gap-2.5 py-2.5 text-left">
        <span className={cn("size-2 shrink-0 rounded-full", prio(task.priority).dot, task.done && "opacity-40")} />
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[16px] leading-snug", task.done && "text-faint line-through decoration-faint/60")}>{task.title || "Nomsiz"}</span>
          {task.dueDate && (
            <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 text-[12px] font-medium tabular-nums", task.done && "text-faint")}>
              <CalendarDays className="size-3" /> {shortDate(task.dueDate)}
            </span>
          )}
        </span>
      </button>
      <MonoTick on={task.done} onClick={onToggle} wave />
    </>
  );
}

function DraggableTask({ task, onOpen, onToggle }: { task: ProjectTask; onOpen: () => void; onToggle: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item as="div" value={task} dragListener={false} dragControls={controls} whileDrag={{ scale: 1.02, boxShadow: "0 12px 28px -10px rgba(0,0,0,0.3)", zIndex: 2, position: "relative" }} className="flex min-h-[62px] items-center bg-surface pr-3.5">
      <TaskRow task={task} onOpen={onOpen} onToggle={onToggle} dragControls={controls} />
    </Reorder.Item>
  );
}

export function TasklarMobile({ projectId }: { projectId: string }) {
  const { tasks, hydrated, create, update, remove } = useProjectTasks(projectId);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addFocus, setAddFocus] = useState(0);
  useMobileAdd(() => setAddFocus((n) => n + 1));

  const { askRemove, confirmEl } = useConfirmRemove(tasks.map((t) => ({ id: t.id, title: t.title })), remove, { itemLabel: "Taskni" });
  const active = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const detail = tasks.find((t) => t.id === detailId) ?? null;

  function toggle(t: ProjectTask) {
    if (!t.done) playOnComplete();
    update(t.id, { done: !t.done });
  }
  // Faqat faol tasklar ichida tartib (desktop'dagi kabi)
  function reorder(next: ProjectTask[]) {
    next.forEach((t, i) => { if (t.order !== i) update(t.id, { order: i }); });
  }

  if (!hydrated) return <ListLoader />;

  return (
    <>
      <div className="mt-1">
        <AddRow key={addFocus} autoFocus={addFocus > 0} placeholder="Yangi task qo'shish..." onAdd={(t) => create({ title: t })} />
      </div>
      <MonoLabel aside={tasks.length ? `${done.length}/${tasks.length}` : undefined}>Tasklar</MonoLabel>
      {tasks.length === 0 ? (
        <MonoEmpty icon={ListChecks} title="Hali task yo'q" text="Yuqoridagi maydonga yozing — post mavzulari, ish qatorlari va h.k." />
      ) : active.length === 0 ? (
        <p className="rounded-[22px] border border-border bg-surface py-6 text-center text-[14px] text-muted">Hammasi bajarildi</p>
      ) : (
        <Reorder.Group as="div" axis="y" values={active} onReorder={reorder} className={MONO_GROUP}>
          {active.map((t) => <DraggableTask key={t.id} task={t} onOpen={() => setDetailId(t.id)} onToggle={() => toggle(t)} />)}
        </Reorder.Group>
      )}
      <MonoDoneFold count={done.length}>
        <div className={MONO_GROUP}>
          {done.map((t) => (
            <div key={t.id} className="flex min-h-[62px] items-center bg-surface pr-3.5">
              <TaskRow task={t} onOpen={() => setDetailId(t.id)} onToggle={() => toggle(t)} />
            </div>
          ))}
        </div>
      </MonoDoneFold>

      <TaskDetailMobile task={detail} onClose={() => setDetailId(null)} onUpdate={update} onToggle={toggle} onRemove={(id) => { setDetailId(null); askRemove(id); }} />
      {confirmEl}
    </>
  );
}

function TaskDetailMobile({ task, onClose, onUpdate, onToggle, onRemove }: {
  task: ProjectTask | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<ProjectTask>) => void;
  onToggle: (t: ProjectTask) => void;
  onRemove: (id: string) => void;
}) {
  // Yopilish animatsiyasida ham oxirgi task ko'rinib tursin
  const [last, setLast] = useState<ProjectTask | null>(task);
  if (task && task !== last) setLast(task);
  const t = task ?? last;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [prioOpen, setPrioOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  function close() { setEditing(false); onClose(); }
  function save() {
    if (t && title.trim()) onUpdate(t.id, { title: title.trim() });
    setEditing(false);
  }

  return (
    <>
      <MonoSheet open={!!task} onClose={close} label={t?.title ?? "Task"} dismissable={!editing}>
        {t && (
          <>
            <div className="rounded-[24px] border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-muted">Loyiha taski</p>
                  <p className={cn("mt-0.5 text-[21px] font-bold leading-tight tracking-[-0.02em]", t.done && "text-faint line-through decoration-faint/60")}>{t.title || "Nomsiz"}</p>
                </div>
                <button type="button" onClick={close} aria-label="Yopish" className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle"><X className="size-4" strokeWidth={2.4} /></button>
              </div>
            </div>
            <MonoActions done={t.done} onToggleDone={() => onToggle(t)} editing={editing} onToggleEdit={() => { setTitle(t.title); setEditing((v) => !v); }} onDelete={() => onRemove(t.id)} />
            <MonoExpand open={editing}>
              <div className="rounded-[22px] border border-border bg-surface p-3">
                <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} enterKeyHint="done" placeholder="Task nomi" className="w-full bg-transparent text-[17px]! font-semibold outline-none placeholder:text-faint" />
              </div>
              <MonoSave disabled={!title.trim()} onClick={save}>Saqlash</MonoSave>
            </MonoExpand>
            <div className="grid grid-cols-2 gap-2">
              <MonoTile icon={Flag} label="Muhimlik" value={t.priority ? prio(t.priority).label : undefined} filled={!!t.priority} onClick={() => setPrioOpen(true)} />
              <MonoTile icon={CalendarDays} label="Muddat" value={t.dueDate ? shortDate(t.dueDate) : undefined} filled={!!t.dueDate} onClick={() => setDateOpen(true)} />
            </div>
          </>
        )}
      </MonoSheet>
      {t && (
        <>
          <MonoOptions
            open={prioOpen}
            label="Muhimlik"
            value={t.priority ?? null}
            onClose={() => setPrioOpen(false)}
            onPick={(p) => onUpdate(t.id, { priority: p ?? undefined })}
            options={PRIORITIES.map((p) => ({ id: p.id, label: p.label, dot: <span className={cn("size-2.5 rounded-full", p.dot)} /> }))}
          />
          <PickerModal open={dateOpen} onClose={() => setDateOpen(false)} label="Muddat">
            <BigMonth
              today={new Date()}
              selected={t.dueDate ? fromDateInputValue(t.dueDate) : null}
              onSelect={(d) => { onUpdate(t.id, { dueDate: toDateInputValue(d) }); setDateOpen(false); }}
            />
            {t.dueDate && (
              <button type="button" onClick={() => { onUpdate(t.id, { dueDate: undefined }); setDateOpen(false); }} className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[16px] bg-subtle text-[14px] font-semibold text-danger">
                <X className="size-4" /> Muddatni olib tashlash
              </button>
            )}
          </PickerModal>
        </>
      )}
    </>
  );
}
