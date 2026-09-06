"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Command,
  GripVertical,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project, ProjectTask } from "@/lib/types";
import type { WorkspaceProjectRow } from "@/lib/projects-actions";
import { useWorkspaceProjects, refreshWorkspaceProjects } from "@/lib/workspace-store";
import { useProjectTasks } from "@/lib/project-tasks-store";
import { CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import { ProjectIcon } from "../loyiha-icons";
import { WorkspaceProjectPicker } from "./workspace-project-picker";
import { WorkspaceTaskPicker } from "./workspace-task-picker";

type UiTheme = "obsidian" | "smoke" | "orbit";
type BoardStatus = "Rejada" | "Jarayonda" | "Tugallangan";

const uiThemes: { id: UiTheme; number: string; name: string; note: string }[] = [
  { id: "smoke", number: "04", name: "Index", note: "Project list" },
  { id: "orbit", number: "11", name: "Orbit 3D", note: "Circular" },
];

const THEME_STORAGE_KEY = "unumly:workspace:theme";

function taskStatus(t: ProjectTask): BoardStatus {
  if (t.done) return "Tugallangan";
  if (t.inProgress) return "Jarayonda";
  return "Rejada";
}

function formatDuration(hours?: number): string {
  return `${hours === 4 ? 4 : 1} soat`;
}

/** CategoryColor'dan karta uchun tint/glow — "white" `var(--foreground)`ga
 *  bog'langani uchun (oklch emas) alpha-mix'ga mos kelmaydi, shu holatda
 *  neytral qiymatga tushamiz. */
function projectTint(color?: WorkspaceProjectRow["color"]): { tint: string; glow: string } {
  const key = color ?? "slate";
  if (key === "white") return { tint: "#d8d8d2", glow: "rgba(216, 216, 210, .3)" };
  return { tint: CATEGORY_PALETTE[key].oklch, glow: colorWithAlpha(key, 0.3) };
}

const MOBILE_QUERY = "(max-width: 700px)";

export function WorkspaceView() {
  const [theme, setTheme] = useState<UiTheme>(() => {
    if (typeof window === "undefined") return "smoke";
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "orbit" ? "orbit" : "smoke";
  });
  // Orbit 3D — pointer-drag va 3D transformlarga tayanadi, mobil/tegishga
  // mos emas. Kichik ekranda har doim Index'ga tushamiz (saqlangan
  // afzallikni o'zgartirmasdan) — ekran kengaytirilsa, orbit yana qaytadi.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const effectiveTheme: UiTheme = isMobile && theme === "orbit" ? "smoke" : theme;

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { projects, hydrated, addProject, removeProject } = useWorkspaceProjects();

  function changeTheme(next: UiTheme) {
    setTheme(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  const selectedProject = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) ?? null : null;

  return (
    <main className={cn("workspace-lab theme-obsidian min-h-[100dvh] overflow-hidden", `theme-${selectedProject ? "obsidian" : effectiveTheme}`, "index-graphite", "orbit-mono")}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="workspace-noise" />

      {selectedProject ? (
        <ProjectBoard
          project={selectedProject}
          onBack={() => setSelectedProjectId(null)}
          onRemoveFromWorkspace={() => { removeProject(selectedProject.id); setSelectedProjectId(null); }}
        />
      ) : (
        <ProjectGrid
          theme={effectiveTheme}
          onThemeChange={changeTheme}
          hideOrbitOption={isMobile}
          projects={projects}
          hydrated={hydrated}
          onAddProject={addProject}
          onProject={(id) => setSelectedProjectId(id)}
        />
      )}

      <style>{styles}</style>
    </main>
  );
}

function Brand() {
  return (
    <div className="navbar-brand flex shrink-0 items-center gap-3">
      <div className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[.06] shadow-inner backdrop-blur-xl"><Command className="size-[17px]" /></div>
      <span className="text-[15px] font-semibold tracking-[-.02em]">unumly</span>
      <span className="hidden h-4 w-px bg-white/15 sm:block" />
      <span className="hidden text-[12px] text-white/38 sm:block">workspace</span>
    </div>
  );
}

function Header({ theme, onThemeChange, onAddProject, hideOrbitOption }: { theme?: UiTheme; onThemeChange?: (theme: UiTheme) => void; onAddProject?: () => void; hideOrbitOption?: boolean }) {
  const visibleThemes = hideOrbitOption ? uiThemes.filter((t) => t.id !== "orbit") : uiThemes;
  return (
    <header className="workspace-header relative z-10 h-[72px] border-b border-white/[.07]">
      <div className="navbar-inner">
        <Brand />
        <div className="header-actions flex items-center gap-2">
        <div className="header-action-group">
          <button aria-label="Qidiruv" className="glass-button"><Search className="size-4" /></button>
          <button className="glass-button focus-button hidden gap-2 px-3 sm:flex"><Sparkles className="size-3.5 shrink-0" /><span>Bugungi fokus</span></button>
          <button type="button" onClick={onAddProject} className="navbar-new-project"><Plus className="size-4 shrink-0" /><span>Yangi loyiha</span></button>
        </div>
        {theme && onThemeChange && visibleThemes.length > 1 && (
          <div className="navbar-view-toggle" aria-label="Workspace ko‘rinishi">
            {visibleThemes.map((item) => (
              <button key={item.id} type="button" onClick={() => onThemeChange(item.id)} className={cn(theme === item.id && "active")}>
                {item.name}
              </button>
            ))}
          </div>
        )}
          <button className="profile-button grid size-9 shrink-0 place-items-center rounded-full bg-[#d5e7dd] text-[11px] font-bold text-[#16231d]">SH</button>
        </div>
      </div>
    </header>
  );
}

function ProjectGrid({
  theme,
  onThemeChange,
  hideOrbitOption,
  projects,
  hydrated,
  onAddProject,
  onProject,
}: {
  theme: UiTheme;
  onThemeChange: (theme: UiTheme) => void;
  hideOrbitOption: boolean;
  projects: WorkspaceProjectRow[];
  hydrated: boolean;
  onAddProject: (project: Project) => void;
  onProject: (projectId: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [orbitRotation, setOrbitRotation] = useState(0);
  const [orbitDragging, setOrbitDragging] = useState(false);
  const [orbitGliding, setOrbitGliding] = useState(false);
  const [orbitSnapping, setOrbitSnapping] = useState(false);
  const orbitDrag = useRef({ startX: 0, startRotation: 0, lastX: 0, lastTime: 0, velocity: 0 });
  const orbitFrame = useRef<number | null>(null);
  const suppressProjectClick = useRef(false);
  const orbitPointerCaptured = useRef(false);
  const orbitSnapTimer = useRef<number | null>(null);
  const orbitSnapEndTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (orbitFrame.current !== null) window.cancelAnimationFrame(orbitFrame.current);
    if (orbitSnapTimer.current !== null) window.clearTimeout(orbitSnapTimer.current);
    if (orbitSnapEndTimer.current !== null) window.clearTimeout(orbitSnapEndTimer.current);
  }, []);

  function scheduleOrbitSnap(delay = 150) {
    if (orbitSnapTimer.current !== null) window.clearTimeout(orbitSnapTimer.current);
    orbitSnapTimer.current = window.setTimeout(() => {
      setOrbitSnapping(true);
      setOrbitRotation((value) => Math.round(value));
      if (orbitSnapEndTimer.current !== null) window.clearTimeout(orbitSnapEndTimer.current);
      orbitSnapEndTimer.current = window.setTimeout(() => setOrbitSnapping(false), 620);
    }, delay);
  }

  function onThreeDWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (theme !== "orbit") return;
    event.preventDefault();
    if (orbitSnapEndTimer.current !== null) window.clearTimeout(orbitSnapEndTimer.current);
    setOrbitSnapping(false);
    const movement = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    setOrbitRotation((value) => value - movement * .00198);
    scheduleOrbitSnap();
  }

  function onOrbitPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (theme !== "orbit") return;
    if (orbitFrame.current !== null) window.cancelAnimationFrame(orbitFrame.current);
    if (orbitSnapTimer.current !== null) window.clearTimeout(orbitSnapTimer.current);
    if (orbitSnapEndTimer.current !== null) window.clearTimeout(orbitSnapEndTimer.current);
    setOrbitSnapping(false);
    const now = performance.now();
    orbitDrag.current = { startX: event.clientX, startRotation: orbitRotation, lastX: event.clientX, lastTime: now, velocity: 0 };
    suppressProjectClick.current = false;
    setOrbitDragging(true);
  }

  function onOrbitPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (theme !== "orbit" || !orbitDragging) return;
    const now = performance.now();
    const elapsed = Math.max(8, now - orbitDrag.current.lastTime);
    const movement = event.clientX - orbitDrag.current.lastX;
    orbitDrag.current.velocity = movement / 165 / elapsed;
    orbitDrag.current.lastX = event.clientX;
    orbitDrag.current.lastTime = now;
    const distance = event.clientX - orbitDrag.current.startX;
    if (Math.abs(distance) > 8) {
      suppressProjectClick.current = true;
      if (!orbitPointerCaptured.current) {
        event.currentTarget.setPointerCapture(event.pointerId);
        orbitPointerCaptured.current = true;
      }
    }
    setOrbitRotation(orbitDrag.current.startRotation + distance / 165);
  }

  function onOrbitPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (theme !== "orbit" || !orbitDragging) return;
    if (orbitPointerCaptured.current && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    orbitPointerCaptured.current = false;
    setOrbitDragging(false);
    if (!suppressProjectClick.current) {
      setOrbitGliding(false);
      return;
    }
    setOrbitGliding(true);
    let velocity = orbitDrag.current.velocity * 16;
    const glide = () => {
      velocity *= .92;
      if (Math.abs(velocity) < .001) {
        orbitFrame.current = null;
        setOrbitGliding(false);
        scheduleOrbitSnap(0);
        return;
      }
      setOrbitRotation((value) => value + velocity);
      orbitFrame.current = window.requestAnimationFrame(glide);
    };
    orbitFrame.current = window.requestAnimationFrame(glide);
  }
  return (
    <div className="workspace-grid-page relative z-[2] min-h-[100dvh]">
      <Header theme={theme} onThemeChange={onThemeChange} onAddProject={() => setPickerOpen(true)} hideOrbitOption={hideOrbitOption} />
      <section className="project-grid-section mx-auto max-w-[1480px] px-5 pb-14 pt-5 md:px-9 md:pt-7">
        {!hydrated ? (
          <p className="py-24 text-center text-[13px] text-white/30">Yuklanmoqda...</p>
        ) : (
        <div
          className={cn("project-grid", theme === "orbit" && "orbit-draggable", orbitDragging && "is-dragging", orbitGliding && "is-gliding", orbitSnapping && "is-snapping")}
          onPointerDown={onOrbitPointerDown}
          onPointerMove={onOrbitPointerMove}
          onPointerUp={onOrbitPointerUp}
          onPointerCancel={onOrbitPointerUp}
          onWheel={onThreeDWheel}
        >
          {projects.map((project, index) => {
            const { tint, glow } = projectTint(project.color);
            const pct = project.total ? Math.round((project.done / project.total) * 100) : 0;
            return (
            <button
              key={project.id}
              onClick={() => {
                if (suppressProjectClick.current) {
                  suppressProjectClick.current = false;
                  return;
                }
                onProject(project.id);
              }}
              className="project-card group text-left"
              style={{
                "--tint": tint,
                "--glow": glow,
                "--project-progress": `${pct}%`,
                animationDelay: `${index * 55}ms`,
                ...getThreeDCardStyle(theme, index, orbitRotation, projects.length),
              } as React.CSSProperties}
            >
              <div className="flex items-start justify-between">
                <span className="grid size-10 place-items-center rounded-xl" style={{ background: "color-mix(in oklch, var(--tint) 16%, transparent)", color: tint }}>
                  <ProjectIcon k={project.icon} className="size-[18px]" />
                </span>
                <span className="project-arrow"><ArrowUpRight className="size-4" /></span>
              </div>
              <div className="mt-14 lg:mt-20">
                <h2 className="project-title">{project.title}</h2>
              </div>
              <div className="mt-8">
                <div className="mb-3 flex items-end justify-between">
                  <span className="project-task-count"><b>{project.done}</b> / {project.total} task</span>
                  <span className="project-percent" style={{ color: tint }}>{pct}%</span>
                </div>
                <div className="project-progress"><div style={{ width: `${pct}%`, background: tint }} /></div>
              </div>
            </button>
            );
          })}
          <button className="add-card" onClick={() => setPickerOpen(true)}><Plus className="size-5" /><span>Yangi loyiha</span></button>
        </div>
        )}
      </section>

      <WorkspaceProjectPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={onAddProject}
        excludeIds={projects.map((p) => p.id)}
      />
    </div>
  );
}

function getThreeDCardStyle(theme: UiTheme, index: number, orbitRotation: number, total: number): React.CSSProperties {
  if (theme !== "orbit") return {};
  const delta = index - 2 + orbitRotation;

  if (theme === "orbit") {
    const angle = delta * (Math.PI * 2 / total);
    const depth = (Math.cos(angle) + 1) / 2;
    return {
      transform: `translate3d(${Math.sin(angle) * 500}px, ${(1 - depth) * 58}px, ${depth * 380 - 190}px) rotateY(${-Math.sin(angle) * 46}deg) scale(${.58 + depth * .42})`,
      zIndex: Math.round(depth * 20),
      opacity: .58 + depth * .42,
    };
  }

  return {};
}

function ProjectBoard({
  project,
  onBack,
  onRemoveFromWorkspace,
}: {
  project: WorkspaceProjectRow;
  onBack: () => void;
  onRemoveFromWorkspace: () => void;
}) {
  const { tasks, hydrated, create, update } = useProjectTasks(project.id);
  const [openedTask, setOpenedTask] = useState<ProjectTask | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOrderIds, setDragOrderIds] = useState<string[] | null>(null);
  const [finishingCurrent, setFinishingCurrent] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { tint, glow } = projectTint(project.color);

  const boardTasksBase = useMemo(
    () => tasks.filter((t) => t.inWorkspaceAt).sort((a, b) => (a.workspaceOrder ?? 0) - (b.workspaceOrder ?? 0)),
    [tasks]
  );
  const boardTasks = dragOrderIds
    ? dragOrderIds.map((id) => boardTasksBase.find((t) => t.id === id)).filter((t): t is ProjectTask => !!t)
    : boardTasksBase;
  // Faqat hali bajarilmagan ("rejadagi") tasklar taklif qilinadi — allaqachon
  // yakunlangan eski tasklarni ish taxtasiga tortishning ma'nosi yo'q.
  const notInWorkspace = useMemo(() => tasks.filter((t) => !t.inWorkspaceAt && !t.done), [tasks]);

  const activeTasks = boardTasks.filter((t) => !t.done);
  const completedTasks = boardTasks.filter((t) => t.done);
  const currentTask = boardTasks.find((t) => t.inProgress && !t.done) ?? null;
  const taskProgress = boardTasks.length ? Math.round((completedTasks.length / boardTasks.length) * 100) : 0;

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  function toggleTask(taskId: string) {
    const t = boardTasks.find((x) => x.id === taskId);
    if (!t) return;
    update(taskId, t.done ? { done: false } : { done: true, inProgress: false });
    void refreshWorkspaceProjects();
  }

  function setStatus(taskId: string, status: BoardStatus) {
    if (status === "Jarayonda") {
      for (const t of boardTasks) {
        if (t.id !== taskId && t.inProgress) update(t.id, { inProgress: false });
      }
      update(taskId, { inProgress: true, done: false });
    } else if (status === "Tugallangan") {
      update(taskId, { done: true, inProgress: false });
    } else {
      update(taskId, { done: false, inProgress: false });
    }
    void refreshWorkspaceProjects();
  }

  function handleDragOver(targetId: string) {
    if (!draggedTaskId || draggedTaskId === targetId) return;
    const base = dragOrderIds ?? boardTasksBase.map((t) => t.id);
    const sourceIndex = base.indexOf(draggedTaskId);
    const targetIndex = base.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...base];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragOrderIds(next);
  }

  function handleDragFinish() {
    if (dragOrderIds) dragOrderIds.forEach((id, i) => update(id, { workspaceOrder: i }));
    setDragOrderIds(null);
    setDraggedTaskId(null);
  }

  function finishCurrentTask() {
    if (!currentTask || finishingCurrent) return;
    setFinishingCurrent(true);
    window.setTimeout(() => {
      update(currentTask.id, { done: true, inProgress: false });
      void refreshWorkspaceProjects();
      setFinishingCurrent(false);
    }, 1080);
  }

  function removeFromWorkspace(taskId: string) {
    update(taskId, { inWorkspaceAt: undefined, workspaceOrder: undefined });
    void refreshWorkspaceProjects();
  }

  return (
    <div className="relative z-[2] min-h-[100dvh]">
      <header className="flex h-[76px] items-center justify-between border-b border-white/[.07] px-5 md:px-9">
        <button onClick={onBack} className="flex items-center gap-3 text-[13px] text-white/54 transition hover:text-white"><span className="glass-button"><ArrowLeft className="size-4" /></span><span className="hidden sm:inline">Loyihalar</span></button>
        <Brand />
        <div ref={menuRef} className="relative">
          <button type="button" onClick={() => setMenuOpen((v) => !v)} className="glass-button"><MoreHorizontal className="size-4" /></button>
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#141615] py-1 shadow-2xl">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onRemoveFromWorkspace(); }}
                className="flex w-full items-center px-3.5 py-2.5 text-left text-[13px] text-white/70 transition-colors hover:bg-white/[.06]"
              >
                Workspace&apos;dan olib tashlash
              </button>
            </div>
          )}
        </div>
      </header>
      <section className="project-board-content mx-auto max-w-[1320px] px-5 pb-12 pt-8 md:px-9 md:pt-11" style={{ "--tint": tint, "--glow": glow } as React.CSSProperties}>
        <div className="project-hero mb-5">
          <div className={cn("hero-current-task", currentTask && "has-task", finishingCurrent && "is-finishing")} role={currentTask ? "button" : undefined} tabIndex={currentTask ? 0 : undefined} onClick={() => currentTask && !finishingCurrent && setOpenedTask(currentTask)} onKeyDown={(event) => { if (event.target === event.currentTarget && currentTask && (event.key === "Enter" || event.key === " ")) setOpenedTask(currentTask); }}>
            <span><span className="live-bars"><i /><i /><i /></span>JARAYONDA</span>
            {currentTask ? <strong>{currentTask.title}</strong> : <strong className="empty">Aktiv task yo‘q</strong>}
            {currentTask && <div className="hero-current-footer"><small>{formatDuration(currentTask.durationHours)} · Cardni bosib holatini boshqaring</small><button type="button" onClick={(event) => { event.stopPropagation(); finishCurrentTask(); }} aria-label="Taskni bajarildi deb belgilash" className="hero-task-checkbox">{finishingCurrent && <Check className="task-check-icon size-4" />}</button></div>}
          </div>
          <div className="project-hero-summary">
            <div>
              <h1 className="text-[clamp(32px,4vw,56px)] font-semibold leading-none tracking-[-.055em]">{project.title}</h1>
            </div>
            <div className="project-score"><strong>{taskProgress}%</strong><span>yakunlandi</span></div>
          </div>
        </div>

        <div className="space-layout">
          <section className="task-feed">
            <div className="section-heading"><div><span className="eyebrow">FOCUSED WORK</span><h2>Hozirgi tasklar</h2></div><button type="button" onClick={() => setPickerOpen(true)} className="new-project"><Plus className="size-4" />Task qo‘shish</button></div>
            {!hydrated ? (
              <p className="py-16 text-center text-[13px] text-white/30">Yuklanmoqda...</p>
            ) : activeTasks.length === 0 && completedTasks.length === 0 ? (
              <p className="py-16 text-center text-[13px] text-white/30">Hali task yo&apos;q — &quot;Task qo&apos;shish&quot;ni bosing</p>
            ) : (
            <div className="task-list">{activeTasks.map((task, index) => <TaskRow key={task.id} task={task} index={index + 1} dragging={draggedTaskId === task.id} onOpen={() => setOpenedTask(task)} onToggle={() => toggleTask(task.id)} onDragStart={() => setDraggedTaskId(task.id)} onDragOver={() => handleDragOver(task.id)} onDrop={handleDragFinish} onDragEnd={handleDragFinish} />)}</div>
            )}
          </section>

          <aside className="project-aside">
            <div className="aside-block">
              <span className="eyebrow">PROGRESS</span>
              <div className="mt-5 flex items-end justify-between"><strong className="text-[48px] font-medium leading-none tracking-[-.06em]">{completedTasks.length}<span className="text-white/22">/{boardTasks.length}</span></strong><span className="pb-1 text-[12px] text-white/35">task</span></div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full" style={{ width: `${taskProgress}%`, background: tint }} /></div>
            </div>
            <div className="aside-block">
              <div className="mb-3 flex items-center justify-between"><span className="eyebrow">YAKUNLANGAN</span><span className="text-[10px] text-white/25">{completedTasks.length}</span></div>
              {completedTasks.map((task) => <div key={task.id} className="flex w-full items-center gap-3 border-t border-white/[.07] py-3"><span className="min-w-0 flex-1 text-[11.5px] text-white/38 line-through">{task.title}</span><button type="button" onClick={() => toggleTask(task.id)} aria-label={`${task.title} taskini qayta ochish`} className="grid size-5 shrink-0 place-items-center rounded-md bg-[#a9d6c1] text-[#183127]"><Check className="size-3" /></button></div>)}
            </div>
          </aside>
        </div>
      </section>
      {openedTask && (
        <div className="task-status-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpenedTask(null)}>
          <div className="task-status-modal">
            <div className="task-status-modal-head"><span>Task holati</span><button type="button" onClick={() => setOpenedTask(null)}><X className="size-4" /></button></div>
            <h3>{openedTask.title}</h3>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[13px] text-white/45">Davomiyligi</span>
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[.03] p-0.5 text-[11px] font-medium">
                {[1, 4].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => { update(openedTask.id, { durationHours: h }); setOpenedTask({ ...openedTask, durationHours: h }); }}
                    className={cn("rounded-md px-2.5 py-1 transition-colors", (openedTask.durationHours ?? 1) === h ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70")}
                  >
                    {h} soat
                  </button>
                ))}
              </div>
            </div>
            <div className="task-status-actions">
              {taskStatus(openedTask) === "Jarayonda" ? (
                <button type="button" className="start" onClick={() => { setStatus(openedTask.id, "Rejada"); setOpenedTask(null); }}><ArrowLeft className="size-4" /><span><b>Rejaga qaytarish</b><small>Task kutuvdagi tasklar qatoriga qaytadi</small></span></button>
              ) : (
                <button type="button" className="start" onClick={() => { setStatus(openedTask.id, "Jarayonda"); setOpenedTask(null); }}><Play className="size-4 fill-current" /><span><b>Jarayonga o‘tkazish</b><small>Headerda aktiv task bo‘lib ko‘rinadi</small></span></button>
              )}
              <button type="button" className="finish" onClick={() => { const isCurrent = taskStatus(openedTask) === "Jarayonda"; setOpenedTask(null); if (isCurrent) finishCurrentTask(); else setStatus(openedTask.id, "Tugallangan"); }}><Check className="size-4" /><span><b>Bajarildi</b><small>Task yakunlanganlar ro‘yxatiga o‘tadi</small></span></button>
            </div>
            <button
              type="button"
              onClick={() => { removeFromWorkspace(openedTask.id); setOpenedTask(null); }}
              className="mt-3 w-full rounded-xl border border-white/10 py-2.5 text-center text-[12.5px] font-medium text-white/45 transition-colors hover:bg-white/[.04] hover:text-white/75"
            >
              Workspace&apos;dan olib tashlash
            </button>
          </div>
        </div>
      )}

      <WorkspaceTaskPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        tasks={notInWorkspace}
        onCreate={(title, hours) => {
          create({ title, durationHours: hours, inWorkspaceAt: new Date().toISOString(), workspaceOrder: boardTasks.length });
          setPickerOpen(false);
        }}
        onAddExisting={(taskId, hours) => {
          update(taskId, { inWorkspaceAt: new Date().toISOString(), workspaceOrder: boardTasks.length, durationHours: hours });
          void refreshWorkspaceProjects();
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function TaskRow({ task, index, dragging, onOpen, onToggle, onDragStart, onDragOver, onDrop, onDragEnd }: { task: ProjectTask; index: number; dragging: boolean; onOpen: () => void; onToggle: () => void; onDragStart: () => void; onDragOver: () => void; onDrop: () => void; onDragEnd: () => void }) {
  const [completing, setCompleting] = useState(false);
  const [collapsing, setCollapsing] = useState(false);
  const wasDragged = useRef(false);

  function completeTask() {
    if (completing) return;
    setCompleting(true);
    window.setTimeout(() => setCollapsing(true), 700);
    window.setTimeout(onToggle, 1080);
  }

  return (
    <div
      draggable={!completing}
      onDragStart={(event) => {
        wasDragged.current = true;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(task.id));
        event.dataTransfer.setDragImage(event.currentTarget, 28, 28);
        window.requestAnimationFrame(onDragStart);
      }}
      onDragEnter={(event) => { event.preventDefault(); onDragOver(); }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
      onDrop={(event) => { event.preventDefault(); onDrop(); }}
      onDragEnd={onDragEnd}
      onClick={() => { if (wasDragged.current) { wasDragged.current = false; return; } onOpen(); }}
      className={cn("task-row group w-full cursor-grab text-left active:cursor-grabbing", completing && "is-completing", collapsing && "is-collapsing", dragging && "is-dragging")}
    >
      <span className="task-index"><GripVertical className="task-grip size-4" />{String(index).padStart(2, "0")}</span>
      <span className="min-w-0 flex-1"><strong>{task.title}</strong></span>
      <span className="task-duration">{formatDuration(task.durationHours)}</span>
      <button type="button" onClick={(event) => { event.stopPropagation(); completeTask(); }} disabled={completing} className="task-checkbox" aria-pressed={completing} aria-label={`${task.title} taskini bajarildi deb belgilash`}>
        {completing && <Check className="task-check-icon size-3.5" />}
      </button>
    </div>
  );
}

const styles = `
  .workspace-lab { --panel: rgba(26, 28, 27, .62); position: relative; background: #101211; font-family: var(--font-manrope), var(--font-geist), sans-serif; }
  .workspace-lab::before { content: ""; position: fixed; inset: 0; background: radial-gradient(circle at 50% -20%, rgba(255,255,255,.075), transparent 42%), linear-gradient(145deg, #111412 0%, #0d0f0e 60%, #121411 100%); }
  .workspace-noise { position: fixed; inset: 0; pointer-events: none; opacity: .035; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.65'/%3E%3C/svg%3E"); }
  .ambient { position: fixed; border-radius: 999px; filter: blur(90px); pointer-events: none; opacity: .18; }
  .ambient-one { width: 34vw; height: 34vw; left: -12vw; top: 18vh; background: #5c8f78; }
  .ambient-two { width: 28vw; height: 28vw; right: -8vw; bottom: -8vh; background: #826c91; }
  .workspace-header { height:80px;padding-block:8px; }
  .navbar-inner { width:min(100% - 48px,1320px);height:100%;display:flex;align-items:center;justify-content:space-between;margin-inline:auto; }
  .glass-button { display: flex; height: 38px; width: 38px; flex-shrink:0; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,.09); border-radius: 10px; background: rgba(255,255,255,.045); color: rgba(255,255,255,.6); font-size: 13px; backdrop-filter: blur(18px); transition: .2s ease; }
  .glass-button:hover { background: rgba(255,255,255,.09); color: white; }
  .header-actions,.header-action-group { display:flex;align-items:center; }
  .header-actions { flex-shrink:0;gap:7px; }
  .header-action-group { gap:6px;padding-right:1px; }
  .focus-button { width:auto;min-width:max-content;white-space:nowrap; }
  .navbar-new-project { display:flex;height:38px;min-width:max-content;flex-shrink:0;align-items:center;justify-content:center;gap:6px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:#e8e8e5;padding:0 12px;color:#151716;font-size:12px;font-weight:700;white-space:nowrap;transition:background .2s ease,transform .2s ease; }
  .navbar-new-project:hover { background:#fff;transform:translateY(-1px); }
  .navbar-view-toggle { display:flex;height:34px;flex-shrink:0;align-items:center;gap:2px;border:1px solid rgba(255,255,255,.09);border-radius:9px;background:rgba(255,255,255,.035);padding:3px;backdrop-filter:blur(18px); }
  .navbar-view-toggle button { height:26px;flex-shrink:0;white-space:nowrap;border-radius:6px;padding:0 9px;color:rgba(255,255,255,.38);font-size:11px;font-weight:600;letter-spacing:-.01em;transition:background .2s ease,color .2s ease,box-shadow .2s ease; }
  .navbar-view-toggle button:hover { color:rgba(255,255,255,.72); }
  .navbar-view-toggle button.active { background:rgba(255,255,255,.1);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 1px 3px rgba(0,0,0,.18); }
  .new-project { display:inline-flex; height: 42px; align-items: center; justify-content: center; gap: 7px; flex-shrink: 0; border-radius: 12px; padding: 0 17px; color: #10120f; font-size: 13.5px; font-weight: 650; letter-spacing: -.01em; background: linear-gradient(155deg, color-mix(in oklch, var(--tint,#e5e5dd) 92%, white), var(--tint,#e5e5dd)); box-shadow: 0 10px 26px -10px color-mix(in oklch, var(--tint,#e5e5dd) 70%, transparent), inset 0 1px 0 rgba(255,255,255,.5); transition: transform .2s ease, box-shadow .2s ease, filter .2s ease; }
  .new-project:hover { transform: translateY(-1px); filter: brightness(1.04); box-shadow: 0 14px 32px -10px color-mix(in oklch, var(--tint,#e5e5dd) 75%, transparent), inset 0 1px 0 rgba(255,255,255,.6); }
  .new-project:active { transform: translateY(0); filter: brightness(.98); }
  .project-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; }
  .project-card { position: relative; overflow: hidden; min-height: 340px; border: 1px solid rgba(255,255,255,.105); border-radius: 22px; background: linear-gradient(145deg, rgba(255,255,255,.085), rgba(255,255,255,.025)); padding: 25px; box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 22px 60px rgba(0,0,0,.16); backdrop-filter: blur(26px) saturate(115%); animation: card-in .55s both cubic-bezier(.2,.8,.2,1); transition: transform .25s ease, border-color .25s ease, background .25s ease; }
  .project-card::before { content: ""; position: absolute; width: 190px; height: 190px; border-radius: 999px; right: -60px; top: -80px; background: var(--glow); filter: blur(38px); opacity: .7; transition: opacity .25s ease; }
  .project-card:hover { transform: translateY(-4px); border-color: color-mix(in srgb, var(--tint) 40%, transparent); background: linear-gradient(145deg, rgba(255,255,255,.11), rgba(255,255,255,.035)); }
  .project-card:hover::before { opacity: 1; }
  .project-code { position: relative; display: grid; width: 42px; height: 42px; place-items: center; border: 1px solid color-mix(in srgb, var(--tint) 28%, transparent); border-radius: 11px; background: color-mix(in srgb, var(--tint) 10%, transparent); color: var(--tint); font-size: 14px; font-weight: 700; letter-spacing: .04em; }
  .project-arrow { position: relative; display: grid; width: 32px; height: 32px; place-items: center; border-radius: 999px; color: rgba(255,255,255,.25); transition: .2s ease; }
  .project-card:hover .project-arrow { background: rgba(255,255,255,.09); color: white; }
  .project-title { font-size: clamp(27px,2.4vw,39px); font-weight: 650; line-height: .98; letter-spacing: -.055em; }
  .project-description { margin-top: 13px; color: rgba(255,255,255,.46); font-size: 16px; line-height: 1.45; letter-spacing: -.015em; }
  .project-task-count { color: rgba(255,255,255,.48); font-size: 16px; }
  .project-task-count b { color: rgba(255,255,255,.9); font-size: 20px; font-weight: 600; letter-spacing: -.03em; }
  .project-percent { font-size: 18px; font-weight: 650; letter-spacing: -.035em; }
  .project-progress { height: 8px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.09); box-shadow: inset 0 1px 2px rgba(0,0,0,.22); }
  .project-progress > div { height: 100%; border-radius: inherit; box-shadow: 0 0 16px currentColor; }
  .add-card { min-height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; border: 1px dashed rgba(255,255,255,.09); border-radius: 22px; color: rgba(255,255,255,.3); font-size: 15px; transition: .2s ease; }
  .add-card:hover { border-color: rgba(255,255,255,.2); color: rgba(255,255,255,.65); background: rgba(255,255,255,.025); }
  .project-hero { position: relative; overflow: hidden; display: flex; min-height: 220px; align-items: flex-end; justify-content: space-between; gap: 30px; border: 1px solid rgba(255,255,255,.1); border-radius: 24px; padding: 28px; background: linear-gradient(130deg, rgba(255,255,255,.085), rgba(255,255,255,.025)); box-shadow: inset 0 1px 0 rgba(255,255,255,.06); backdrop-filter: blur(26px); }
  .project-hero::after { content: ""; position: absolute; width: 320px; height: 320px; right: -50px; top: -170px; border-radius: 999px; background: var(--glow); filter: blur(55px); }
  .project-score { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: flex-end; }
  .project-score strong { color: var(--tint); font-size: clamp(38px,5vw,64px); font-weight: 500; line-height: .9; letter-spacing: -.06em; }
  .project-score span { margin-top: 9px; color: rgba(255,255,255,.38); font-size: 14px; text-transform: uppercase; letter-spacing: .1em; }
  .hero-current-task { position:relative;z-index:1;width:100%;min-height:146px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;border:1px solid rgba(169,214,193,.14);border-radius:20px;background:linear-gradient(145deg,rgba(169,214,193,.085),rgba(169,214,193,.025));padding:20px 22px; }
  .hero-current-task.has-task { cursor:pointer;transition:background .25s ease; }
  .hero-current-task.has-task:hover { background:linear-gradient(145deg,rgba(169,214,193,.12),rgba(169,214,193,.04)); }
  .hero-current-task::after { content:"";position:absolute;width:150px;height:150px;right:-45px;top:-65px;border-radius:999px;background:rgba(112,211,166,.1);filter:blur(28px);animation:activeGlow 3.2s ease-in-out infinite; }
  .hero-current-task > span { position:relative;z-index:1;display:flex;align-items:center;gap:9px;color:#a9d6c1;font-size:10px;font-weight:700;letter-spacing:.14em; }
  .live-bars { display:flex;align-items:flex-end;gap:2px;width:13px;height:12px; }
  .live-bars i { width:2px;border-radius:99px;background:#a9d6c1;animation:liveBar .9s ease-in-out infinite alternate; }
  .live-bars i:nth-child(1) { height:5px; }
  .live-bars i:nth-child(2) { height:11px;animation-delay:-.3s; }
  .live-bars i:nth-child(3) { height:7px;animation-delay:-.6s; }
  .hero-current-task strong { position:relative;z-index:1;display:block;overflow:hidden;margin-top:15px;color:rgba(255,255,255,.92);font-size:clamp(20px,2vw,27px);font-weight:600;line-height:1.08;letter-spacing:-.04em;text-overflow:ellipsis;white-space:nowrap; }
  .hero-current-task strong.empty { color:rgba(255,255,255,.28);font-weight:500; }
  .hero-current-footer { position:relative;z-index:2;display:flex;align-items:end;justify-content:space-between;gap:14px;margin-top:16px; }
  .hero-current-task small { display:block;color:rgba(255,255,255,.34);font-size:11px; }
  .hero-task-checkbox { position:relative;display:grid;width:32px;height:32px;flex:none;place-items:center;border:1px solid rgba(169,214,193,.32);border-radius:10px;background:rgba(169,214,193,.08);color:#183127;transition:.2s ease; }
  .hero-task-checkbox:hover { background:#a9d6c1;box-shadow:0 0 22px rgba(169,214,193,.22); }
  .hero-current-task.is-finishing { border-color:rgba(169,214,193,.55);background:rgba(66,139,104,.3);animation:activeFinish .72s cubic-bezier(.16,1,.3,1) both; }
  .hero-current-task.is-finishing .hero-task-checkbox { background:#a9d6c1;animation:checkBloom .62s cubic-bezier(.2,.9,.25,1) both; }
  .hero-current-task.is-finishing::before { content:"";position:absolute;z-index:0;inset:0;background:linear-gradient(90deg,transparent,rgba(188,244,216,.2),rgba(169,214,193,.08),transparent);transform:translateX(-110%);animation:taskSweep .72s cubic-bezier(.2,.75,.2,1) forwards; }
  .hero-current-task.is-finishing .hero-task-checkbox::after { content:"";position:absolute;inset:-9px;border:1px solid rgba(169,214,193,.55);border-radius:14px;animation:checkRing .68s ease-out forwards; }
  .hero-current-task.is-finishing .task-check-icon { animation:checkDraw .38s .08s cubic-bezier(.2,.9,.2,1) both; }
  .space-layout { display: grid; grid-template-columns: minmax(0,1fr) 280px; gap: 14px; }
  .task-feed, .project-aside { border: 1px solid rgba(255,255,255,.07); border-radius: 20px; background: rgba(255,255,255,.025); padding: 18px; backdrop-filter: blur(22px); }
  .section-heading { display: flex; min-height: 78px; align-items: flex-start; justify-content: space-between; gap: 20px; }
  .section-heading h2 { margin-top: 6px; font-size: 28px; font-weight: 550; letter-spacing: -.045em; }
  .eyebrow { color: rgba(255,255,255,.36); font-size: 14px; font-weight: 650; letter-spacing: .12em; }
  .task-row { position:relative;display: grid; grid-template-columns: 38px minmax(0,1fr) auto 24px; align-items: center; gap: 15px; min-height: 88px;max-height:140px;overflow:hidden;border: 1px solid rgba(255,255,255,.075); border-radius: 17px; background: rgba(255,255,255,.04); padding: 17px 15px; }
  .task-row > * { position:relative;z-index:1; }
  .task-row:hover { border-color: rgba(255,255,255,.075); background: rgba(255,255,255,.065); transform:none; }
  .task-index { display:flex;align-items:center;gap:3px;color: rgba(255,255,255,.26); font-family: var(--font-geist-mono), monospace; font-size: 14px; }
  .task-grip { margin-left:-5px;opacity:.32; }
  .task-checkbox { display:grid;width:22px;height:22px;place-items:center;border:1px solid rgba(255,255,255,.24);border-radius:7px;background:rgba(255,255,255,.025);transition:.2s ease; }
  .task-checkbox:hover { border-color:#a9d6c1;background:rgba(169,214,193,.1);box-shadow:0 0 0 3px rgba(169,214,193,.06); }
  .task-row.is-completing::after { content:"";position:absolute;z-index:0;inset:0;background:linear-gradient(90deg,transparent,rgba(169,214,193,.15),rgba(169,214,193,.06),transparent);transform:translateX(-110%);animation:taskSweep .72s cubic-bezier(.2,.75,.2,1) forwards; }
  .task-row.is-completing .task-checkbox { border-color:#a9d6c1;background:#a9d6c1;color:#183127;box-shadow:0 0 0 5px rgba(169,214,193,.1),0 0 24px rgba(169,214,193,.28);animation:checkBloom .62s cubic-bezier(.2,.9,.25,1) both; }
  .task-row.is-completing .task-checkbox::after { content:"";position:absolute;inset:-9px;border:1px solid rgba(169,214,193,.5);border-radius:12px;animation:checkRing .68s ease-out forwards; }
  .task-row.is-completing .task-check-icon { animation:checkDraw .38s .08s cubic-bezier(.2,.9,.2,1) both; }
  .task-row.is-completing strong { color:#e4fff2; }
  .task-row.is-completing:hover .task-index,.task-row.is-completing:hover strong,.task-row.is-completing:hover small,.task-row.is-completing:hover .task-duration { transform:none; }
  .task-list .task-row { margin-bottom:10px; }
  .task-list .task-row:last-child { margin-bottom:0; }
  .task-row.is-collapsing { min-height:0;max-height:0;margin-bottom:0;padding-block:0;border-width:0;opacity:0;transform:scale(.985);transition:min-height .38s cubic-bezier(.4,0,.2,1),max-height .38s cubic-bezier(.4,0,.2,1),margin-bottom .38s cubic-bezier(.4,0,.2,1),padding .38s cubic-bezier(.4,0,.2,1),border-width .25s ease,opacity .24s ease,transform .38s ease; }
  .task-row.is-collapsing > * { opacity:0;transition:opacity .18s ease; }
  .task-row.is-dragging { opacity:0;box-shadow:none; }
  .task-list .task-row:not(.is-dragging) { transition:min-height .3s ease,max-height .3s ease,margin .3s ease,transform .28s cubic-bezier(.16,1,.3,1),opacity .2s ease; }
  .task-duration { color:rgba(255,255,255,.32);font-size:12px;white-space:nowrap; }
  .task-status-dot { width: 7px; height: 7px; border-radius: 999px; }
  .task-status-dot.active { background: #dfb67e; box-shadow: 0 0 12px rgba(223,182,126,.45); }
  .task-status-dot.planned { border: 1px solid rgba(255,255,255,.28); }
  .task-row strong, .task-row small { display: block; }
  .task-row strong { color: rgba(255,255,255,.88); font-size: 19px; font-weight: 550; letter-spacing: -.025em; }
  .task-row small { overflow: hidden; margin-top: 5px; color: rgba(255,255,255,.42); font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
  .task-open { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 9px; color: rgba(255,255,255,.2); transition: .2s ease; }
  .task-row:hover .task-open { background: rgba(255,255,255,.07); color: rgba(255,255,255,.75); }
  .project-aside { padding: 0; background: rgba(255,255,255,.018); }
  .aside-block { padding: 20px; }
  .aside-block + .aside-block { border-top: 1px solid rgba(255,255,255,.07); }
  .task-panel { border-left: 1px solid rgba(255,255,255,.1); background: rgba(18,20,19,.82); box-shadow: -30px 0 90px rgba(0,0,0,.35); backdrop-filter: blur(34px) saturate(125%); animation: panel-in .35s cubic-bezier(.2,.8,.2,1); }
  .task-status-modal-backdrop { position:fixed;z-index:80;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.56);padding:20px;backdrop-filter:blur(8px);animation:modalFade .2s ease both; }
  .task-status-modal { width:min(100%,480px);border:1px solid rgba(255,255,255,.12);border-radius:24px;background:rgba(17,20,19,.94);padding:24px;box-shadow:0 35px 100px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(34px);animation:modalRise .38s cubic-bezier(.16,1,.3,1) both; }
  .task-status-modal-head { display:flex;align-items:center;justify-content:space-between;color:rgba(255,255,255,.38);font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase; }
  .task-status-modal-head button { display:grid;width:34px;height:34px;place-items:center;border:1px solid rgba(255,255,255,.09);border-radius:10px;color:rgba(255,255,255,.5); }
  .task-status-modal h3 { margin-top:26px;color:#fff;font-size:30px;font-weight:650;line-height:1.08;letter-spacing:-.045em; }
  .task-status-modal > p { margin-top:10px;color:rgba(255,255,255,.42);font-size:14px; }
  .task-status-actions { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:28px; }
  .task-status-actions > button { display:flex;min-height:92px;align-items:flex-start;gap:11px;border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:16px;text-align:left;transition:transform .25s cubic-bezier(.16,1,.3,1),background .2s ease,border-color .2s ease; }
  .task-status-actions > button:hover { transform:translateY(-3px); }
  .task-status-actions .start { background:rgba(225,185,133,.06);color:#e1b985; }
  .task-status-actions .start:hover { border-color:rgba(225,185,133,.3);background:rgba(225,185,133,.1); }
  .task-status-actions .finish { background:rgba(169,214,193,.06);color:#a9d6c1; }
  .task-status-actions .finish:hover { border-color:rgba(169,214,193,.3);background:rgba(169,214,193,.1); }
  .task-status-actions b,.task-status-actions small { display:block; }
  .task-status-actions b { color:rgba(255,255,255,.88);font-size:14px; }
  .task-status-actions small { margin-top:6px;color:rgba(255,255,255,.34);font-size:11px;line-height:1.35; }
  .workspace-lab [class*="text-[10px]"] { font-size: 13px !important; }
  .workspace-lab [class*="text-[10.5px]"] { font-size: 14px !important; }
  .workspace-lab [class*="text-[11px]"] { font-size: 14px !important; }
  .workspace-lab [class*="text-[11.5px]"] { font-size: 15px !important; }
  .workspace-lab [class*="text-[12px]"] { font-size: 15px !important; }
  .workspace-lab [class*="text-[13px]"] { font-size: 16px !important; }
  .workspace-lab [class*="text-[15px]"] { font-size: 18px !important; }

  .theme-switcher { position: fixed; z-index: 80; left: 50%; bottom: max(14px,env(safe-area-inset-bottom)); display: flex; width: min(1180px,calc(100% - 24px)); gap: 5px; overflow-x: auto; padding: 6px; border: 1px solid rgba(255,255,255,.14); border-radius: 18px; background: rgba(12,13,12,.92); box-shadow: 0 18px 55px rgba(0,0,0,.32); backdrop-filter: blur(20px); scrollbar-width: none; transform: translateX(-50%); }
  .theme-switcher::-webkit-scrollbar { display: none; }
  .theme-switcher button { display: grid; flex: 1 0 105px; grid-template-columns: 25px 1fr; align-items: center; gap: 5px; min-width: 0; min-height: 52px; border-radius: 12px; padding: 6px 8px; color: rgba(255,255,255,.42); text-align: left; transition: .2s ease; }
  .theme-switcher button:hover { color: rgba(255,255,255,.8); background: rgba(255,255,255,.05); }
  .theme-switcher button.active { color: #111; background: #f2f1eb; }
  .theme-number { font-family: var(--font-geist-mono), monospace; font-size: 10px; opacity: .42; }
  .theme-switcher strong, .theme-switcher small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .theme-switcher strong { font-size: 13px; font-weight: 650; letter-spacing: -.015em; }
  .theme-switcher small { margin-top: 2px; font-size: 10px; opacity: .48; }

  /* Besh xil zamonaviy glass materiali uchun umumiy renderer */
  .theme-obsidian, .theme-frost, .theme-aurora, .theme-smoke, .theme-pearl { color: var(--ink); background: var(--page); font-family: var(--theme-font); }
  .theme-obsidian::before, .theme-frost::before, .theme-aurora::before, .theme-smoke::before, .theme-pearl::before { background: var(--backdrop); }
  .theme-obsidian header, .theme-frost header, .theme-aurora header, .theme-smoke header, .theme-pearl header { border-color: var(--line) !important; }
  .theme-obsidian .project-card, .theme-frost .project-card, .theme-aurora .project-card, .theme-smoke .project-card, .theme-pearl .project-card { border-color: var(--line); border-radius: var(--card-radius); background: var(--glass); box-shadow: var(--card-shadow), inset 0 1px 0 var(--shine); backdrop-filter: blur(var(--blur)) saturate(var(--saturation)); }
  .theme-obsidian .project-card:hover, .theme-frost .project-card:hover, .theme-aurora .project-card:hover, .theme-smoke .project-card:hover, .theme-pearl .project-card:hover { border-color: var(--line-hover); background: var(--glass-hover); box-shadow: var(--card-shadow-hover), inset 0 1px 0 var(--shine); }
  .theme-obsidian .project-hero, .theme-obsidian .task-feed, .theme-obsidian .project-aside, .theme-frost .project-hero, .theme-frost .task-feed, .theme-frost .project-aside, .theme-aurora .project-hero, .theme-aurora .task-feed, .theme-aurora .project-aside, .theme-smoke .project-hero, .theme-smoke .task-feed, .theme-smoke .project-aside, .theme-pearl .project-hero, .theme-pearl .task-feed, .theme-pearl .project-aside { border-color: var(--line); border-radius: var(--panel-radius); background: var(--panel-glass); box-shadow: inset 0 1px 0 var(--shine); backdrop-filter: blur(var(--blur)) saturate(var(--saturation)); }
  .theme-obsidian .task-row, .theme-frost .task-row, .theme-aurora .task-row, .theme-smoke .task-row, .theme-pearl .task-row { border-color: var(--line); border-radius: var(--row-radius); background: var(--row-glass); }
  .theme-obsidian .task-row:hover, .theme-frost .task-row:hover, .theme-aurora .task-row:hover, .theme-smoke .task-row:hover, .theme-pearl .task-row:hover { border-color: var(--line-hover); background: var(--glass-hover); }
  .theme-obsidian .glass-button, .theme-frost .glass-button, .theme-aurora .glass-button, .theme-smoke .glass-button, .theme-pearl .glass-button { border-color: var(--line); background: var(--row-glass); color: var(--muted-ink); backdrop-filter: blur(var(--blur)); }
  .theme-obsidian .task-panel, .theme-frost .task-panel, .theme-aurora .task-panel, .theme-smoke .task-panel, .theme-pearl .task-panel { border-color: var(--line); background: var(--drawer); color: var(--ink); backdrop-filter: blur(36px) saturate(var(--saturation)); }

  /* 01 — Obsidian: qora kristall, juda nozik chiziqlar */
  .theme-obsidian { --page:#080a0a; --ink:#f4f7f5; --muted-ink:rgba(244,247,245,.6); --line:rgba(255,255,255,.09); --line-hover:rgba(255,255,255,.22); --glass:rgba(255,255,255,.045); --glass-hover:rgba(255,255,255,.075); --panel-glass:rgba(19,22,21,.58); --row-glass:rgba(255,255,255,.035); --drawer:rgba(10,12,11,.84); --shine:rgba(255,255,255,.09); --backdrop:radial-gradient(circle at 50% -10%,#26362f 0,transparent 36%),#080a0a; --card-shadow:0 30px 80px rgba(0,0,0,.25); --card-shadow-hover:0 34px 90px rgba(0,0,0,.36); --card-radius:26px; --panel-radius:24px; --row-radius:16px; --blur:28px; --saturation:120%; --theme-font:var(--font-inter),sans-serif; }

  /* 02 — Frost: yorug' muzli qatlam, moviy soyalar */
  .theme-frost { --page:#dfeaf1; --ink:#15232b; --muted-ink:rgba(21,35,43,.6); --line:rgba(255,255,255,.62); --line-hover:rgba(255,255,255,.95); --glass:rgba(255,255,255,.42); --glass-hover:rgba(255,255,255,.58); --panel-glass:rgba(255,255,255,.35); --row-glass:rgba(255,255,255,.32); --drawer:rgba(239,247,250,.82); --shine:rgba(255,255,255,.9); --backdrop:radial-gradient(circle at 8% 20%,#b5d4e5,transparent 32%),radial-gradient(circle at 90% 85%,#c7d4f0,transparent 38%),#dfeaf1; --card-shadow:0 24px 60px rgba(57,83,99,.12); --card-shadow-hover:0 30px 70px rgba(57,83,99,.18); --card-radius:28px; --panel-radius:26px; --row-radius:17px; --blur:32px; --saturation:135%; --theme-font:var(--font-geist),sans-serif; }
  .theme-frost [class*="text-white"], .theme-frost .task-row strong, .theme-frost .project-task-count b { color: rgba(21,35,43,.68) !important; }
  .theme-frost .project-title, .theme-frost h1 { color:#15232b; }
  .theme-frost .project-description, .theme-frost .project-task-count, .theme-frost .task-row small, .theme-frost .eyebrow { color:rgba(21,35,43,.5); }
  .theme-frost .project-progress { background:rgba(21,35,43,.1); }

  /* 03 — Aurora: ko'k tun va rangli nur sinishi */
  .theme-aurora { --page:#0a1020; --ink:#f1f5ff; --muted-ink:rgba(241,245,255,.62); --line:rgba(184,207,255,.14); --line-hover:rgba(190,216,255,.3); --glass:linear-gradient(145deg,rgba(161,188,255,.13),rgba(255,255,255,.035)); --glass-hover:linear-gradient(145deg,rgba(161,188,255,.19),rgba(255,255,255,.055)); --panel-glass:rgba(17,27,51,.58); --row-glass:rgba(152,180,255,.07); --drawer:rgba(10,17,34,.84); --shine:rgba(210,226,255,.15); --backdrop:radial-gradient(circle at 12% 18%,rgba(95,92,246,.5),transparent 29%),radial-gradient(circle at 85% 75%,rgba(32,190,178,.28),transparent 34%),#0a1020; --card-shadow:0 28px 75px rgba(0,0,0,.24); --card-shadow-hover:0 34px 90px rgba(0,0,0,.36); --card-radius:24px; --panel-radius:24px; --row-radius:15px; --blur:30px; --saturation:145%; --theme-font:var(--font-manrope),sans-serif; }

  /* 04 — Smoke: neytral kulrang, yumshoq diffuz shisha */
  .theme-smoke { --page:#1d1d1c; --ink:#f0efea; --muted-ink:rgba(240,239,234,.58); --line:rgba(255,255,255,.1); --line-hover:rgba(255,255,255,.2); --glass:rgba(226,225,218,.07); --glass-hover:rgba(226,225,218,.105); --panel-glass:rgba(47,47,45,.56); --row-glass:rgba(255,255,255,.04); --drawer:rgba(30,30,29,.86); --shine:rgba(255,255,255,.08); --backdrop:radial-gradient(circle at 50% 0,#41413e,transparent 40%),#1d1d1c; --card-shadow:0 16px 45px rgba(0,0,0,.18); --card-shadow-hover:0 22px 60px rgba(0,0,0,.28); --card-radius:18px; --panel-radius:18px; --row-radius:13px; --blur:42px; --saturation:75%; --theme-font:var(--font-hanken),sans-serif; }
  .theme-smoke .project-card::before, .theme-smoke .project-hero::after { filter:blur(70px); opacity:.32; }

  /* 05 — Pearl: iliq yorug' shisha va juda sokin pastel ranglar */
  .theme-pearl { --page:#eeeae4; --ink:#282725; --muted-ink:rgba(40,39,37,.58); --line:rgba(255,255,255,.7); --line-hover:rgba(255,255,255,.98); --glass:rgba(255,255,255,.46); --glass-hover:rgba(255,255,255,.64); --panel-glass:rgba(255,255,255,.4); --row-glass:rgba(255,255,255,.36); --drawer:rgba(247,244,239,.86); --shine:#fff; --backdrop:radial-gradient(circle at 15% 15%,#ead6cf,transparent 32%),radial-gradient(circle at 88% 72%,#d7dfd4,transparent 35%),#eeeae4; --card-shadow:0 25px 65px rgba(78,68,58,.1); --card-shadow-hover:0 32px 75px rgba(78,68,58,.16); --card-radius:32px; --panel-radius:30px; --row-radius:20px; --blur:34px; --saturation:125%; --theme-font:var(--font-jakarta),sans-serif; }
  .theme-pearl [class*="text-white"], .theme-pearl .task-row strong, .theme-pearl .project-task-count b { color:rgba(40,39,37,.68) !important; }
  .theme-pearl .project-title, .theme-pearl h1 { color:#282725; }
  .theme-pearl .project-description, .theme-pearl .project-task-count, .theme-pearl .task-row small, .theme-pearl .eyebrow { color:rgba(40,39,37,.5); }
  .theme-pearl .project-progress { background:rgba(40,39,37,.1); }

  /* Effektlar bir-biridan real farq qilishi uchun material override'lari */
  .theme-frost .project-card { border:0; background:#dfeaf1; box-shadow:12px 12px 28px #bac7ce,-12px -12px 28px #fff; backdrop-filter:none; }
  .theme-frost .project-card:hover { background:#e6f0f5; box-shadow:16px 16px 34px #b5c1c8,-14px -14px 32px #fff; }
  .theme-frost .project-hero, .theme-frost .task-feed, .theme-frost .project-aside, .theme-frost .task-row { border:0; background:#dfeaf1; box-shadow:7px 7px 18px #becbd2,-7px -7px 18px #fff; backdrop-filter:none; }
  .theme-smoke .project-card, .theme-smoke .project-hero, .theme-smoke .task-feed, .theme-smoke .project-aside { background:#252524; box-shadow:none; backdrop-filter:none; }
  .theme-smoke .project-card:hover { background:#2c2c2a; box-shadow:none; }
  .theme-smoke .project-card::before, .theme-smoke .project-hero::after { display:none; }
  .theme-pearl .project-card { border:0; background:#ebe2dc; box-shadow:inset 3px 3px 8px rgba(255,255,255,.8),inset -3px -3px 8px rgba(96,68,55,.12),0 18px 35px rgba(84,63,51,.13); backdrop-filter:none; }
  .theme-pearl .project-card:hover { background:#f1e9e4; box-shadow:inset 3px 3px 8px white,inset -3px -3px 8px rgba(96,68,55,.1),0 24px 45px rgba(84,63,51,.17); }
  .theme-pearl .project-code { border:0; box-shadow:inset 2px 2px 4px rgba(70,50,40,.12),inset -2px -2px 4px white; }

  /* 06 — Editorial: jurnal kompozitsiyasi, serif va qog'oz teksturasi */
  .theme-editorial { color:#24211d; background:#e9e3d8; font-family:var(--font-manrope),sans-serif; }
  .theme-editorial::before { background:linear-gradient(90deg,transparent 49.9%,rgba(41,35,28,.08) 50%,transparent 50.1%),#e9e3d8; }
  .theme-editorial .ambient { display:none; }
  .theme-editorial [class*="text-white"] { color:rgba(36,33,29,.64) !important; }
  .theme-editorial header { border-color:rgba(36,33,29,.18) !important; }
  .theme-editorial h1, .theme-editorial .project-title, .theme-editorial .section-heading h2, .theme-editorial .task-panel h2 { color:#24211d; font-family:var(--font-serif),Georgia,serif; font-weight:400; }
  .theme-editorial .project-title { font-size:clamp(36px,3vw,49px); }
  .theme-editorial .project-card { border-width:1px 0 0; border-color:#24211d; border-radius:0; background:transparent; box-shadow:none; backdrop-filter:none; }
  .theme-editorial .project-card::before { display:none; }
  .theme-editorial .project-card:hover { border-color:#24211d; background:rgba(255,255,255,.22); box-shadow:none; }
  .theme-editorial .project-code { border-color:#24211d; border-radius:999px; background:transparent; color:#24211d; }
  .theme-editorial .project-description, .theme-editorial .project-task-count, .theme-editorial .task-row small, .theme-editorial .eyebrow { color:rgba(36,33,29,.52); }
  .theme-editorial .project-task-count b, .theme-editorial .task-row strong { color:#24211d; }
  .theme-editorial .project-progress { background:rgba(36,33,29,.12); }
  .theme-editorial .project-progress > div { background:#24211d !important; }
  .theme-editorial .project-percent { color:#24211d !important; }
  .theme-editorial .project-hero, .theme-editorial .task-feed, .theme-editorial .project-aside { border-color:rgba(36,33,29,.22); border-radius:0; background:rgba(255,255,255,.18); box-shadow:none; backdrop-filter:none; }
  .theme-editorial .task-row { border-width:0 0 1px; border-color:rgba(36,33,29,.16); border-radius:0; background:transparent; }
  .theme-editorial .glass-button { border-color:rgba(36,33,29,.25); background:transparent; color:#24211d; }
  .theme-editorial .task-panel { background:#eee8de; color:#24211d; backdrop-filter:none; }

  /* 07 — Swiss: oq grid, qizil accent, qat'iy geometriya */
  .theme-swiss { color:#111; background:#f4f4f1; font-family:var(--font-inter),sans-serif; }
  .theme-swiss::before { background:linear-gradient(rgba(0,0,0,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.045) 1px,transparent 1px),#f4f4f1; background-size:32px 32px; }
  .theme-swiss .ambient,.theme-swiss .workspace-noise { display:none; }
  .theme-swiss [class*="text-white"] { color:rgba(0,0,0,.65) !important; }
  .theme-swiss header { border-color:#111 !important; background:#f4f4f1; }
  .theme-swiss .project-card { border:1px solid #111; border-radius:0; background:#fff; box-shadow:none; backdrop-filter:none; }
  .theme-swiss .project-card::before { width:6px;height:100%;inset:0 auto 0 0;border-radius:0;background:#ff3b30;filter:none;opacity:1; }
  .theme-swiss .project-card:hover { border-color:#111;background:#fff;box-shadow:7px 7px 0 #ff3b30; }
  .theme-swiss .project-code { border:0;border-radius:0;background:#111;color:#fff; }
  .theme-swiss .project-title,.theme-swiss h1 { color:#111;font-weight:800;text-transform:uppercase; }
  .theme-swiss .project-description,.theme-swiss .project-task-count,.theme-swiss .task-row small,.theme-swiss .eyebrow { color:rgba(0,0,0,.5); }
  .theme-swiss .project-task-count b,.theme-swiss .task-row strong { color:#111; }
  .theme-swiss .project-progress { border-radius:0;background:#ddd; }
  .theme-swiss .project-progress > div { border-radius:0;background:#ff3b30 !important; }
  .theme-swiss .project-percent { color:#ff3b30 !important; }
  .theme-swiss .project-hero,.theme-swiss .task-feed,.theme-swiss .project-aside,.theme-swiss .task-row { border-color:#111;border-radius:0;background:#fff;box-shadow:none;backdrop-filter:none; }
  .theme-swiss .glass-button { border-color:#111;border-radius:0;background:#fff;color:#111; }
  .theme-swiss .task-panel { border-color:#111;background:#fff;color:#111;backdrop-filter:none; }

  /* 08 — Terminal: developer workspace, yashil fosfor */
  .theme-terminal { color:#8cff9b;background:#050806;font-family:var(--font-geist-mono),monospace; }
  .theme-terminal::before { background:repeating-linear-gradient(0deg,rgba(121,255,141,.025) 0 1px,transparent 1px 4px),#050806; }
  .theme-terminal .ambient,.theme-terminal .workspace-noise { display:none; }
  .theme-terminal header { border-color:rgba(121,255,141,.24) !important; }
  .theme-terminal .project-card,.theme-terminal .project-hero,.theme-terminal .task-feed,.theme-terminal .project-aside,.theme-terminal .task-row { border-color:rgba(121,255,141,.28);border-radius:4px;background:rgba(7,20,10,.76);box-shadow:inset 0 0 24px rgba(80,255,105,.025);backdrop-filter:none; }
  .theme-terminal .project-card::before,.theme-terminal .project-hero::after { display:none; }
  .theme-terminal .project-card:hover,.theme-terminal .task-row:hover { border-color:#79ff8d;background:rgba(13,35,17,.9);box-shadow:0 0 24px rgba(80,255,105,.09); }
  .theme-terminal .project-code { border-color:#79ff8d;border-radius:2px;background:transparent;color:#79ff8d; }
  .theme-terminal .project-title,.theme-terminal h1,.theme-terminal .task-row strong,.theme-terminal .project-task-count b { color:#b7ffc1;font-family:var(--font-geist-mono),monospace;letter-spacing:-.04em; }
  .theme-terminal .project-description,.theme-terminal .project-task-count,.theme-terminal .task-row small,.theme-terminal .eyebrow { color:rgba(140,255,155,.46); }
  .theme-terminal .project-progress { background:rgba(121,255,141,.1); }
  .theme-terminal .project-progress > div { background:#79ff8d !important;box-shadow:0 0 12px #79ff8d; }
  .theme-terminal .project-percent { color:#79ff8d !important; }
  .theme-terminal .glass-button { border-color:rgba(121,255,141,.3);border-radius:3px;background:#071009;color:#79ff8d; }
  .theme-terminal .task-panel { border-color:#79ff8d;background:#071009;color:#b7ffc1;backdrop-filter:none; }

  /* 09 — Hologram: qora fon, neon spektr va glow */
  .theme-neon { color:#fff;background:#090713;font-family:var(--font-jakarta),sans-serif; }
  .theme-neon::before { background:radial-gradient(circle at 15% 20%,rgba(105,51,255,.42),transparent 32%),radial-gradient(circle at 82% 70%,rgba(0,229,255,.25),transparent 34%),#090713; }
  .theme-neon .project-card,.theme-neon .project-hero,.theme-neon .task-feed,.theme-neon .project-aside { border:1px solid transparent;border-radius:25px;background:linear-gradient(#151126,#151126) padding-box,linear-gradient(135deg,#8b5cff,#20e3ff,#ff55c8) border-box;box-shadow:0 24px 70px rgba(0,0,0,.3),0 0 35px rgba(112,80,255,.08);backdrop-filter:blur(22px); }
  .theme-neon .project-card:hover { background:linear-gradient(#1c1632,#1c1632) padding-box,linear-gradient(135deg,#20e3ff,#ff55c8,#8b5cff) border-box;box-shadow:0 28px 80px rgba(0,0,0,.35),0 0 38px rgba(105,78,255,.2); }
  .theme-neon .project-code { border-color:#7eefff;background:rgba(126,239,255,.08);color:#7eefff;box-shadow:0 0 18px rgba(126,239,255,.15); }
  .theme-neon .project-progress > div { background:linear-gradient(90deg,#8b5cff,#20e3ff,#ff55c8) !important; }
  .theme-neon .project-percent { color:#7eefff !important; }
  .theme-neon .task-row { border-color:rgba(133,110,255,.2);background:rgba(255,255,255,.035); }
  .theme-neon .task-row:hover { border-color:#7e6bff;background:rgba(126,107,255,.1); }
  .theme-neon .glass-button { border-color:rgba(126,239,255,.2);background:rgba(255,255,255,.04);color:#b9f7ff; }
  .theme-neon .task-panel { border-color:#705cff;background:rgba(11,8,24,.86);color:#fff;backdrop-filter:blur(35px); }

  /* 10 — Luxe: chuqur qora, champagne chiziqlar, premium serif */
  .theme-luxe { color:#f3eadb;background:#0e0d0b;font-family:var(--font-manrope),sans-serif; }
  .theme-luxe::before { background:radial-gradient(circle at 50% -20%,rgba(190,151,91,.2),transparent 38%),#0e0d0b; }
  .theme-luxe .ambient,.theme-luxe .workspace-noise { display:none; }
  .theme-luxe h1,.theme-luxe .project-title,.theme-luxe .section-heading h2,.theme-luxe .task-panel h2 { font-family:var(--font-serif),Georgia,serif;font-weight:400;letter-spacing:-.035em; }
  .theme-luxe .project-card,.theme-luxe .project-hero,.theme-luxe .task-feed,.theme-luxe .project-aside { border-color:rgba(221,183,123,.24);border-radius:2px;background:linear-gradient(145deg,rgba(200,164,105,.075),rgba(255,255,255,.018));box-shadow:inset 0 1px 0 rgba(239,208,158,.12),0 26px 70px rgba(0,0,0,.3);backdrop-filter:blur(20px); }
  .theme-luxe .project-card::before { opacity:.18; }
  .theme-luxe .project-card:hover { border-color:rgba(232,197,141,.5);background:linear-gradient(145deg,rgba(200,164,105,.11),rgba(255,255,255,.025)); }
  .theme-luxe .project-code { border-color:#c7a46c;border-radius:999px;background:transparent;color:#dfc18f; }
  .theme-luxe .project-percent,.theme-luxe .project-score strong { color:#dfc18f !important; }
  .theme-luxe .project-progress > div { background:linear-gradient(90deg,#8b6b3f,#e4c38d) !important; }
  .theme-luxe .task-row { border-width:0 0 1px;border-color:rgba(221,183,123,.16);border-radius:0;background:transparent; }
  .theme-luxe .glass-button { border-color:rgba(221,183,123,.25);border-radius:999px;background:rgba(200,164,105,.06);color:#dfc18f; }
  .theme-luxe .task-panel { border-color:rgba(221,183,123,.3);background:rgba(15,13,10,.9);color:#f3eadb;backdrop-filter:blur(30px); }

  /* Yangi 02–10 kolleksiya. 01 Crystal o'zgarmagan. */
  .theme-frost .workspace-noise,.theme-aurora .workspace-noise,.theme-smoke .workspace-noise,.theme-pearl .workspace-noise,.theme-editorial .workspace-noise,.theme-swiss .workspace-noise,.theme-terminal .workspace-noise,.theme-neon .workspace-noise,.theme-luxe .workspace-noise { display:block;opacity:.07;mix-blend-mode:multiply; }
  .theme-obsidian .workspace-noise { opacity:.055; }

  /* 02 — to'liq rangli, mutlaqo minimal cardlar */
  .theme-frost { color:#f6f7fb;background:#121827;font-family:var(--font-manrope),sans-serif; }
  .theme-frost::before { background:#121827; }
  .theme-frost header { border-color:rgba(255,255,255,.12) !important; }
  .theme-frost .project-card { border:0;border-radius:14px;background:#b9d9ce;color:#14211c;box-shadow:none;backdrop-filter:none; }
  .theme-frost .project-card:nth-child(2) { background:#cfc2ed; }
  .theme-frost .project-card:nth-child(3) { background:#efc5aa; }
  .theme-frost .project-card:nth-child(4) { background:#afcfee; }
  .theme-frost .project-card:nth-child(5) { background:#e3d58e; }
  .theme-frost .project-card:nth-child(6) { background:#e8b7c5; }
  .theme-frost .project-card::before { display:none; }
  .theme-frost .project-card:hover { border:0;background:#fff;box-shadow:none;transform:translateY(-5px); }
  .theme-frost .project-title,.theme-frost .project-description,.theme-frost .project-task-count,.theme-frost .project-task-count b,.theme-frost .project-percent,.theme-frost .project-arrow { color:#14211c !important; }
  .theme-frost .project-code { border:1px solid rgba(20,33,28,.2);background:rgba(255,255,255,.25);color:#14211c; }
  .theme-frost .project-progress { background:rgba(20,33,28,.14); }
  .theme-frost .project-progress > div { background:#14211c !important;box-shadow:none; }
  .theme-frost .project-hero,.theme-frost .task-feed,.theme-frost .project-aside { border:0;border-radius:14px;background:#b9d9ce;color:#14211c;box-shadow:none;backdrop-filter:none; }
  .theme-frost .project-hero::after { display:none; }
  .theme-frost .task-row { border:0;border-radius:10px;background:rgba(255,255,255,.32);box-shadow:none; }
  .theme-frost .task-row:hover { background:rgba(255,255,255,.62); }
  .theme-frost .task-panel { border:0;background:#b9d9ce;color:#14211c;backdrop-filter:none; }

  /* 03 — Nordic: oq, jim, ultra-clean */
  .theme-aurora { color:#17212b;background:#edf1f3;font-family:var(--font-geist),sans-serif; }
  .theme-aurora::before { background:linear-gradient(135deg,#f7f9fa,#e5ecef); }
  .theme-aurora .workspace-noise { opacity:.035; }
  .theme-aurora [class*="text-white"],.theme-aurora .task-row strong,.theme-aurora .project-task-count b { color:rgba(23,33,43,.68) !important; }
  .theme-aurora header { border-color:rgba(23,33,43,.1) !important; }
  .theme-aurora .project-card { border:1px solid rgba(23,33,43,.09);border-radius:20px;background:rgba(255,255,255,.9);box-shadow:0 8px 24px rgba(39,55,66,.055);backdrop-filter:none; }
  .theme-aurora .project-card::before { display:none; }
  .theme-aurora .project-card:hover { border-color:rgba(23,33,43,.2);background:#fff;box-shadow:0 14px 34px rgba(39,55,66,.09); }
  .theme-aurora .project-title,.theme-aurora h1 { color:#17212b; }
  .theme-aurora .project-description,.theme-aurora .project-task-count,.theme-aurora .task-row small,.theme-aurora .eyebrow { color:rgba(23,33,43,.45); }
  .theme-aurora .project-percent { color:#3976a8 !important; }
  .theme-aurora .project-progress { background:#e2e8eb; }
  .theme-aurora .project-progress > div { background:#3976a8 !important;box-shadow:none; }
  .theme-aurora .project-hero,.theme-aurora .task-feed,.theme-aurora .project-aside { border:1px solid rgba(23,33,43,.09);border-radius:20px;background:rgba(255,255,255,.88);box-shadow:none;backdrop-filter:none; }
  .theme-aurora .project-hero::after { display:none; }
  .theme-aurora .task-row { border-color:#e2e7e9;background:#f8fafb; }
  .theme-aurora .task-panel { background:rgba(248,250,251,.94);color:#17212b; }

  /* 04 — Spatial: havoda turgan panellar */
  .theme-smoke { color:#28243a;background:#dcd9ec;font-family:var(--font-jakarta),sans-serif; }
  .theme-smoke::before { background:radial-gradient(circle at 20% 10%,#f0eaff,transparent 38%),radial-gradient(circle at 80% 80%,#c9d9ef,transparent 40%),#dcd9ec; }
  .theme-smoke [class*="text-white"],.theme-smoke .task-row strong,.theme-smoke .project-task-count b { color:rgba(40,36,58,.68) !important; }
  .theme-smoke header { border:0 !important; }
  .theme-smoke .project-card { border:0;border-radius:32px;background:rgba(255,255,255,.52);box-shadow:0 22px 55px rgba(70,61,106,.14);backdrop-filter:blur(20px); }
  .theme-smoke .project-card::before { display:block;opacity:.32; }
  .theme-smoke .project-card:hover { background:rgba(255,255,255,.72);box-shadow:0 30px 70px rgba(70,61,106,.2); }
  .theme-smoke .project-title,.theme-smoke h1 { color:#28243a; }
  .theme-smoke .project-description,.theme-smoke .project-task-count,.theme-smoke .task-row small,.theme-smoke .eyebrow { color:rgba(40,36,58,.46); }
  .theme-smoke .project-hero,.theme-smoke .task-feed,.theme-smoke .project-aside { border:0;border-radius:30px;background:rgba(255,255,255,.48);box-shadow:0 20px 50px rgba(70,61,106,.12);backdrop-filter:blur(22px); }
  .theme-smoke .task-row { border:0;border-radius:18px;background:rgba(255,255,255,.5); }
  .theme-smoke .task-panel { border:0;background:rgba(239,237,248,.9);color:#28243a; }

  /* 05 — Soft Blocks: pastel solid bento */
  .theme-pearl { color:#302b28;background:#f2ede6;font-family:var(--font-hanken),sans-serif; }
  .theme-pearl::before { background:#f2ede6; }
  .theme-pearl [class*="text-white"],.theme-pearl .task-row strong,.theme-pearl .project-task-count b { color:rgba(48,43,40,.7) !important; }
  .theme-pearl header { border-color:rgba(48,43,40,.1) !important; }
  .theme-pearl .project-card { border:0;border-radius:24px;background:#dbe6d9;box-shadow:none;backdrop-filter:none; }
  .theme-pearl .project-card:nth-child(2n) { background:#e4dcee; }
  .theme-pearl .project-card:nth-child(3n) { background:#eedfd4; }
  .theme-pearl .project-card::before { display:none; }
  .theme-pearl .project-card:hover { background:#fff;box-shadow:0 18px 40px rgba(78,64,52,.1); }
  .theme-pearl .project-title,.theme-pearl h1 { color:#302b28; }
  .theme-pearl .project-description,.theme-pearl .project-task-count,.theme-pearl .task-row small,.theme-pearl .eyebrow { color:rgba(48,43,40,.5); }
  .theme-pearl .project-hero,.theme-pearl .task-feed,.theme-pearl .project-aside { border:0;border-radius:24px;background:#dbe6d9;box-shadow:none;backdrop-filter:none; }
  .theme-pearl .task-row { border:0;border-radius:16px;background:rgba(255,255,255,.45); }
  .theme-pearl .task-panel { border:0;background:#f2ede6;color:#302b28;backdrop-filter:none; }

  /* 06 — Ink: tipografika markazda, qora siyoh */
  .theme-editorial { color:#151412;background:#f0ede6;font-family:var(--font-manrope),sans-serif; }
  .theme-editorial::before { background:#f0ede6; }
  .theme-editorial .workspace-noise { opacity:.09; }
  .theme-editorial .project-card { border:2px solid #151412;border-radius:0;background:transparent;box-shadow:none; }
  .theme-editorial .project-card:nth-child(even) { background:#151412;color:#f0ede6; }
  .theme-editorial .project-card:nth-child(even) .project-title,.theme-editorial .project-card:nth-child(even) .project-description,.theme-editorial .project-card:nth-child(even) .project-task-count,.theme-editorial .project-card:nth-child(even) .project-task-count b { color:#f0ede6 !important; }
  .theme-editorial .project-card:hover { transform:translateY(-4px);box-shadow:8px 8px 0 #e0523f; }
  .theme-editorial .project-title,.theme-editorial h1 { font-family:var(--font-serif),Georgia,serif;font-size:clamp(37px,3vw,50px); }
  .theme-editorial .project-hero,.theme-editorial .task-feed,.theme-editorial .project-aside { border:2px solid #151412;background:#f0ede6; }
  .theme-editorial .task-row { border-bottom:2px solid #151412; }
  .theme-editorial .project-progress > div { background:#e0523f !important; }
  .theme-editorial .project-percent { color:#e0523f !important; }

  /* 07 — Gallery: cardlar rangli canvas sifatida */
  .theme-swiss { color:#f5f1e8;background:#17342d;font-family:var(--font-manrope),sans-serif; }
  .theme-swiss::before { background:radial-gradient(circle at 50% -20%,#2b594d,transparent 42%),#17342d; }
  .theme-swiss .workspace-noise { mix-blend-mode:screen;opacity:.05; }
  .theme-swiss [class*="text-white"] { color:rgba(245,241,232,.68) !important; }
  .theme-swiss header { border-color:rgba(255,255,255,.12) !important;background:transparent; }
  .theme-swiss .project-card { border:0;border-radius:6px;background:#ef8354;color:#1d211f;box-shadow:0 20px 45px rgba(0,0,0,.18); }
  .theme-swiss .project-card:nth-child(2) { background:#d7c6ff; }
  .theme-swiss .project-card:nth-child(3) { background:#72c9b0; }
  .theme-swiss .project-card:nth-child(4) { background:#f0d76f; }
  .theme-swiss .project-card:nth-child(5) { background:#83b8ed; }
  .theme-swiss .project-card:nth-child(6) { background:#df9db0; }
  .theme-swiss .project-card::before { display:none; }
  .theme-swiss .project-card:hover { border:0;filter:brightness(1.06);box-shadow:0 28px 55px rgba(0,0,0,.24); }
  .theme-swiss .project-title,.theme-swiss .project-description,.theme-swiss .project-task-count,.theme-swiss .project-task-count b,.theme-swiss .project-percent { color:#1d211f !important; }
  .theme-swiss .project-progress > div { background:#1d211f !important; }
  .theme-swiss .project-hero,.theme-swiss .task-feed,.theme-swiss .project-aside { border:0;border-radius:6px;background:#d7c6ff;color:#1d211f; }
  .theme-swiss .task-row { border:0;border-radius:4px;background:rgba(255,255,255,.33); }
  .theme-swiss .task-panel { background:#d7c6ff;color:#1d211f; }

  /* 08 — Blueprint: chizma qog'ozi va texnik grid */
  .theme-terminal { color:#eff7ff;background:#164f89;font-family:var(--font-geist-mono),monospace; }
  .theme-terminal::before { background:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px),#164f89;background-size:24px 24px; }
  .theme-terminal .workspace-noise { mix-blend-mode:screen;opacity:.04; }
  .theme-terminal .project-card,.theme-terminal .project-hero,.theme-terminal .task-feed,.theme-terminal .project-aside { border:1px solid rgba(255,255,255,.48);border-radius:0;background:rgba(16,58,103,.78);box-shadow:none; }
  .theme-terminal .project-card:hover { background:rgba(25,74,124,.9);box-shadow:inset 0 0 0 3px rgba(255,255,255,.16); }
  .theme-terminal .project-code { border-color:#fff;color:#fff; }
  .theme-terminal .project-title,.theme-terminal h1,.theme-terminal .task-row strong,.theme-terminal .project-task-count b { color:#fff; }
  .theme-terminal .project-description,.theme-terminal .project-task-count,.theme-terminal .task-row small,.theme-terminal .eyebrow { color:rgba(255,255,255,.56); }
  .theme-terminal .project-percent { color:#fff !important; }
  .theme-terminal .project-progress > div { background:#fff !important;box-shadow:none; }
  .theme-terminal .task-row { border:1px dashed rgba(255,255,255,.35);border-radius:0;background:rgba(0,0,0,.06); }
  .theme-terminal .task-panel { background:#164f89;color:#fff; }

  /* 09 — Liquid: rangli nur ostidagi sutli glass */
  .theme-neon { color:#252333;background:#eceaf5;font-family:var(--font-jakarta),sans-serif; }
  .theme-neon::before { background:radial-gradient(circle at 8% 16%,#ff9dc7,transparent 28%),radial-gradient(circle at 88% 12%,#85c8ff,transparent 30%),radial-gradient(circle at 75% 88%,#b7efc2,transparent 30%),#eceaf5; }
  .theme-neon [class*="text-white"],.theme-neon .task-row strong,.theme-neon .project-task-count b { color:rgba(37,35,51,.68) !important; }
  .theme-neon .project-card,.theme-neon .project-hero,.theme-neon .task-feed,.theme-neon .project-aside { border:1px solid rgba(255,255,255,.72);border-radius:30px;background:rgba(255,255,255,.4);box-shadow:0 24px 60px rgba(65,53,103,.12),inset 0 1px 0 #fff;backdrop-filter:blur(34px) saturate(150%); }
  .theme-neon .project-card:hover { background:rgba(255,255,255,.58); }
  .theme-neon .project-title,.theme-neon h1 { color:#252333; }
  .theme-neon .project-description,.theme-neon .project-task-count,.theme-neon .task-row small,.theme-neon .eyebrow { color:rgba(37,35,51,.48); }
  .theme-neon .task-row { border-color:rgba(255,255,255,.7);background:rgba(255,255,255,.32); }
  .theme-neon .task-panel { background:rgba(242,240,248,.82);color:#252333; }

  /* 10 — Carbon: zich qora panellar va issiq orange */
  .theme-luxe { color:#f2f1ed;background:#111210;font-family:var(--font-inter),sans-serif; }
  .theme-luxe::before { background:linear-gradient(120deg,#111210,#1d1f1b); }
  .theme-luxe .workspace-noise { mix-blend-mode:screen;opacity:.075; }
  .theme-luxe h1,.theme-luxe .project-title,.theme-luxe .section-heading h2 { font-family:var(--font-inter),sans-serif;font-weight:700; }
  .theme-luxe .project-card { border:1px solid #30322d;border-radius:10px;background:#1b1c19;box-shadow:0 18px 42px rgba(0,0,0,.24);backdrop-filter:none; }
  .theme-luxe .project-card::before { width:100%;height:2px;inset:0;background:linear-gradient(90deg,#ff7a45,transparent);filter:none;opacity:1; }
  .theme-luxe .project-card:hover { border-color:#55584f;background:#20211e; }
  .theme-luxe .project-code { border-color:#ff7a45;border-radius:7px;color:#ff9b72; }
  .theme-luxe .project-percent,.theme-luxe .project-score strong { color:#ff8c5c !important; }
  .theme-luxe .project-progress > div { background:#ff7a45 !important; }
  .theme-luxe .project-hero,.theme-luxe .task-feed,.theme-luxe .project-aside { border-color:#30322d;border-radius:10px;background:#1b1c19;box-shadow:none;backdrop-filter:none; }
  .theme-luxe .task-row { border-color:#30322d;border-radius:8px;background:#20211e; }
  .theme-luxe .task-panel { border-color:#ff7a45;background:#181916;color:#f2f1ed;backdrop-filter:none; }
  /* Yakuniy Crystal oilasi — barcha 10 variant uchun yagona fundament */
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) {
    color:var(--cv-ink);background:var(--cv-page);font-family:var(--cv-font);color-scheme:dark;
  }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe)::before { background:var(--cv-backdrop); }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .workspace-noise { display:block;opacity:var(--cv-noise);mix-blend-mode:screen; }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) [class*="text-white"] { color:var(--cv-muted) !important; }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) header { border-color:var(--cv-line) !important;background:var(--cv-header);backdrop-filter:blur(var(--cv-blur)); }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) h1,
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-title,
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .section-heading h2 { color:var(--cv-ink);font-family:var(--cv-display);font-weight:var(--cv-title-weight); }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-card {
    border:var(--cv-border);border-radius:var(--cv-card-radius);background:var(--cv-card);color:var(--cv-ink);box-shadow:var(--cv-shadow),inset 0 1px 0 var(--cv-shine);backdrop-filter:blur(var(--cv-blur)) saturate(var(--cv-sat));animation:var(--cv-animation);transition:var(--cv-transition);
  }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-card:hover { border:var(--cv-border-hover);background:var(--cv-card-hover);box-shadow:var(--cv-shadow-hover),inset 0 1px 0 var(--cv-shine);transform:var(--cv-hover-transform);filter:var(--cv-hover-filter); }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-card::before { display:block;width:210px;height:210px;inset:-85px -65px auto auto;border-radius:999px;background:var(--glow);filter:blur(var(--cv-glow-blur));opacity:var(--cv-glow-opacity); }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-title,
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-task-count b,
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .task-row strong { color:var(--cv-ink) !important; }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-description,
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-task-count,
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .task-row small,
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .eyebrow { color:var(--cv-muted); }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-code { border:var(--cv-code-border);border-radius:var(--cv-code-radius);background:var(--cv-code-bg);color:var(--cv-accent); }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-progress { height:var(--cv-progress-height);border-radius:var(--cv-progress-radius);background:var(--cv-progress-track); }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-progress > div { border-radius:inherit;background:var(--cv-progress) !important;box-shadow:var(--cv-progress-glow); }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-percent,
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-score strong { color:var(--cv-accent) !important; }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-hero,
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .task-feed,
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-aside { border:var(--cv-panel-border);border-radius:var(--cv-panel-radius);background:var(--cv-panel);color:var(--cv-ink);box-shadow:var(--cv-panel-shadow),inset 0 1px 0 var(--cv-shine);backdrop-filter:blur(var(--cv-blur)) saturate(var(--cv-sat)); }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .task-row { border:var(--cv-row-border);border-radius:var(--cv-row-radius);background:var(--cv-row);box-shadow:none; }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .task-row:hover { border:var(--cv-row-border-hover);background:var(--cv-row-hover);box-shadow:var(--cv-row-shadow);transform:var(--cv-row-transform); }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .glass-button { border:var(--cv-button-border);border-radius:var(--cv-button-radius);background:var(--cv-button);color:var(--cv-muted);backdrop-filter:blur(var(--cv-blur)); }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .task-panel { border-color:var(--cv-line);background:var(--cv-drawer);color:var(--cv-ink);backdrop-filter:blur(38px) saturate(var(--cv-sat)); }

  .theme-obsidian { --cv-page:#080a0a;--cv-ink:#f4f7f5;--cv-muted:rgba(244,247,245,.5);--cv-accent:#b9d7cc;--cv-line:rgba(255,255,255,.08);--cv-header:rgba(8,10,10,.38);--cv-backdrop:radial-gradient(circle at 50% -10%,#26362f 0,transparent 36%),#080a0a;--cv-card:rgba(255,255,255,.045);--cv-card-hover:rgba(255,255,255,.075);--cv-border:1px solid rgba(255,255,255,.09);--cv-border-hover:1px solid rgba(255,255,255,.2);--cv-shadow:0 30px 80px rgba(0,0,0,.25);--cv-shadow-hover:0 34px 90px rgba(0,0,0,.36);--cv-shine:rgba(255,255,255,.09);--cv-panel:rgba(19,22,21,.58);--cv-panel-border:1px solid rgba(255,255,255,.08);--cv-panel-shadow:none;--cv-row:rgba(255,255,255,.035);--cv-row-hover:rgba(255,255,255,.07);--cv-row-border:1px solid rgba(255,255,255,.075);--cv-row-border-hover:1px solid rgba(255,255,255,.16);--cv-row-shadow:none;--cv-code-bg:rgba(185,215,204,.08);--cv-code-border:1px solid rgba(185,215,204,.25);--cv-progress:var(--tint);--cv-progress-track:rgba(255,255,255,.09);--cv-progress-glow:0 0 14px rgba(185,215,204,.18);--cv-drawer:rgba(10,12,11,.86);--cv-button:rgba(255,255,255,.04);--cv-button-border:1px solid rgba(255,255,255,.09);--cv-font:var(--font-inter),sans-serif;--cv-display:var(--font-inter),sans-serif;--cv-title-weight:650;--cv-card-radius:26px;--cv-panel-radius:24px;--cv-row-radius:16px;--cv-code-radius:11px;--cv-button-radius:12px;--cv-progress-radius:999px;--cv-progress-height:8px;--cv-blur:28px;--cv-sat:120%;--cv-glow-blur:38px;--cv-glow-opacity:.7;--cv-noise:.055;--cv-animation:crystalIn .55s both cubic-bezier(.2,.8,.2,1);--cv-transition:.25s ease;--cv-hover-transform:translateY(-4px);--cv-hover-filter:none;--cv-row-transform:translateX(3px); }
  .theme-frost { --cv-page:#090d12;--cv-ink:#f5f7fa;--cv-muted:rgba(225,233,242,.5);--cv-accent:#a8c9ee;--cv-line:rgba(180,210,240,.1);--cv-header:rgba(9,13,18,.28);--cv-backdrop:radial-gradient(circle at 10% 30%,#152438,transparent 38%),#090d12;--cv-card:rgba(175,203,232,.055);--cv-card-hover:rgba(175,203,232,.095);--cv-border:1px solid rgba(190,218,245,.11);--cv-border-hover:1px solid rgba(190,218,245,.27);--cv-shadow:0 22px 60px rgba(0,0,0,.22);--cv-shadow-hover:0 38px 90px rgba(0,0,0,.4);--cv-shine:rgba(220,238,255,.1);--cv-panel:rgba(17,26,36,.62);--cv-panel-border:1px solid rgba(190,218,245,.1);--cv-panel-shadow:0 20px 60px rgba(0,0,0,.18);--cv-row:rgba(180,210,240,.035);--cv-row-hover:rgba(180,210,240,.08);--cv-row-border:1px solid rgba(190,218,245,.08);--cv-row-border-hover:1px solid rgba(190,218,245,.2);--cv-row-shadow:0 14px 30px rgba(0,0,0,.15);--cv-code-bg:rgba(168,201,238,.08);--cv-code-border:1px solid rgba(168,201,238,.24);--cv-progress:#a8c9ee;--cv-progress-track:rgba(168,201,238,.1);--cv-progress-glow:none;--cv-drawer:rgba(11,17,24,.88);--cv-button:rgba(180,210,240,.045);--cv-button-border:1px solid rgba(190,218,245,.11);--cv-font:var(--font-geist),sans-serif;--cv-display:var(--font-geist),sans-serif;--cv-title-weight:600;--cv-card-radius:22px;--cv-panel-radius:22px;--cv-row-radius:14px;--cv-code-radius:11px;--cv-button-radius:11px;--cv-progress-radius:999px;--cv-progress-height:7px;--cv-blur:34px;--cv-sat:115%;--cv-glow-blur:55px;--cv-glow-opacity:.38;--cv-noise:.04;--cv-animation:driftIn .7s both cubic-bezier(.18,.85,.2,1);--cv-transition:.35s cubic-bezier(.2,.8,.2,1);--cv-hover-transform:translateY(-9px) scale(1.012);--cv-hover-filter:none;--cv-row-transform:translateY(-2px); }
  .theme-aurora { --cv-page:#07100d;--cv-ink:#f2f8f5;--cv-muted:rgba(222,239,231,.5);--cv-accent:#8ee2ba;--cv-line:rgba(142,226,186,.11);--cv-header:rgba(7,16,13,.35);--cv-backdrop:radial-gradient(circle at 80% 0,rgba(38,122,84,.42),transparent 35%),#07100d;--cv-card:rgba(120,190,157,.055);--cv-card-hover:rgba(120,190,157,.1);--cv-border:1px solid rgba(142,226,186,.12);--cv-border-hover:1px solid rgba(142,226,186,.36);--cv-shadow:0 24px 70px rgba(0,0,0,.22);--cv-shadow-hover:0 28px 80px rgba(0,0,0,.3),0 0 35px rgba(83,216,153,.1);--cv-shine:rgba(190,255,224,.1);--cv-panel:rgba(13,30,23,.6);--cv-panel-border:1px solid rgba(142,226,186,.11);--cv-panel-shadow:0 0 50px rgba(62,187,127,.04);--cv-row:rgba(120,190,157,.04);--cv-row-hover:rgba(120,190,157,.09);--cv-row-border:1px solid rgba(142,226,186,.09);--cv-row-border-hover:1px solid rgba(142,226,186,.25);--cv-row-shadow:0 0 22px rgba(83,216,153,.06);--cv-code-bg:rgba(142,226,186,.08);--cv-code-border:1px solid rgba(142,226,186,.28);--cv-progress:#8ee2ba;--cv-progress-track:rgba(142,226,186,.09);--cv-progress-glow:0 0 18px rgba(83,216,153,.4);--cv-drawer:rgba(7,18,13,.9);--cv-button:rgba(142,226,186,.045);--cv-button-border:1px solid rgba(142,226,186,.13);--cv-font:var(--font-manrope),sans-serif;--cv-display:var(--font-manrope),sans-serif;--cv-title-weight:650;--cv-card-radius:28px;--cv-panel-radius:26px;--cv-row-radius:18px;--cv-code-radius:999px;--cv-button-radius:999px;--cv-progress-radius:999px;--cv-progress-height:9px;--cv-blur:26px;--cv-sat:135%;--cv-glow-blur:32px;--cv-glow-opacity:.65;--cv-noise:.05;--cv-animation:haloIn .65s both cubic-bezier(.2,.8,.2,1);--cv-transition:.28s ease;--cv-hover-transform:scale(1.018);--cv-hover-filter:none;--cv-row-transform:scale(1.006); }
  .theme-smoke { --cv-page:#0b0b16;--cv-ink:#f5f3ff;--cv-muted:rgba(229,224,255,.5);--cv-accent:#c0a7ff;--cv-line:rgba(192,167,255,.12);--cv-header:rgba(11,11,22,.35);--cv-backdrop:radial-gradient(circle at 12% 20%,rgba(102,70,200,.4),transparent 34%),radial-gradient(circle at 88% 70%,rgba(40,179,197,.2),transparent 36%),#0b0b16;--cv-card:linear-gradient(145deg,rgba(177,151,255,.12),rgba(255,255,255,.025));--cv-card-hover:linear-gradient(145deg,rgba(177,151,255,.18),rgba(255,255,255,.04));--cv-border:1px solid transparent;--cv-border-hover:1px solid rgba(192,167,255,.45);--cv-shadow:0 25px 70px rgba(0,0,0,.24);--cv-shadow-hover:0 32px 85px rgba(0,0,0,.34);--cv-shine:rgba(220,210,255,.13);--cv-panel:rgba(22,18,43,.6);--cv-panel-border:1px solid rgba(192,167,255,.14);--cv-panel-shadow:none;--cv-row:rgba(177,151,255,.045);--cv-row-hover:rgba(177,151,255,.1);--cv-row-border:1px solid rgba(192,167,255,.09);--cv-row-border-hover:1px solid rgba(192,167,255,.28);--cv-row-shadow:none;--cv-code-bg:rgba(192,167,255,.09);--cv-code-border:1px solid rgba(192,167,255,.3);--cv-progress:linear-gradient(90deg,#9d7df0,#75dbe5);--cv-progress-track:rgba(192,167,255,.09);--cv-progress-glow:0 0 15px rgba(157,125,240,.3);--cv-drawer:rgba(12,10,26,.88);--cv-button:rgba(177,151,255,.05);--cv-button-border:1px solid rgba(192,167,255,.14);--cv-font:var(--font-jakarta),sans-serif;--cv-display:var(--font-jakarta),sans-serif;--cv-title-weight:650;--cv-card-radius:24px;--cv-panel-radius:24px;--cv-row-radius:15px;--cv-code-radius:10px;--cv-button-radius:12px;--cv-progress-radius:999px;--cv-progress-height:8px;--cv-blur:30px;--cv-sat:150%;--cv-glow-blur:42px;--cv-glow-opacity:.7;--cv-noise:.045;--cv-animation:prismIn .6s both ease-out;--cv-transition:.3s ease;--cv-hover-transform:translateY(-4px);--cv-hover-filter:saturate(1.18);--cv-row-transform:translateX(4px); }
  .theme-pearl { --cv-page:#0d0f10;--cv-ink:#f2f3f3;--cv-muted:rgba(232,235,235,.46);--cv-accent:#d5dcda;--cv-line:rgba(255,255,255,.12);--cv-header:transparent;--cv-backdrop:#0d0f10;--cv-card:transparent;--cv-card-hover:rgba(255,255,255,.035);--cv-border:1px solid rgba(255,255,255,.15);--cv-border-hover:1px solid rgba(255,255,255,.42);--cv-shadow:none;--cv-shadow-hover:none;--cv-shine:transparent;--cv-panel:transparent;--cv-panel-border:1px solid rgba(255,255,255,.15);--cv-panel-shadow:none;--cv-row:transparent;--cv-row-hover:rgba(255,255,255,.035);--cv-row-border:1px solid rgba(255,255,255,.11);--cv-row-border-hover:1px solid rgba(255,255,255,.3);--cv-row-shadow:none;--cv-code-bg:transparent;--cv-code-border:1px solid rgba(255,255,255,.25);--cv-progress:#d5dcda;--cv-progress-track:rgba(255,255,255,.08);--cv-progress-glow:none;--cv-drawer:rgba(13,15,16,.94);--cv-button:transparent;--cv-button-border:1px solid rgba(255,255,255,.14);--cv-font:var(--font-hanken),sans-serif;--cv-display:var(--font-hanken),sans-serif;--cv-title-weight:600;--cv-card-radius:18px;--cv-panel-radius:18px;--cv-row-radius:12px;--cv-code-radius:9px;--cv-button-radius:10px;--cv-progress-radius:2px;--cv-progress-height:5px;--cv-blur:0px;--cv-sat:100%;--cv-glow-blur:60px;--cv-glow-opacity:.18;--cv-noise:.075;--cv-animation:outlineIn .5s both ease-out;--cv-transition:.2s ease;--cv-hover-transform:translateY(-2px);--cv-hover-filter:none;--cv-row-transform:translateX(2px); }
  .theme-editorial { --cv-page:#0a0d0c;--cv-ink:#f5f7f5;--cv-muted:rgba(237,242,239,.52);--cv-accent:#b9d7cc;--cv-line:rgba(255,255,255,.08);--cv-header:#0a0d0c;--cv-backdrop:#0a0d0c;--cv-card:#18221e;--cv-card-hover:#202e28;--cv-border:0 solid transparent;--cv-border-hover:0 solid transparent;--cv-shadow:none;--cv-shadow-hover:0 22px 55px rgba(0,0,0,.25);--cv-shine:transparent;--cv-panel:#18221e;--cv-panel-border:0 solid transparent;--cv-panel-shadow:none;--cv-row:#202c27;--cv-row-hover:#293832;--cv-row-border:0 solid transparent;--cv-row-border-hover:0 solid transparent;--cv-row-shadow:none;--cv-code-bg:#b9d7cc;--cv-code-border:0 solid transparent;--cv-progress:#b9d7cc;--cv-progress-track:#2c3b35;--cv-progress-glow:none;--cv-drawer:#18221e;--cv-button:#202c27;--cv-button-border:0 solid transparent;--cv-font:var(--font-geist),sans-serif;--cv-display:var(--font-geist),sans-serif;--cv-title-weight:700;--cv-card-radius:20px;--cv-panel-radius:20px;--cv-row-radius:13px;--cv-code-radius:10px;--cv-button-radius:10px;--cv-progress-radius:999px;--cv-progress-height:10px;--cv-blur:0px;--cv-sat:100%;--cv-glow-blur:50px;--cv-glow-opacity:.25;--cv-noise:.045;--cv-animation:solidIn .45s both ease-out;--cv-transition:.2s ease;--cv-hover-transform:translateY(-5px);--cv-hover-filter:brightness(1.05);--cv-row-transform:translateX(4px); }
  .theme-swiss { --cv-page:#101211;--cv-ink:#eeefeb;--cv-muted:rgba(230,232,227,.4);--cv-accent:#abb5ae;--cv-line:rgba(255,255,255,.06);--cv-header:rgba(16,18,17,.6);--cv-backdrop:radial-gradient(circle at 50% 0,#242825,transparent 42%),#101211;--cv-card:rgba(255,255,255,.028);--cv-card-hover:rgba(255,255,255,.05);--cv-border:1px solid rgba(255,255,255,.055);--cv-border-hover:1px solid rgba(255,255,255,.13);--cv-shadow:0 18px 50px rgba(0,0,0,.13);--cv-shadow-hover:0 22px 60px rgba(0,0,0,.22);--cv-shine:rgba(255,255,255,.035);--cv-panel:rgba(255,255,255,.025);--cv-panel-border:1px solid rgba(255,255,255,.055);--cv-panel-shadow:none;--cv-row:rgba(255,255,255,.02);--cv-row-hover:rgba(255,255,255,.045);--cv-row-border:1px solid rgba(255,255,255,.045);--cv-row-border-hover:1px solid rgba(255,255,255,.1);--cv-row-shadow:none;--cv-code-bg:rgba(255,255,255,.03);--cv-code-border:1px solid rgba(255,255,255,.08);--cv-progress:#abb5ae;--cv-progress-track:rgba(255,255,255,.055);--cv-progress-glow:none;--cv-drawer:rgba(16,18,17,.92);--cv-button:rgba(255,255,255,.025);--cv-button-border:1px solid rgba(255,255,255,.06);--cv-font:var(--font-manrope),sans-serif;--cv-display:var(--font-manrope),sans-serif;--cv-title-weight:550;--cv-card-radius:30px;--cv-panel-radius:28px;--cv-row-radius:18px;--cv-code-radius:999px;--cv-button-radius:999px;--cv-progress-radius:999px;--cv-progress-height:6px;--cv-blur:40px;--cv-sat:70%;--cv-glow-blur:75px;--cv-glow-opacity:.16;--cv-noise:.07;--cv-animation:quietIn .8s both cubic-bezier(.2,.8,.2,1);--cv-transition:.4s ease;--cv-hover-transform:translateY(-3px);--cv-hover-filter:none;--cv-row-transform:none; }
  .theme-terminal { --cv-page:#080b0f;--cv-ink:#f1f5f9;--cv-muted:rgba(226,232,240,.48);--cv-accent:#90bce8;--cv-line:rgba(144,188,232,.12);--cv-header:rgba(8,11,15,.5);--cv-backdrop:linear-gradient(145deg,#080b0f,#101923);--cv-card:rgba(20,30,41,.62);--cv-card-hover:rgba(27,40,54,.72);--cv-border:1px solid rgba(144,188,232,.15);--cv-border-hover:1px solid rgba(144,188,232,.38);--cv-shadow:0 22px 65px rgba(0,0,0,.25);--cv-shadow-hover:0 28px 75px rgba(0,0,0,.36);--cv-shine:rgba(188,219,248,.08);--cv-panel:rgba(17,26,35,.7);--cv-panel-border:1px solid rgba(144,188,232,.13);--cv-panel-shadow:none;--cv-row:rgba(144,188,232,.035);--cv-row-hover:rgba(144,188,232,.075);--cv-row-border:1px solid rgba(144,188,232,.1);--cv-row-border-hover:1px solid rgba(144,188,232,.24);--cv-row-shadow:none;--cv-code-bg:rgba(144,188,232,.08);--cv-code-border:1px solid rgba(144,188,232,.28);--cv-progress:#90bce8;--cv-progress-track:rgba(144,188,232,.09);--cv-progress-glow:none;--cv-drawer:rgba(8,13,18,.92);--cv-button:rgba(144,188,232,.035);--cv-button-border:1px solid rgba(144,188,232,.13);--cv-font:var(--font-geist-mono),monospace;--cv-display:var(--font-geist),sans-serif;--cv-title-weight:650;--cv-card-radius:8px;--cv-panel-radius:8px;--cv-row-radius:5px;--cv-code-radius:5px;--cv-button-radius:6px;--cv-progress-radius:1px;--cv-progress-height:7px;--cv-blur:24px;--cv-sat:110%;--cv-glow-blur:40px;--cv-glow-opacity:.35;--cv-noise:.045;--cv-animation:edgeIn .55s both cubic-bezier(.2,.8,.2,1);--cv-transition:.22s ease;--cv-hover-transform:translateY(-4px);--cv-hover-filter:none;--cv-row-transform:translateX(5px); }
  .theme-neon { --cv-page:#090909;--cv-ink:#f5f5f3;--cv-muted:rgba(245,245,243,.44);--cv-accent:#e8e8e3;--cv-line:rgba(255,255,255,.09);--cv-header:rgba(9,9,9,.55);--cv-backdrop:radial-gradient(circle at 50% -20%,#252525,transparent 42%),#090909;--cv-card:rgba(255,255,255,.04);--cv-card-hover:rgba(255,255,255,.065);--cv-border:1px solid rgba(255,255,255,.085);--cv-border-hover:1px solid rgba(255,255,255,.22);--cv-shadow:0 28px 75px rgba(0,0,0,.25);--cv-shadow-hover:0 32px 85px rgba(0,0,0,.34);--cv-shine:rgba(255,255,255,.08);--cv-panel:rgba(24,24,24,.6);--cv-panel-border:1px solid rgba(255,255,255,.08);--cv-panel-shadow:none;--cv-row:rgba(255,255,255,.03);--cv-row-hover:rgba(255,255,255,.06);--cv-row-border:1px solid rgba(255,255,255,.065);--cv-row-border-hover:1px solid rgba(255,255,255,.16);--cv-row-shadow:none;--cv-code-bg:rgba(255,255,255,.05);--cv-code-border:1px solid rgba(255,255,255,.15);--cv-progress:#f1f1ed;--cv-progress-track:rgba(255,255,255,.075);--cv-progress-glow:none;--cv-drawer:rgba(10,10,10,.9);--cv-button:rgba(255,255,255,.035);--cv-button-border:1px solid rgba(255,255,255,.08);--cv-font:var(--font-hanken),sans-serif;--cv-display:var(--font-hanken),sans-serif;--cv-title-weight:600;--cv-card-radius:24px;--cv-panel-radius:22px;--cv-row-radius:15px;--cv-code-radius:10px;--cv-button-radius:11px;--cv-progress-radius:999px;--cv-progress-height:8px;--cv-blur:30px;--cv-sat:0%;--cv-glow-blur:55px;--cv-glow-opacity:0;--cv-noise:.09;--cv-animation:monoIn .6s both ease-out;--cv-transition:.25s ease;--cv-hover-transform:translateY(-4px);--cv-hover-filter:none;--cv-row-transform:translateX(3px); }
  .theme-luxe { --cv-page:#0d0908;--cv-ink:#fff5f0;--cv-muted:rgba(255,235,224,.48);--cv-accent:#ff9c72;--cv-line:rgba(255,133,82,.12);--cv-header:rgba(13,9,8,.4);--cv-backdrop:radial-gradient(circle at 50% -10%,#462219,transparent 38%),#0d0908;--cv-card:rgba(255,112,62,.055);--cv-card-hover:rgba(255,112,62,.1);--cv-border:1px solid rgba(255,133,82,.13);--cv-border-hover:1px solid rgba(255,133,82,.4);--cv-shadow:0 26px 75px rgba(0,0,0,.26);--cv-shadow-hover:0 32px 85px rgba(0,0,0,.36),0 0 28px rgba(255,105,55,.08);--cv-shine:rgba(255,188,158,.09);--cv-panel:rgba(37,18,13,.6);--cv-panel-border:1px solid rgba(255,133,82,.12);--cv-panel-shadow:none;--cv-row:rgba(255,112,62,.035);--cv-row-hover:rgba(255,112,62,.085);--cv-row-border:1px solid rgba(255,133,82,.09);--cv-row-border-hover:1px solid rgba(255,133,82,.27);--cv-row-shadow:0 0 22px rgba(255,105,55,.05);--cv-code-bg:rgba(255,133,82,.08);--cv-code-border:1px solid rgba(255,133,82,.28);--cv-progress:#ff8b5b;--cv-progress-track:rgba(255,133,82,.09);--cv-progress-glow:0 0 17px rgba(255,105,55,.45);--cv-drawer:rgba(20,10,8,.9);--cv-button:rgba(255,112,62,.04);--cv-button-border:1px solid rgba(255,133,82,.13);--cv-font:var(--font-inter),sans-serif;--cv-display:var(--font-manrope),sans-serif;--cv-title-weight:700;--cv-card-radius:25px;--cv-panel-radius:23px;--cv-row-radius:15px;--cv-code-radius:999px;--cv-button-radius:999px;--cv-progress-radius:999px;--cv-progress-height:9px;--cv-blur:27px;--cv-sat:130%;--cv-glow-blur:34px;--cv-glow-opacity:.64;--cv-noise:.06;--cv-animation:pulseIn .6s both cubic-bezier(.2,.8,.2,1);--cv-transition:.28s ease;--cv-hover-transform:translateY(-5px) scale(1.008);--cv-hover-filter:none;--cv-row-transform:translateX(4px); }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-card:nth-child(n) { background:var(--cv-card);color:var(--cv-ink); }
  :is(.theme-obsidian,.theme-frost,.theme-aurora,.theme-smoke,.theme-pearl,.theme-editorial,.theme-swiss,.theme-terminal,.theme-neon,.theme-luxe) .project-card:nth-child(n):hover { background:var(--cv-card-hover); }
  .theme-editorial .project-code { color:#16231d; }

  /* 02 Horizon — ikki ustunli keng landscape cardlar */
  .theme-frost .project-grid { grid-template-columns:repeat(2,minmax(0,1fr));gap:18px; }
  .theme-frost .project-card { min-height:230px;display:grid;grid-template-columns:1fr 1.35fr;grid-template-rows:auto 1fr;column-gap:28px;align-items:start; }
  .theme-frost .project-card > div:first-child { grid-column:1;grid-row:1; }
  .theme-frost .project-card > div:nth-child(2) { grid-column:1 / -1;grid-row:2;align-self:end;margin-top:38px; }
  .theme-frost .project-card > div:last-child { grid-column:2;grid-row:1;align-self:start;margin-top:0;padding-top:5px; }
  .theme-frost .project-title { font-size:clamp(30px,3vw,46px); }
  .theme-frost .add-card { min-height:230px; }
  .theme-frost .space-layout { grid-template-columns:1fr; }
  .theme-frost .project-aside { display:grid;grid-template-columns:1fr 1fr; }
  .theme-frost .aside-block + .aside-block { border-top:0;border-left:1px solid var(--cv-line); }

  /* 03 Tiles — to'rt ustunli ixcham square dashboard */
  .theme-aurora .project-grid { grid-template-columns:repeat(4,minmax(0,1fr));gap:12px; }
  .theme-aurora .project-card { min-height:285px;padding:20px; }
  .theme-aurora .project-card > div:nth-child(2) { margin-top:68px; }
  .theme-aurora .project-title { font-size:clamp(24px,2vw,32px); }
  .theme-aurora .project-description { font-size:14px; }
  .theme-aurora .add-card { min-height:285px; }
  .theme-aurora .space-layout { grid-template-columns:minmax(0,1fr); }
  .theme-aurora .project-aside { display:grid;grid-template-columns:1fr 1fr; }
  .theme-aurora .task-feed > [class~="space-y-2.5"] { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px; }
  .theme-aurora .task-row { grid-template-columns:26px 8px minmax(0,1fr) 32px;min-height:115px;align-content:center; }
  .theme-aurora .task-row > span:nth-last-child(2) { display:none; }

  /* 04 Index — cardsiz, katta full-width project qatorlari */
  .theme-smoke .project-grid { grid-template-columns:1fr;gap:0;border-top:1px solid var(--cv-line); }
  .theme-smoke .project-card { min-height:170px;display:grid;grid-template-columns:minmax(0,1fr) minmax(270px,.7fr);align-items:center;gap:28px;border-width:0 1px 1px;border-radius:0;padding:24px 22px;background:transparent;box-shadow:none;backdrop-filter:none; }
  .theme-smoke .project-card:first-child { border-top-width:1px; }
  .theme-smoke .project-card::before { display:none; }
  .theme-smoke .project-card:hover { background:rgba(255,255,255,.035);transform:none;box-shadow:none; }
  .theme-smoke .project-card > div:first-child { display:contents; }
  .theme-smoke .project-arrow { display:none; }
  .theme-smoke .project-card > div:nth-child(2) { grid-column:1;grid-row:1;margin-top:0; }
  .theme-smoke .project-card > div:last-child { grid-column:2;grid-row:1;margin-top:0; }
  .theme-smoke .project-title { font-size:clamp(34px,4vw,58px); }
  .theme-smoke .project-percent { display:block;width:auto;height:auto;flex:none;border-radius:0;background:none;font-size:48px;font-weight:650;line-height:.9;letter-spacing:-.065em;box-shadow:none; }
  .theme-smoke .project-card > div:last-child > div:first-child { align-items:center; }
  .theme-smoke .add-card { min-height:100px;border-width:0 0 1px;border-radius:0; }
  .theme-smoke .space-layout { grid-template-columns:290px minmax(0,1fr); }
  .theme-smoke .project-aside { order:-1; }

  /* 05 Bento — katta-kichik aralash mosaic */
  .theme-pearl .project-grid { grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-flow:dense;grid-auto-rows:220px;gap:14px; }
  .theme-pearl .project-card { min-height:0; }
  .theme-pearl .project-card:nth-child(1) { grid-column:span 2;grid-row:span 2; }
  .theme-pearl .project-card:nth-child(2),.theme-pearl .project-card:nth-child(5) { grid-column:span 2; }
  .theme-pearl .project-card:nth-child(3),.theme-pearl .project-card:nth-child(4) { grid-column:span 1; }
  .theme-pearl .project-card:nth-child(6) { grid-column:span 2; }
  .theme-pearl .project-card:nth-child(1) .project-title { font-size:clamp(42px,5vw,70px);max-width:80%; }
  .theme-pearl .project-card:not(:first-child) > div:nth-child(2) { margin-top:34px; }
  .theme-pearl .project-card:not(:first-child) .project-description { display:none; }
  .theme-pearl .add-card { grid-column:span 2;min-height:0; }
  .theme-pearl .task-feed > [class~="space-y-2.5"] { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px; }
  .theme-pearl .task-row { min-height:130px;grid-template-columns:30px 8px minmax(0,1fr) 32px; }
  .theme-pearl .task-row > span:nth-last-child(2) { display:none; }

  /* 06 Rail — viewport bo'ylab gorizontal project gallery */
  .theme-editorial .project-grid { display:flex;align-items:center;gap:0;overflow-x:auto;margin-inline:-36px;padding:60px 36px 90px;perspective:1400px;scroll-snap-type:x mandatory;scrollbar-width:none; }
  .theme-editorial .project-grid::-webkit-scrollbar { display:none; }
  .theme-editorial .project-card { flex:0 0 min(430px,67vw);min-height:500px;margin-right:-70px;scroll-snap-align:center;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.16,1,.3,1),opacity .35s ease,background .25s ease,border-color .25s ease; }
  .theme-editorial .project-card:nth-child(1) { transform:translateZ(-170px) rotateY(34deg) scale(.76);opacity:.6; }
  .theme-editorial .project-card:nth-child(2) { transform:translateZ(-80px) rotateY(23deg) scale(.87);opacity:.78; }
  .theme-editorial .project-card:nth-child(3) { transform:translateZ(45px) rotateY(7deg) scale(1);opacity:1; }
  .theme-editorial .project-card:nth-child(4) { transform:translateZ(35px) rotateY(-7deg) scale(.98);opacity:1; }
  .theme-editorial .project-card:nth-child(5) { transform:translateZ(-85px) rotateY(-23deg) scale(.86);opacity:.78; }
  .theme-editorial .project-card:nth-child(6) { transform:translateZ(-175px) rotateY(-34deg) scale(.75);opacity:.6; }
  .theme-editorial .project-grid .project-card:hover { transform:translateY(-8px) translateZ(150px) rotateY(0) scale(1.06);opacity:1;z-index:15; }
  .theme-editorial .project-card > div:nth-child(2) { margin-top:180px; }
  .theme-editorial .project-title { font-size:clamp(42px,5vw,68px); }
  .theme-editorial .add-card { flex:0 0 280px;min-height:520px; }
  .theme-editorial .space-layout { grid-template-columns:1fr; }
  .theme-editorial .project-aside { display:grid;grid-template-columns:1fr 1fr; }
  .theme-editorial .task-row { min-height:105px;padding-inline:24px; }

  /* 07 Blocks — rangli ikki ustunli yirik solid panellar */
  .theme-swiss .project-grid { grid-template-columns:repeat(2,minmax(0,1fr));gap:10px; }
  .theme-swiss .project-card { min-height:380px;border-radius:4px; }
  .theme-swiss .project-card:nth-child(3n+1) { --cv-card:#1e3029;--cv-card-hover:#263d34; }
  .theme-swiss .project-card:nth-child(3n+2) { --cv-card:#29243b;--cv-card-hover:#342e4b; }
  .theme-swiss .project-card:nth-child(3n) { --cv-card:#3a2821;--cv-card-hover:#493129; }
  .theme-swiss .project-card > div:nth-child(2) { margin-top:100px; }
  .theme-swiss .project-title { font-size:clamp(38px,4vw,62px); }
  .theme-swiss .add-card { min-height:220px; }
  .theme-swiss .project-hero { min-height:340px;align-items:flex-start; }
  .theme-swiss .task-feed > [class~="space-y-2.5"] { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px; }
  .theme-swiss .task-row { min-height:140px;grid-template-columns:28px 8px minmax(0,1fr) 32px;align-content:center; }
  .theme-swiss .task-row > span:nth-last-child(2) { display:none; }

  /* 08 Matrix — juda dense project control panel */
  .theme-terminal .project-grid { grid-template-columns:repeat(5,minmax(0,1fr));gap:8px; }
  .theme-terminal .project-card { min-height:245px;padding:16px; }
  .theme-terminal .project-card > div:nth-child(2) { margin-top:48px; }
  .theme-terminal .project-title { font-size:clamp(20px,1.7vw,27px); }
  .theme-terminal .project-description { display:none; }
  .theme-terminal .project-task-count { font-size:13px; }
  .theme-terminal .add-card { min-height:245px; }
  .theme-terminal .space-layout { grid-template-columns:minmax(0,1fr) 240px;gap:8px; }
  .theme-terminal .task-feed { padding:10px; }
  .theme-terminal .task-feed > [class~="space-y-2.5"] { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px; }
  .theme-terminal .task-row { min-height:82px;padding:11px; }

  /* 09 Stack — markazdagi bir ustunli katta feed */
  .theme-neon .project-grid { grid-template-columns:minmax(0,900px);justify-content:center;gap:12px; }
  .theme-neon .project-card { min-height:210px;display:grid;grid-template-columns:110px minmax(0,1fr) 190px;align-items:center;gap:22px; }
  .theme-neon .project-card > div:first-child { grid-column:1; }
  .theme-neon .project-card > div:nth-child(2) { grid-column:2;margin-top:0; }
  .theme-neon .project-card > div:last-child { grid-column:3;margin-top:0; }
  .theme-neon .project-arrow { display:none; }
  .theme-neon .project-title { font-size:clamp(30px,4vw,50px); }
  .theme-neon .add-card { min-height:120px; }
  .theme-neon .project-hero { text-align:center;align-items:center;flex-direction:column; }
  .theme-neon .project-score { align-items:center; }
  .theme-neon .space-layout { grid-template-columns:1fr;max-width:900px;margin-inline:auto; }
  .theme-neon .project-aside { display:none; }

  /* 10 Canvas — asymmetric editorial dashboard */
  .theme-luxe .project-grid { grid-template-columns:repeat(6,minmax(0,1fr));grid-auto-rows:260px;gap:12px; }
  .theme-luxe .project-card { min-height:0; }
  .theme-luxe .project-card:nth-child(1),.theme-luxe .project-card:nth-child(4) { grid-column:span 4; }
  .theme-luxe .project-card:nth-child(2),.theme-luxe .project-card:nth-child(3) { grid-column:span 2; }
  .theme-luxe .project-card:nth-child(5),.theme-luxe .project-card:nth-child(6) { grid-column:span 3; }
  .theme-luxe .project-card:nth-child(1) .project-title,.theme-luxe .project-card:nth-child(4) .project-title { font-size:clamp(38px,4vw,62px); }
  .theme-luxe .project-card:nth-child(2) .project-description,.theme-luxe .project-card:nth-child(3) .project-description { display:none; }
  .theme-luxe .project-card > div:nth-child(2) { margin-top:44px; }
  .theme-luxe .add-card { grid-column:span 3;min-height:160px; }
  .theme-luxe .space-layout { grid-template-columns:300px minmax(0,1fr); }
  .theme-luxe .project-aside { order:-1; }
  .theme-luxe .task-feed > [class~="space-y-2.5"] { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px; }
  .theme-luxe .task-row { min-height:115px;grid-template-columns:28px 8px minmax(0,1fr) 32px; }
  .theme-luxe .task-row > span:nth-last-child(2) { display:none; }

  /* Index — graphite rang oilasi */
  .theme-smoke.index-graphite { --cv-page:#0b0d0c;--cv-accent:#b6bcb8;--cv-line:rgba(220,226,222,.1);--cv-backdrop:radial-gradient(ellipse 70% 48% at 50% -8%,#39403c 0%,#1b1f1c 34%,transparent 68%),linear-gradient(145deg,#0d100e,#090b0a);--cv-card:rgba(212,220,215,.05);--cv-card-hover:rgba(212,220,215,.085);--cv-progress:#b6bcb8; }
  .theme-smoke .workspace-noise { display:none !important; }
  .theme-smoke.index-graphite::before { background:radial-gradient(ellipse 78% 50% at 50% -12%,#3c433f 0%,#1c201e 36%,#0b0d0c 72%); }
  .theme-smoke.index-graphite .project-card { border-color:rgba(225,232,228,.11);background:rgba(24,29,26,.58);box-shadow:inset 0 1px 0 rgba(255,255,255,.075),0 18px 45px rgba(0,0,0,.16);backdrop-filter:blur(36px) saturate(125%); }
  .theme-smoke.index-graphite .project-card:hover { border-color:rgba(225,232,228,.11);background:rgba(31,37,34,.7);box-shadow:inset 0 1px 0 rgba(255,255,255,.075),0 18px 45px rgba(0,0,0,.16); }

  /* 11 Orbit 3D — cardlar markaz atrofida yarim doira */
  .theme-orbit { --cv-page:#070a0f;--cv-ink:#f3f7ff;--cv-muted:rgba(225,235,250,.5);--cv-accent:#91caff;--cv-line:rgba(145,202,255,.12);--cv-header:rgba(7,10,15,.4);--cv-backdrop:radial-gradient(circle at 50% 38%,#172f48,transparent 42%),#070a0f;--cv-card:linear-gradient(145deg,rgba(145,202,255,.13),rgba(255,255,255,.035));--cv-card-hover:linear-gradient(145deg,rgba(145,202,255,.2),rgba(255,255,255,.06));--cv-border:1px solid rgba(145,202,255,.17);--cv-border-hover:1px solid rgba(175,218,255,.55);--cv-shadow:0 30px 80px rgba(0,0,0,.35);--cv-shadow-hover:0 45px 110px rgba(0,0,0,.5),0 0 45px rgba(80,166,255,.13);--cv-shine:rgba(220,240,255,.12);--cv-panel:rgba(15,29,43,.65);--cv-panel-border:1px solid rgba(145,202,255,.13);--cv-panel-shadow:none;--cv-row:rgba(145,202,255,.04);--cv-row-hover:rgba(145,202,255,.1);--cv-row-border:1px solid rgba(145,202,255,.09);--cv-row-border-hover:1px solid rgba(145,202,255,.26);--cv-row-shadow:none;--cv-code-bg:rgba(145,202,255,.08);--cv-code-border:1px solid rgba(145,202,255,.28);--cv-progress:#91caff;--cv-progress-track:rgba(145,202,255,.09);--cv-progress-glow:0 0 18px rgba(80,166,255,.4);--cv-drawer:rgba(7,13,20,.9);--cv-button:rgba(145,202,255,.04);--cv-button-border:1px solid rgba(145,202,255,.13);--cv-font:var(--font-manrope),sans-serif;--cv-display:var(--font-manrope),sans-serif;--cv-title-weight:650;--cv-card-radius:24px;--cv-panel-radius:24px;--cv-row-radius:15px;--cv-code-radius:999px;--cv-button-radius:999px;--cv-progress-radius:999px;--cv-progress-height:8px;--cv-blur:28px;--cv-sat:135%;--cv-glow-blur:38px;--cv-glow-opacity:.55;--cv-noise:.05;--cv-animation:orbitIn .75s both cubic-bezier(.18,.85,.2,1);--cv-transition:.5s cubic-bezier(.18,.85,.2,1);--cv-hover-transform:none;--cv-hover-filter:none;--cv-row-transform:translateX(4px); }
  .theme-orbit .workspace-grid-page { display:flex;flex-direction:column; }
  .theme-orbit .project-grid-section { flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding-top:0;padding-bottom:0; }
  .theme-orbit .project-grid { position:relative;display:block;width:100%;height:640px;max-height:100%;perspective:1750px;transform-style:preserve-3d; }
  .theme-orbit .orbit-draggable { cursor:grab;touch-action:none;user-select:none; }
  .theme-orbit .orbit-draggable.is-dragging { cursor:grabbing; }
  .theme-orbit .orbit-draggable:is(.is-dragging,.is-gliding) .project-card { transition:opacity .2s ease,background .2s ease,border-color .2s ease,box-shadow .2s ease; }
  .theme-orbit .orbit-draggable.is-snapping .project-card { transition:transform .58s cubic-bezier(.16,1,.3,1),opacity .35s ease; }
  .theme-orbit .project-card { position:absolute;left:50%;top:50%;width:min(460px,40vw);min-height:520px;margin-top:-260px;translate:-50% 0;transform-style:preserve-3d;will-change:transform; }
  .theme-orbit .project-percent { display:block;width:auto;height:auto;flex:none;border-radius:0;background:none;font-size:52px;font-weight:650;line-height:.88;letter-spacing:-.065em;box-shadow:none; }
  .theme-orbit .project-card:nth-child(1) { transform:translateX(-118%) translateZ(-180px) rotateY(48deg) scale(.78);z-index:1; }
  .theme-orbit .project-card:nth-child(2) { transform:translateX(-72%) translateZ(-80px) rotateY(28deg) scale(.9);z-index:2; }
  .theme-orbit .project-card:nth-child(3) { transform:translateX(-24%) translateZ(70px) rotateY(8deg) scale(1);z-index:4; }
  .theme-orbit .project-card:nth-child(4) { transform:translateX(24%) translateZ(40px) rotateY(-10deg) scale(.96);z-index:3; }
  .theme-orbit .project-card:nth-child(5) { transform:translateX(72%) translateZ(-90px) rotateY(-30deg) scale(.88);z-index:2; }
  .theme-orbit .project-card:nth-child(6) { transform:translateX(118%) translateZ(-190px) rotateY(-50deg) scale(.76);z-index:1; }
  .theme-orbit .add-card { display:none; }
  .theme-orbit .project-grid:has(.project-card:hover) .project-card:not(:hover) { opacity:.32;filter:blur(1.5px); }
  .theme-orbit .project-grid .project-card:hover { transform:translateX(0) translateZ(230px) rotateY(0) scale(1.12);z-index:20;opacity:1;filter:none; }
  .theme-orbit .space-layout { grid-template-columns:1fr; }
  .theme-orbit .project-aside { display:grid;grid-template-columns:1fr 1fr; }
  .theme-orbit .task-feed > [class~="space-y-2.5"] { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px; }

  /* 12 Coverflow 3D — yon cardlar chuqurlikda buriladi */
  .theme-coverflow { --cv-page:#0a0710;--cv-ink:#faf5ff;--cv-muted:rgba(241,225,255,.48);--cv-accent:#d5a9ff;--cv-line:rgba(213,169,255,.13);--cv-header:rgba(10,7,16,.42);--cv-backdrop:radial-gradient(circle at 50% 15%,#3a1751,transparent 42%),#0a0710;--cv-card:rgba(170,90,225,.09);--cv-card-hover:rgba(184,105,238,.15);--cv-border:1px solid rgba(213,169,255,.16);--cv-border-hover:1px solid rgba(225,190,255,.52);--cv-shadow:0 30px 75px rgba(0,0,0,.34);--cv-shadow-hover:0 45px 100px rgba(0,0,0,.48);--cv-shine:rgba(240,215,255,.11);--cv-panel:rgba(34,17,46,.64);--cv-panel-border:1px solid rgba(213,169,255,.13);--cv-panel-shadow:none;--cv-row:rgba(213,169,255,.04);--cv-row-hover:rgba(213,169,255,.1);--cv-row-border:1px solid rgba(213,169,255,.09);--cv-row-border-hover:1px solid rgba(213,169,255,.25);--cv-row-shadow:none;--cv-code-bg:rgba(213,169,255,.08);--cv-code-border:1px solid rgba(213,169,255,.27);--cv-progress:linear-gradient(90deg,#bd79f0,#f0a6d7);--cv-progress-track:rgba(213,169,255,.09);--cv-progress-glow:0 0 17px rgba(189,121,240,.35);--cv-drawer:rgba(18,8,25,.9);--cv-button:rgba(213,169,255,.04);--cv-button-border:1px solid rgba(213,169,255,.13);--cv-font:var(--font-jakarta),sans-serif;--cv-display:var(--font-jakarta),sans-serif;--cv-title-weight:650;--cv-card-radius:26px;--cv-panel-radius:24px;--cv-row-radius:16px;--cv-code-radius:11px;--cv-button-radius:12px;--cv-progress-radius:999px;--cv-progress-height:8px;--cv-blur:28px;--cv-sat:145%;--cv-glow-blur:40px;--cv-glow-opacity:.6;--cv-noise:.05;--cv-animation:coverIn .7s both ease-out;--cv-transition:.45s cubic-bezier(.18,.85,.2,1);--cv-hover-transform:none;--cv-hover-filter:none;--cv-row-transform:translateX(3px); }
  .theme-coverflow .project-grid { position:relative;display:block;height:610px;margin-inline:-36px;perspective:1450px;transform-style:preserve-3d;overflow:hidden; }
  .theme-coverflow .project-card { position:absolute;left:50%;top:70px;width:220px;min-height:440px;margin-left:-110px;padding:20px 18px;border-radius:5px 16px 16px 5px;background:linear-gradient(90deg,rgba(0,0,0,.22),transparent 10%),color-mix(in srgb,var(--tint) 24%,#171020);transform-origin:center center; }
  .theme-coverflow .project-card::after { content:"";position:absolute;left:8px;top:0;bottom:0;width:1px;background:rgba(255,255,255,.13);box-shadow:3px 0 8px rgba(0,0,0,.25); }
  .theme-coverflow .project-card::before { width:130px;height:130px;inset:-35px -40px auto auto;opacity:.45; }
  .theme-coverflow .project-card > div:nth-child(2) { margin-top:82px; }
  .theme-coverflow .project-title { font-size:23px;line-height:1.04;overflow-wrap:anywhere; }
  .theme-coverflow .project-description { display:block;margin-top:12px;font-size:13px;line-height:1.4; }
  .theme-coverflow .project-task-count { font-size:13px; }
  .theme-coverflow .project-task-count b { font-size:17px; }
  .theme-coverflow .project-percent { font-size:15px; }
  .theme-coverflow .project-grid:has(.project-card:hover) .project-card:not(:hover) { filter:none; }
  .theme-coverflow .add-card { display:none; }
  .theme-coverflow .project-hero { min-height:300px; }
  .theme-coverflow .task-row { min-height:105px; }

  /* 12 Flow Classic — avvalgi keng coverflow ko'rinishi */
  .theme-coverflowClassic { --cv-accent:#c9b4ef;--cv-backdrop:radial-gradient(circle at 50% 10%,#321b4a,transparent 42%),#09070e;--cv-card:rgba(176,123,222,.085);--cv-card-hover:rgba(190,139,232,.15);--cv-border:1px solid rgba(210,177,240,.15);--cv-border-hover:1px solid rgba(222,195,246,.48);--cv-progress:linear-gradient(90deg,#b987e5,#e5a5ce);--cv-progress-glow:0 0 16px rgba(185,135,229,.3);--cv-animation:threeDFade .42s both ease-out; }
  .theme-coverflowClassic .project-grid { position:relative;display:block;height:610px;margin-inline:-36px;perspective:1350px;transform-style:preserve-3d;overflow:hidden; }
  .theme-coverflowClassic .project-card { position:absolute;left:50%;top:72px;width:340px;min-height:410px;margin-left:-170px;transform-style:preserve-3d; }
  .theme-coverflowClassic .project-grid:has(.project-card:hover) .project-card:not(:hover) { filter:none; }
  .theme-coverflowClassic .add-card { display:none; }
  .theme-coverflowClassic .project-hero { min-height:300px; }


  /* 14 Command — project manager control room */
  .theme-command { --cv-page:#0b0d10;--cv-ink:#f4f6f8;--cv-muted:rgba(226,231,237,.46);--cv-accent:#7ca8ff;--cv-line:rgba(124,168,255,.11);--cv-header:#101318;--cv-backdrop:linear-gradient(135deg,#0b0d10,#111722);--cv-card:#12171f;--cv-card-hover:#18202b;--cv-border:1px solid #242b36;--cv-border-hover:1px solid #42689e;--cv-shadow:none;--cv-shadow-hover:0 15px 40px rgba(0,0,0,.25);--cv-shine:rgba(255,255,255,.04);--cv-panel:#12171f;--cv-panel-border:1px solid #242b36;--cv-panel-shadow:none;--cv-row:#171d26;--cv-row-hover:#1d2632;--cv-row-border:1px solid #252d39;--cv-row-border-hover:1px solid #38557a;--cv-row-shadow:none;--cv-code-bg:#1b2b45;--cv-code-border:1px solid #29436b;--cv-progress:#7ca8ff;--cv-progress-track:#252c35;--cv-progress-glow:none;--cv-drawer:#10141b;--cv-button:#171d26;--cv-button-border:1px solid #28313e;--cv-font:var(--font-inter),sans-serif;--cv-display:var(--font-inter),sans-serif;--cv-title-weight:650;--cv-card-radius:10px;--cv-panel-radius:10px;--cv-row-radius:8px;--cv-code-radius:7px;--cv-button-radius:7px;--cv-progress-radius:2px;--cv-progress-height:6px;--cv-blur:0px;--cv-sat:100%;--cv-glow-blur:50px;--cv-glow-opacity:.12;--cv-noise:.035;--cv-animation:commandIn .45s both ease-out;--cv-transition:.18s ease;--cv-hover-transform:translateY(-2px);--cv-hover-filter:none;--cv-row-transform:translateX(2px); }
  .theme-command .project-grid { grid-template-columns:repeat(3,minmax(0,1fr));gap:8px; }
  .theme-command .project-card { min-height:270px;padding:18px; }
  .theme-command .project-card > div:nth-child(2) { margin-top:58px; }
  .theme-command .project-description { display:none; }
  .theme-command .space-layout { grid-template-columns:minmax(0,1fr) 250px;gap:8px; }
  .theme-command .task-feed { padding:10px; }
  .theme-command .task-feed > [class~="space-y-2.5"] { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px; }
  .theme-command .task-row { min-height:90px;padding:12px; }

  /* 15 Timeline — milestone oqimi */
  .theme-timeline { --cv-page:#0d0e0d;--cv-ink:#f2f1ed;--cv-muted:rgba(235,232,224,.48);--cv-accent:#e7b875;--cv-line:rgba(231,184,117,.12);--cv-header:rgba(13,14,13,.55);--cv-backdrop:radial-gradient(circle at 50% 0,#332919,transparent 42%),#0d0e0d;--cv-card:rgba(255,255,255,.035);--cv-card-hover:rgba(231,184,117,.075);--cv-border:1px solid rgba(231,184,117,.15);--cv-border-hover:1px solid rgba(231,184,117,.42);--cv-shadow:0 22px 60px rgba(0,0,0,.2);--cv-shadow-hover:0 28px 75px rgba(0,0,0,.32);--cv-shine:rgba(255,236,205,.07);--cv-panel:rgba(35,29,20,.55);--cv-panel-border:1px solid rgba(231,184,117,.13);--cv-panel-shadow:none;--cv-row:rgba(231,184,117,.035);--cv-row-hover:rgba(231,184,117,.08);--cv-row-border:1px solid rgba(231,184,117,.09);--cv-row-border-hover:1px solid rgba(231,184,117,.24);--cv-row-shadow:none;--cv-code-bg:rgba(231,184,117,.08);--cv-code-border:1px solid rgba(231,184,117,.28);--cv-progress:#e7b875;--cv-progress-track:rgba(231,184,117,.09);--cv-progress-glow:none;--cv-drawer:rgba(18,15,10,.9);--cv-button:rgba(231,184,117,.04);--cv-button-border:1px solid rgba(231,184,117,.13);--cv-font:var(--font-manrope),sans-serif;--cv-display:var(--font-serif),Georgia,serif;--cv-title-weight:400;--cv-card-radius:18px;--cv-panel-radius:20px;--cv-row-radius:13px;--cv-code-radius:999px;--cv-button-radius:999px;--cv-progress-radius:999px;--cv-progress-height:7px;--cv-blur:24px;--cv-sat:115%;--cv-glow-blur:48px;--cv-glow-opacity:.3;--cv-noise:.07;--cv-animation:timelineIn .6s both ease-out;--cv-transition:.25s ease;--cv-hover-transform:translateY(-3px);--cv-hover-filter:none;--cv-row-transform:translateX(3px); }
  .theme-timeline .project-grid { position:relative;display:flex;max-width:1050px;flex-direction:column;gap:22px;margin-inline:auto;padding-block:20px; }
  .theme-timeline .project-grid::before { content:"";position:absolute;left:50%;top:0;bottom:0;width:1px;background:linear-gradient(transparent,var(--cv-accent),transparent);opacity:.4; }
  .theme-timeline .project-card { width:calc(50% - 38px);min-height:285px; }
  .theme-timeline .project-card:nth-child(even) { align-self:flex-end; }
  .theme-timeline .project-card::after { content:"";position:absolute;top:52px;width:14px;height:14px;border:3px solid var(--cv-page);border-radius:999px;background:var(--cv-accent);box-shadow:0 0 18px rgba(231,184,117,.35); }
  .theme-timeline .project-card:nth-child(odd)::after { right:-46px; }
  .theme-timeline .project-card:nth-child(even)::after { left:-46px; }
  .theme-timeline .add-card { width:calc(50% - 38px);align-self:flex-end; }
  .theme-timeline .space-layout { grid-template-columns:1fr;max-width:950px;margin:auto; }
  .theme-timeline .project-aside { display:grid;grid-template-columns:1fr 1fr; }

  /* 16 Portfolio — professional data/table view */
  .theme-portfolio { --cv-page:#0a0b0c;--cv-ink:#f3f4f4;--cv-muted:rgba(228,231,232,.45);--cv-accent:#96d1c0;--cv-line:rgba(255,255,255,.08);--cv-header:#0d0f10;--cv-backdrop:linear-gradient(150deg,#0a0b0c,#111514);--cv-card:transparent;--cv-card-hover:rgba(255,255,255,.035);--cv-border:0 solid transparent;--cv-border-hover:0 solid transparent;--cv-shadow:none;--cv-shadow-hover:none;--cv-shine:transparent;--cv-panel:#111413;--cv-panel-border:1px solid rgba(255,255,255,.08);--cv-panel-shadow:none;--cv-row:#151918;--cv-row-hover:#1a201e;--cv-row-border:1px solid rgba(255,255,255,.07);--cv-row-border-hover:1px solid rgba(150,209,192,.22);--cv-row-shadow:none;--cv-code-bg:rgba(150,209,192,.08);--cv-code-border:1px solid rgba(150,209,192,.24);--cv-progress:#96d1c0;--cv-progress-track:rgba(255,255,255,.07);--cv-progress-glow:none;--cv-drawer:#101312;--cv-button:#151918;--cv-button-border:1px solid rgba(255,255,255,.08);--cv-font:var(--font-inter),sans-serif;--cv-display:var(--font-inter),sans-serif;--cv-title-weight:650;--cv-card-radius:0px;--cv-panel-radius:12px;--cv-row-radius:8px;--cv-code-radius:7px;--cv-button-radius:8px;--cv-progress-radius:2px;--cv-progress-height:6px;--cv-blur:0px;--cv-sat:100%;--cv-glow-blur:50px;--cv-glow-opacity:0;--cv-noise:.04;--cv-animation:portfolioIn .45s both ease-out;--cv-transition:.18s ease;--cv-hover-transform:translateX(5px);--cv-hover-filter:none;--cv-row-transform:translateX(2px); }
  .theme-portfolio .project-grid { grid-template-columns:1fr;gap:0;border:1px solid var(--cv-line);border-radius:12px;overflow:hidden;background:#111413; }
  .theme-portfolio .project-card { min-height:128px;display:grid;grid-template-columns:64px minmax(0,1fr) 300px;align-items:center;gap:20px;border-bottom:1px solid var(--cv-line);padding:18px 22px; }
  .theme-portfolio .project-card > div:first-child { display:contents; }
  .theme-portfolio .project-code { grid-column:1; }
  .theme-portfolio .project-arrow { display:none; }
  .theme-portfolio .project-card > div:nth-child(2) { grid-column:2;margin-top:0; }
  .theme-portfolio .project-card > div:last-child { grid-column:3;margin-top:0; }
  .theme-portfolio .project-title { font-size:27px; }
  .theme-portfolio .project-description { margin-top:4px;font-size:13px; }
  .theme-portfolio .add-card { min-height:80px;border:0;border-radius:0; }
  .theme-portfolio .space-layout { grid-template-columns:260px minmax(0,1fr);gap:10px; }
  .theme-portfolio .project-aside { order:-1; }

  :is(.theme-orbit,.theme-coverflow,.theme-coverflowClassic) .project-card { animation:threeDFade .42s both ease-out;backdrop-filter:blur(28px) saturate(135%);backface-visibility:hidden;transform-style:preserve-3d;will-change:transform,opacity;transition:transform .82s cubic-bezier(.16,1,.3,1),opacity .42s ease,background .25s ease,border-color .25s ease,box-shadow .25s ease; }
  :is(.theme-orbit,.theme-coverflow,.theme-coverflowClassic) .project-grid:has(.project-card:hover) .project-card:not(:hover) { filter:none; }
  :is(.theme-orbit,.theme-coverflow,.theme-coverflowClassic) .project-card * { transform:translateZ(0); }
  .theme-orbit .project-card:nth-child(n) { border:var(--orbit-border,var(--cv-border));background:var(--orbit-card,linear-gradient(145deg,rgba(35,55,69,.92),rgba(15,25,32,.88)));box-shadow:var(--orbit-shadow,var(--cv-shadow)),inset 0 1px 0 var(--cv-shine);backdrop-filter:blur(var(--orbit-blur,28px)) saturate(var(--orbit-saturation,135%)); }
  .theme-orbit .project-card:nth-child(n):hover { border:var(--orbit-border,var(--cv-border));background:var(--orbit-card,linear-gradient(145deg,rgba(35,55,69,.92),rgba(15,25,32,.88)));box-shadow:var(--orbit-shadow,var(--cv-shadow)),inset 0 1px 0 var(--cv-shine);filter:none; }
  .theme-orbit.orbit-mono { --cv-accent:#e8e8e5;--cv-progress:#e8e8e5;--cv-backdrop:radial-gradient(circle at 50% 35%,#373737,transparent 44%),#0b0b0b;--orbit-shadow:0 28px 75px rgba(0,0,0,.44);--orbit-blur:0px;--cv-shine:rgba(255,255,255,.1); }
  .theme-orbit.orbit-mono .project-card:nth-child(n),
  .theme-orbit.orbit-mono .project-card:nth-child(n):hover { border:1px solid color-mix(in srgb,var(--tint) 22%,rgba(255,255,255,.1));background:linear-gradient(145deg,color-mix(in srgb,var(--tint) 24%,#242424),color-mix(in srgb,var(--tint) 12%,#111)); }
  .theme-orbit.orbit-mono .project-card:nth-child(n):hover { background:linear-gradient(145deg,color-mix(in srgb,var(--tint) 30%,#282828),color-mix(in srgb,var(--tint) 16%,#141414)); }
  .theme-orbit.orbit-mono .project-card::before { display:none; }
  .theme-coverflowClassic .project-card:nth-child(n) { background:linear-gradient(145deg,rgba(54,33,72,.94),rgba(28,18,39,.9)); }
  .theme-coverflow .project-card:nth-child(n) { background:linear-gradient(90deg,rgba(0,0,0,.25),transparent 11%),color-mix(in srgb,var(--tint) 46%,#18111f); }
  .theme-orbit .project-card { transition:transform .12s linear,opacity .3s ease,background .25s ease,border-color .25s ease,box-shadow .25s ease; }
  .theme-coverflowClassic .project-card { transition:transform 1.17s cubic-bezier(.16,1,.3,1),opacity .55s ease,background .25s ease,border-color .25s ease,box-shadow .25s ease; }
  .theme-coverflow .project-card { transition:transform 1.37s cubic-bezier(.16,1,.3,1),opacity .62s ease,background .25s ease,border-color .25s ease,box-shadow .25s ease; }
  @keyframes threeDFade { from { opacity:0; } }
  @keyframes orbitIn { from { opacity:0;transform:translateY(80px) rotateY(45deg) scale(.7); } }
  @keyframes coverIn { from { opacity:0;transform:translateX(90px) rotateY(-65deg) scale(.65); } }
  @keyframes commandIn { from { opacity:0;transform:translateY(10px); } }
  @keyframes timelineIn { from { opacity:0;transform:translateY(35px); } }
  @keyframes portfolioIn { from { opacity:0;transform:translateX(-18px); } }

  @keyframes crystalIn { from { opacity:0;transform:translateY(15px); } }
  @keyframes driftIn { from { opacity:0;transform:translateY(34px) scale(.97); } }
  @keyframes haloIn { from { opacity:0;transform:scale(.94);filter:blur(8px); } }
  @keyframes prismIn { from { opacity:0;transform:translateX(-18px); } }
  @keyframes outlineIn { from { opacity:0;clip-path:inset(0 100% 0 0); } }
  @keyframes solidIn { from { opacity:0;transform:translateY(12px) rotateX(5deg); } }
  @keyframes quietIn { from { opacity:0;transform:translateY(8px); } }
  @keyframes edgeIn { from { opacity:0;transform:translate(-12px,12px); } }
  @keyframes monoIn { from { opacity:0;filter:contrast(0); } }
  @keyframes pulseIn { 0% { opacity:0;transform:scale(.96);box-shadow:0 0 0 rgba(255,105,55,0); } 75% { box-shadow:0 0 40px rgba(255,105,55,.12); } }
  @keyframes card-in { from { opacity: 0; transform: translateY(15px); } }
  @keyframes panel-in { from { transform: translateX(100%); } }
  @keyframes taskSweep { 0% { transform:translateX(-110%); } 100% { transform:translateX(110%); } }
  @keyframes taskGreenCard { 0% { border-color:rgba(255,255,255,.09);background:rgba(255,255,255,.035);box-shadow:0 0 0 rgba(112,211,166,0); } 48% { border-color:rgba(151,235,196,.58);background:rgba(73,151,116,.3);box-shadow:inset 0 0 34px rgba(122,225,177,.12),0 0 28px rgba(70,190,135,.16); } 100% { border-color:rgba(151,235,196,.38);background:rgba(49,119,85,.24);box-shadow:inset 0 0 26px rgba(122,225,177,.08),0 0 18px rgba(70,190,135,.1); } }
  @keyframes checkBloom { 0% { transform:scale(.72) rotate(-14deg); } 48% { transform:scale(1.22) rotate(4deg); } 100% { transform:scale(1) rotate(0); } }
  @keyframes checkRing { 0% { opacity:.8;transform:scale(.55); } 100% { opacity:0;transform:scale(1.65); } }
  @keyframes checkDraw { from { opacity:0;transform:scale(.25) rotate(-22deg); } to { opacity:1;transform:scale(1) rotate(0); } }
  @keyframes modalFade { from { opacity:0; } }
  @keyframes modalRise { from { opacity:0;transform:translateY(18px) scale(.97); } }
  @keyframes liveBar { from { transform:scaleY(.42);opacity:.45; } to { transform:scaleY(1);opacity:1; } }
  @keyframes activeGlow { 0%,100% { opacity:.45;transform:scale(.85); } 50% { opacity:1;transform:scale(1.14); } }
  @keyframes activeFinish { 0% { transform:scale(1); } 45% { transform:scale(1.025);box-shadow:0 0 38px rgba(112,211,166,.18); } 100% { transform:scale(.985);opacity:.72; } }
  .theme-obsidian .task-row:hover { border-color:var(--line);background:var(--glass-hover);box-shadow:none;transform:none; }
  .theme-obsidian .task-row.is-completing,
  .theme-obsidian .task-row.is-completing:hover { animation:taskGreenCard .7s cubic-bezier(.16,1,.3,1) forwards; }
  .project-board-content { width:100%;height:calc(100dvh - 76px);display:flex;flex-direction:column;overflow:hidden; }
  .theme-obsidian .project-hero { display:grid;grid-template-columns:minmax(520px,1.55fr) minmax(300px,.65fr);align-items:stretch;column-gap:18px; }
  .project-hero-summary { position:relative;z-index:1;display:flex;min-width:0;flex-direction:column;justify-content:space-between;align-items:flex-end;padding:4px 0 2px;text-align:right; }
  .project-hero-summary .project-score { align-items:flex-end; }
  /* space-layout o'zi bitta cheklangan balandlikka ega bo'lib (flex:1 +
     min-height:0), ichida task-feed/aside mustaqil scroll qiladi (desktop,
     ikki ustun teng balandlikda cho'zilganda) — mobil'da (bitta ustunga
     yig'ilganda) satrlar tabiiy balandligicha qoladi va shu konteynerning
     o'zi bitta scroll zonasiga aylanadi, header/hero doim ko'rinib turadi. */
  .project-board-content .space-layout { flex:1;align-items:stretch;min-height:0;overflow-y:auto; }
  .theme-obsidian .task-feed { min-height:0;height:100%;display:flex;flex-direction:column;overflow:hidden; }
  .theme-obsidian .task-list { flex:1;min-height:0;overflow-y:auto; }
  .theme-obsidian .project-aside { min-height:0;height:100%;overflow-y:auto; }
  @media (max-width: 1100px) { .focus-button { display:none !important; } }
  @media (max-width: 700px) { .workspace-header { height:auto;min-height:104px;padding-block:9px; } .navbar-inner { width:calc(100% - 32px);height:auto;min-height:86px;align-content:center;flex-wrap:wrap;gap:10px;padding-block:0; } .navbar-brand { min-height:34px;align-self:center; } .header-actions { width:100%;justify-content:space-between;align-self:center;gap:6px; } .header-action-group { gap:6px;padding:0; } .navbar-view-toggle button { padding-inline:9px; } }
  @media (max-width: 560px) { .navbar-new-project { width:42px;min-width:42px;padding:0; } .navbar-new-project span { display:none; } }
  @media (max-width: 390px) { .navbar-inner { width:calc(100% - 24px); } .header-actions { gap:4px; } .glass-button,.navbar-new-project { width:34px;min-width:34px;height:34px; } .navbar-view-toggle { height:32px; } .navbar-view-toggle button { height:24px;padding-inline:7px;font-size:11px; } .profile-button { width:32px;height:32px; } }
  @media (max-width: 920px) { .project-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } .project-card { min-height: 280px; } .space-layout { grid-template-columns: 1fr; } .project-aside { display: grid; grid-template-columns: 1fr 1fr; } .aside-block + .aside-block { border-top: 0; border-left: 1px solid rgba(255,255,255,.07); } .theme-pearl .project-card:nth-child(n),.theme-luxe .project-card:nth-child(n),.theme-pearl .add-card,.theme-luxe .add-card { grid-column:span 1;grid-row:span 1; } .theme-terminal .project-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } .theme-command .project-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .theme-portfolio .space-layout { grid-template-columns:1fr; } }
  @media (max-width:920px) { .theme-obsidian .project-hero { grid-template-columns:1fr; } .theme-obsidian .hero-current-task { grid-column:1;grid-row:1; } .project-hero-summary { grid-row:2;gap:24px; } }
  @media (max-width: 600px) { .project-grid { grid-template-columns: 1fr; } .project-card { min-height: 250px; } .add-card { min-height: 110px; } .project-hero { min-height: 250px; align-items: flex-start; flex-direction: column; } .project-score { align-items: flex-start; } .task-row { grid-template-columns: 24px 7px minmax(0,1fr) 30px; gap: 9px; } .project-aside { grid-template-columns: 1fr; } .aside-block + .aside-block { border-top: 1px solid rgba(255,255,255,.07); border-left: 0; } .task-panel { max-width: 100%; } .theme-switcher { gap: 3px; padding: 4px; border-radius: 15px; } .theme-switcher button { display: flex; min-height: 46px; justify-content: center; padding: 5px 3px; text-align:center; } .theme-switcher .theme-number, .theme-switcher small { display:none; } .theme-switcher strong { font-size: 11px; } .theme-frost .project-card,.theme-smoke .project-card,.theme-neon .project-card { display:block; } .theme-frost .project-card > div:nth-child(2),.theme-smoke .project-card > div:nth-child(2),.theme-neon .project-card > div:nth-child(2) { margin-top:55px; } .theme-frost .project-card > div:last-child,.theme-smoke .project-card > div:last-child,.theme-neon .project-card > div:last-child { margin-top:32px; } .theme-terminal .project-grid,.theme-command .project-grid { grid-template-columns:1fr; } .theme-editorial .project-card { flex-basis:86vw; } .theme-editorial .project-grid { margin-inline:-20px;padding-inline:20px; } .theme-aurora .task-feed > [class~="space-y-2.5"],.theme-pearl .task-feed > [class~="space-y-2.5"],.theme-swiss .task-feed > [class~="space-y-2.5"],.theme-terminal .task-feed > [class~="space-y-2.5"],.theme-luxe .task-feed > [class~="space-y-2.5"],.theme-command .task-feed > [class~="space-y-2.5"] { grid-template-columns:1fr; } .theme-orbit .project-grid { height:auto;display:grid;perspective:none; } .theme-orbit .project-card { position:relative;inset:auto;width:auto;margin:0;transform:none !important; } .theme-coverflow .project-grid { height:520px;margin-inline:-20px; } .theme-coverflow .project-card { width:145px;margin-left:-72px; } .theme-timeline .project-grid::before { left:10px; } .theme-timeline .project-card,.theme-timeline .add-card { width:calc(100% - 34px);align-self:flex-end; } .theme-timeline .project-card:nth-child(odd)::after,.theme-timeline .project-card:nth-child(even)::after { left:-31px;right:auto; } .theme-portfolio .project-card { display:block; } .theme-portfolio .project-card > div:nth-child(2) { margin-top:38px; } .theme-portfolio .project-card > div:last-child { margin-top:24px; } }
  @media (max-width:600px) { .theme-coverflow .project-card { width:180px;margin-left:-90px; } .theme-coverflowClassic .project-card { width:280px;margin-left:-140px; } }
  @media (max-width:600px) { .theme-smoke .project-card > div:nth-child(2) { margin-top:0; } }
  @media (max-width:600px) { .theme-orbit .project-grid { min-height:0; } .theme-orbit .project-card { min-height:250px;translate:none; } }
  @media (max-width:600px) { .task-row { grid-template-columns:24px minmax(0,1fr) 22px;gap:9px; } .task-duration { display:none; } }
  @media (max-width:600px) { .theme-obsidian .project-hero { display:grid;grid-template-columns:1fr; } .theme-obsidian .project-score { align-items:flex-end; } .hero-current-task { width:100%; } .task-status-actions { grid-template-columns:1fr; } }
  @media (prefers-reduced-motion: reduce) { .project-card, .task-panel { animation: none; } }
`;
