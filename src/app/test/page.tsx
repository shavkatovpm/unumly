"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Briefcase,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDashed,
  CircleDot,
  Clock,
  Dumbbell,
  Filter,
  Flag,
  Heart,
  Inbox,
  Layers,
  LayoutGrid,
  Lightbulb,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════
   Shared categories + seed
   ════════════════════════════════════════════════════════════ */

type Cat = { id: string; label: string; color: string; icon: React.ReactNode };

const CATS: Cat[] = [
  { id: "ish",   label: "Ish",        color: "oklch(0.58 0.13 25)",  icon: <Briefcase className="size-3.5" /> },
  { id: "organ", label: "O'rganish",  color: "oklch(0.62 0.10 240)", icon: <Lightbulb className="size-3.5" /> },
  { id: "shaxs", label: "Shaxsiy",    color: "oklch(0.6 0.14 295)",  icon: <Heart className="size-3.5" /> },
  { id: "sal",   label: "Salomatlik", color: "oklch(0.6 0.12 145)",  icon: <Dumbbell className="size-3.5" /> },
];

function catOf(id: string) { return CATS.find((c) => c.id === id) ?? CATS[0]; }
function colorAlpha(c: string, a: number) { return c.replace(")", ` / ${a})`); }

type Priority = "HIGH" | "MEDIUM" | "LOW";
type Idea = {
  id: string;
  title: string;
  notes?: string;
  catId: string;
  done: boolean;
  pr?: Priority;
  createdAt: number;
};

let _id = 0;
function nid() { return `i${++_id}-${Math.random().toString(36).slice(2, 5)}`; }
const NOW = Date.now();

const SEED: Idea[] = [
  { id: nid(), title: "Pricing sahifani qayta dizayn",    notes: "Linear/Things misollar", catId: "ish",   pr: "HIGH",   done: false, createdAt: NOW - 86400_000 * 3 },
  { id: nid(), title: "Auth refaktor — middleware",       catId: "ish",   pr: "HIGH",   done: false, createdAt: NOW - 86400_000 * 2 },
  { id: nid(), title: "Hafta yakuni — yutuqlar",          catId: "ish",   pr: "LOW",    done: true,  createdAt: NOW - 86400_000 * 4 },
  { id: nid(), title: "Mobil ilova prototipi",            catId: "ish",   pr: "HIGH",   done: false, createdAt: NOW - 86400_000 * 1 },
  { id: nid(), title: "Investor pitch tayyorlash",        catId: "ish",   pr: "MEDIUM", done: false, createdAt: NOW - 86400_000 * 1 },
  { id: nid(), title: "RSC chuqurroq o'rganish",          notes: "Streaming, server actions", catId: "organ", pr: "MEDIUM", done: false, createdAt: NOW - 86400_000 * 2 },
  { id: nid(), title: "Atomic Habits — 20 bet/kun",       catId: "organ", pr: "LOW",    done: false, createdAt: NOW - 86400_000 * 1 },
  { id: nid(), title: "Yapon tilini boshlash",            catId: "organ", pr: "LOW",    done: false, createdAt: NOW - 86400_000 * 5 },
  { id: nid(), title: "Onam bilan video qo'ng'iroq",      catId: "shaxs", pr: "MEDIUM", done: false, createdAt: NOW - 86400_000 * 1 },
  { id: nid(), title: "Garaj tartibga solish",            catId: "shaxs", pr: "LOW",    done: false, createdAt: NOW - 86400_000 * 6 },
  { id: nid(), title: "Kitob — Sapiens, davom",           catId: "shaxs", pr: "LOW",    done: false, createdAt: NOW - 86400_000 * 3 },
  { id: nid(), title: "Sport — 30 daqiqa yurish",         catId: "sal",   pr: "MEDIUM", done: false, createdAt: NOW - 86400_000 * 1 },
  { id: nid(), title: "Suv ichish — 2L/kun",              catId: "sal",   pr: "LOW",    done: false, createdAt: NOW - 86400_000 * 3 },
  { id: nid(), title: "Doktorga uchrashuv",               catId: "sal",   pr: "HIGH",   done: false, createdAt: NOW - 86400_000 * 2 },
];

function newIdea(title: string, catId: string, pr: Priority = "MEDIUM"): Idea {
  return { id: nid(), title: title.trim(), catId, pr, done: false, createdAt: Date.now() };
}

function useIdeas() { return useState<Idea[]>(SEED); }

function formatRel(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86400_000);
  if (d === 0) return "bugun";
  if (d === 1) return "kecha";
  if (d < 7) return `${d}k`;
  return new Date(ts).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
}

const PRIORITY_DOT: Record<Priority, string> = {
  HIGH:   "bg-priority-high",
  MEDIUM: "bg-priority-medium",
  LOW:    "bg-priority-low",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH: "Yuqori", MEDIUM: "O'rta", LOW: "Past",
};

/* ─── Common building blocks ─── */

function Header({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border bg-subtle/30 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-faint">{icon}</span>
        <p className="text-[12.5px] font-semibold">{title}</p>
        <span className="text-[11px] text-faint">— {desc}</span>
      </div>
    </header>
  );
}

function Checkbox({ done, onClick, small }: { done: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "grid shrink-0 place-items-center rounded-md border transition-all",
        small ? "size-[14px]" : "size-[16px]",
        done ? "border-accent bg-accent" : "border-border-strong hover:border-accent"
      )}
    >
      {done && <Check className={cn("text-background", small ? "size-2" : "size-2.5")} strokeWidth={4} />}
    </button>
  );
}

function StatusIcon({ done }: { done: boolean }) {
  return done
    ? <Check className="size-3 text-accent" strokeWidth={3} />
    : <CircleDashed className="size-3 text-faint" />;
}

/* ─── Material sliding tab bar ─── */

function MaterialTabBar({ tab, setTab, items }: { tab: string; setTab: (id: string) => void; items: Idea[] }) {
  const idx = CATS.findIndex((c) => c.id === tab);
  const active = catOf(tab);
  return (
    <div className="relative shrink-0 border-b border-border bg-subtle/20">
      <div className="grid grid-cols-4">
        {CATS.map((c) => {
          const isA = tab === c.id;
          const count = items.filter((i) => i.catId === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setTab(c.id)}
              className={cn(
                "flex items-center justify-center gap-2 py-3.5 text-[12.5px] font-medium uppercase tracking-wider transition-colors",
                isA ? "text-foreground" : "text-muted hover:text-foreground"
              )}
            >
              <span className={cn("size-1.5 rounded-full transition-opacity", isA ? "opacity-100" : "opacity-60")}
                style={{ background: c.color }} />
              {c.label}
              <span className="font-mono text-[10px] tabular-nums text-faint">{count}</span>
            </button>
          );
        })}
      </div>
      <div
        className="absolute bottom-0 h-[3px] transition-all duration-300 ease-out"
        style={{
          width: `${100 / CATS.length}%`,
          left: `${(idx * 100) / CATS.length}%`,
          background: active.color,
        }}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ┌─────────── TAB LAYOUT + CREATE VARIANTS (10) ───────────┐
   ════════════════════════════════════════════════════════════ */

/* T1 — Linear dense list (Linear-style #1) */
function T1LinearDense() {
  const [items, setItems] = useIdeas();
  const [tab, setTab] = useState(CATS[0].id);
  const [adding, setAdding] = useState(false);
  const [v, setV] = useState("");
  const active = catOf(tab);
  const filtered = items.filter((i) => i.catId === tab);
  const sorted = [...filtered].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<Layers className="size-3.5" />} title="Linear dense" desc="Linear stili — flat zich qatorlar" />
      <MaterialTabBar tab={tab} setTab={setTab} items={items} />
      <div className="flex-1 overflow-y-auto">
        {/* Inline add row */}
        <div className="border-b border-border bg-subtle/20">
          {adding ? (
            <form
              onSubmit={(e) => { e.preventDefault(); if (v.trim()) { setItems((p) => [newIdea(v, tab), ...p]); } setV(""); setAdding(false); }}
              className="flex items-center gap-3 px-5 py-2"
            >
              <CircleDashed className="size-3.5 text-faint" />
              <input autoFocus value={v} onChange={(e) => setV(e.target.value)}
                onBlur={() => { if (v.trim()) setItems((p) => [newIdea(v, tab), ...p]); setV(""); setAdding(false); }}
                onKeyDown={(e) => { if (e.key === "Escape") { setV(""); setAdding(false); } }}
                placeholder="Yangi g'oya yozing va ↵..."
                className="flex-1 bg-transparent text-[13px] placeholder:text-faint focus:outline-none" />
            </form>
          ) : (
            <button onClick={() => setAdding(true)}
              className="flex w-full items-center gap-3 px-5 py-2 text-left text-[13px] text-faint hover:bg-hover/40 hover:text-muted">
              <Plus className="size-3.5" />
              <span className="flex-1">Yangi g&apos;oya qo&apos;shish</span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[9.5px]">C</kbd>
            </button>
          )}
        </div>
        {/* Dense rows */}
        {sorted.map((i) => (
          <div key={i.id} className="group grid grid-cols-[16px_16px_1fr_60px_50px] items-center gap-2 border-b border-border/40 px-5 py-1.5 hover:bg-hover/40">
            <button onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))}>
              <StatusIcon done={i.done} />
            </button>
            {i.pr && <span className={cn("size-1.5 rounded-full", PRIORITY_DOT[i.pr])} />}
            {!i.pr && <span />}
            <span className={cn("truncate text-[13px]", i.done && "text-faint line-through")}>{i.title}</span>
            <span className="font-mono text-[10.5px] tabular-nums text-faint">{formatRel(i.createdAt)}</span>
            <button className="grid size-5 place-items-center rounded text-faint opacity-0 hover:bg-hover hover:text-foreground group-hover:opacity-100">
              <MoreHorizontal className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* T2 — Linear grouped (Linear-style #2): grouped by status with collapsible headers */
function T2LinearGrouped() {
  const [items, setItems] = useIdeas();
  const [tab, setTab] = useState(CATS[0].id);
  const [openGroup, setOpenGroup] = useState<Set<string>>(new Set(["active"]));
  const [adding, setAdding] = useState(false);
  const [v, setV] = useState("");
  const active = catOf(tab);
  const filtered = items.filter((i) => i.catId === tab);
  const groups = [
    { key: "active", label: "Faol",        items: filtered.filter((i) => !i.done), icon: <CircleDashed className="size-3" /> },
    { key: "done",   label: "Bajarilgan",  items: filtered.filter((i) => i.done),  icon: <Check className="size-3" /> },
  ];

  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<Layers className="size-3.5" />} title="Linear grouped" desc="Status bo'yicha yig'iladigan guruhlar" />
      <MaterialTabBar tab={tab} setTab={setTab} items={items} />
      <div className="flex-1 overflow-y-auto">
        {groups.map((g) => {
          const isOpen = openGroup.has(g.key);
          return (
            <section key={g.key}>
              <button
                onClick={() => setOpenGroup((p) => { const n = new Set(p); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })}
                className="sticky top-0 z-10 flex w-full items-center gap-2 border-b border-border bg-subtle/40 px-5 py-2 text-left backdrop-blur"
              >
                <ChevronRight className={cn("size-3 text-faint transition-transform", isOpen && "rotate-90")} />
                <span className="text-faint">{g.icon}</span>
                <span className="text-[12px] font-semibold uppercase tracking-wider">{g.label}</span>
                <span className="font-mono text-[10.5px] tabular-nums text-faint">{g.items.length}</span>
                {g.key === "active" && (
                  <span className="ml-auto" onClick={(e) => { e.stopPropagation(); setAdding(true); }}>
                    <Plus className="size-3.5 text-faint hover:text-foreground" />
                  </span>
                )}
              </button>
              {isOpen && (
                <>
                  {g.key === "active" && adding && (
                    <form
                      onSubmit={(e) => { e.preventDefault(); if (v.trim()) setItems((p) => [newIdea(v, tab), ...p]); setV(""); setAdding(false); }}
                      className="flex items-center gap-2 border-b border-border/40 px-5 py-1.5"
                    >
                      <CircleDashed className="size-3 text-faint" />
                      <input autoFocus value={v} onChange={(e) => setV(e.target.value)}
                        onBlur={() => { if (v.trim()) setItems((p) => [newIdea(v, tab), ...p]); setV(""); setAdding(false); }}
                        onKeyDown={(e) => { if (e.key === "Escape") { setV(""); setAdding(false); } }}
                        placeholder="G'oya..."
                        className="flex-1 bg-transparent text-[13px] placeholder:text-faint focus:outline-none" />
                    </form>
                  )}
                  {g.items.map((i) => (
                    <div key={i.id} className="group grid grid-cols-[16px_16px_1fr_60px] items-center gap-2 border-b border-border/40 px-5 py-1.5 hover:bg-hover/40">
                      <button onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))}>
                        <StatusIcon done={i.done} />
                      </button>
                      {i.pr && <span className={cn("size-1.5 rounded-full", PRIORITY_DOT[i.pr])} />}
                      {!i.pr && <span />}
                      <span className={cn("truncate text-[13px]", i.done && "text-faint line-through")}>{i.title}</span>
                      <span className="font-mono text-[10.5px] tabular-nums text-faint">{formatRel(i.createdAt)}</span>
                    </div>
                  ))}
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* T3 — Spacious cards with notes preview */
function T3Spacious() {
  const [items, setItems] = useIdeas();
  const [tab, setTab] = useState(CATS[0].id);
  const [v, setV] = useState("");
  const active = catOf(tab);
  const filtered = items.filter((i) => i.catId === tab);

  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<Layers className="size-3.5" />} title="Spacious" desc="Kattaroq kartochkalar, izoh ko'rinadi" />
      <MaterialTabBar tab={tab} setTab={setTab} items={items} />
      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto p-6">
        <form
          onSubmit={(e) => { e.preventDefault(); if (v.trim()) { setItems((p) => [newIdea(v, tab), ...p]); setV(""); } }}
          className="mb-4 rounded-2xl border-2 border-dashed border-border bg-subtle/30 px-4 py-3 transition-colors focus-within:border-border-strong"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-faint" />
            <input value={v} onChange={(e) => setV(e.target.value)}
              placeholder={`${active.label} bo'limiga nima qo'shasiz?`}
              className="flex-1 bg-transparent text-[14px] placeholder:text-faint focus:outline-none" />
          </div>
        </form>
        <div className="space-y-2.5">
          {filtered.map((i) => (
            <article key={i.id} className={cn("group rounded-xl border border-border bg-surface p-3.5 transition-shadow hover:shadow-md", i.done && "opacity-50")}>
              <div className="flex items-start gap-3">
                <Checkbox done={i.done} onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[14px] font-medium leading-snug", i.done && "line-through")}>{i.title}</p>
                  {i.notes && <p className="mt-1.5 text-[12.5px] text-muted">{i.notes}</p>}
                  <div className="mt-2 flex items-center gap-2 font-mono text-[10.5px] text-faint">
                    {i.pr && (
                      <span className="flex items-center gap-1">
                        <span className={cn("size-1.5 rounded-full", PRIORITY_DOT[i.pr])} />
                        {PRIORITY_LABEL[i.pr]}
                      </span>
                    )}
                    <span>· {formatRel(i.createdAt)}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

/* T4 — Two-column split (Active / Completed) */
function T4Split() {
  const [items, setItems] = useIdeas();
  const [tab, setTab] = useState(CATS[0].id);
  const [v, setV] = useState("");
  const active = catOf(tab);
  const filtered = items.filter((i) => i.catId === tab);
  const ac = filtered.filter((i) => !i.done);
  const dn = filtered.filter((i) => i.done);

  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<Layers className="size-3.5" />} title="Split view" desc="Chap: faol · O'ng: bajarilgan" />
      <MaterialTabBar tab={tab} setTab={setTab} items={items} />
      <div className="grid flex-1 grid-cols-2 gap-0 overflow-hidden">
        <div className="flex flex-col overflow-hidden border-r border-border">
          <header className="border-b border-border bg-subtle/30 px-4 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Faol</p>
            <p className="font-mono text-[10px] tabular-nums text-faint">{ac.length}</p>
          </header>
          <form
            onSubmit={(e) => { e.preventDefault(); if (v.trim()) { setItems((p) => [newIdea(v, tab), ...p]); setV(""); } }}
            className="flex items-center gap-2 border-b border-border/60 px-4 py-2"
            style={{ borderLeft: `2px solid ${active.color}` }}
          >
            <Plus className="size-3.5" style={{ color: active.color }} />
            <input value={v} onChange={(e) => setV(e.target.value)}
              placeholder="Yangi..." className="flex-1 bg-transparent text-[13px] placeholder:text-faint focus:outline-none" />
          </form>
          <ul className="flex-1 space-y-1 overflow-y-auto p-3">
            {ac.map((i) => (
              <li key={i.id} className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5">
                <Checkbox done={false} onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: true } : x))} small />
                <span className="flex-1 text-[12.5px]">{i.title}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col overflow-hidden bg-subtle/20">
          <header className="border-b border-border bg-subtle/40 px-4 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Bajarilgan</p>
            <p className="font-mono text-[10px] tabular-nums text-faint">{dn.length}</p>
          </header>
          <ul className="flex-1 space-y-1 overflow-y-auto p-3">
            {dn.length === 0 && <p className="py-4 text-center text-[11.5px] text-faint">— hozircha bo&apos;sh —</p>}
            {dn.map((i) => (
              <li key={i.id} className="flex items-center gap-2 rounded-md px-2.5 py-1.5 opacity-60">
                <Checkbox done={true} onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: false } : x))} small />
                <span className="flex-1 text-[12.5px] line-through">{i.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* T5 — Timeline (grouped by date) */
function T5Timeline() {
  const [items, setItems] = useIdeas();
  const [tab, setTab] = useState(CATS[0].id);
  const [v, setV] = useState("");
  const active = catOf(tab);
  const filtered = items.filter((i) => i.catId === tab);
  const groups = useMemo(() => {
    const today: Idea[] = [], yest: Idea[] = [], older: Idea[] = [];
    for (const i of filtered) {
      const d = Math.floor((Date.now() - i.createdAt) / 86400_000);
      if (d === 0) today.push(i);
      else if (d === 1) yest.push(i);
      else older.push(i);
    }
    return [
      { label: "Bugun", items: today },
      { label: "Kecha", items: yest },
      { label: "Oldinroq", items: older },
    ].filter((g) => g.items.length > 0);
  }, [filtered]);

  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<Layers className="size-3.5" />} title="Timeline" desc="Vertikal timeline — kun bo'yicha guruhlangan" />
      <MaterialTabBar tab={tab} setTab={setTab} items={items} />
      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-6 py-5">
        <form
          onSubmit={(e) => { e.preventDefault(); if (v.trim()) { setItems((p) => [newIdea(v, tab), ...p]); setV(""); } }}
          className="mb-5 flex items-center gap-3"
        >
          <span className="grid size-7 place-items-center rounded-full text-background shadow-sm" style={{ background: active.color }}>
            <Plus className="size-4" />
          </span>
          <input value={v} onChange={(e) => setV(e.target.value)}
            placeholder="Bugunga g'oya qo'shish..."
            className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-[13px] placeholder:text-faint focus:border-border-strong focus:outline-none" />
        </form>
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.label} className="relative pl-6">
              <div className="absolute left-2 top-0 h-full w-px bg-border" />
              <div className="absolute left-[3px] top-2 size-2.5 rounded-full bg-foreground" />
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">{g.label}</p>
              <ul className="space-y-1.5">
                {g.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-3 py-2">
                    <Checkbox done={i.done} onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))} small />
                    {i.pr && <span className={cn("size-1.5 rounded-full", PRIORITY_DOT[i.pr])} />}
                    <span className={cn("flex-1 text-[12.5px]", i.done && "text-faint line-through")}>{i.title}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/* T6 — Stat dashboard + list */
function T6Stat() {
  const [items, setItems] = useIdeas();
  const [tab, setTab] = useState(CATS[0].id);
  const [v, setV] = useState("");
  const active = catOf(tab);
  const filtered = items.filter((i) => i.catId === tab);
  const done = filtered.filter((i) => i.done).length;
  const pct = filtered.length ? Math.round((done / filtered.length) * 100) : 0;
  const high = filtered.filter((i) => i.pr === "HIGH" && !i.done).length;

  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<Layers className="size-3.5" />} title="Stat dashboard" desc="Tepada statistika, ostida ro'yxat" />
      <MaterialTabBar tab={tab} setTab={setTab} items={items} />
      <div className="grid shrink-0 grid-cols-4 gap-2 border-b border-border bg-subtle/20 p-3">
        <StatCard label="Jami" value={filtered.length} />
        <StatCard label="Faol" value={filtered.length - done} accent={active.color} />
        <StatCard label="Bajarildi" value={done} sub={`${pct}%`} />
        <StatCard label="Yuqori muhim" value={high} sub={high > 0 ? "diqqat" : "—"} />
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (v.trim()) { setItems((p) => [newIdea(v, tab), ...p]); setV(""); } }}
        className="flex items-center gap-2 border-b border-border bg-surface px-6 py-2"
      >
        <Plus className="size-3.5" style={{ color: active.color }} />
        <input value={v} onChange={(e) => setV(e.target.value)}
          placeholder="Yangi g'oya yozing..."
          className="flex-1 bg-transparent text-[13.5px] placeholder:text-faint focus:outline-none" />
      </form>
      <ul className="flex-1 divide-y divide-border/60 overflow-y-auto">
        {filtered.map((i) => (
          <li key={i.id} className="flex items-center gap-3 px-6 py-2 hover:bg-hover/40">
            <Checkbox done={i.done} onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))} small />
            {i.pr && <span className={cn("size-1.5 rounded-full", PRIORITY_DOT[i.pr])} />}
            <span className={cn("flex-1 text-[13px]", i.done && "text-faint line-through")}>{i.title}</span>
            <span className="font-mono text-[10.5px] text-faint">{formatRel(i.createdAt)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2.5" style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}>
      <p className="font-mono text-[9.5px] uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1 font-mono text-[20px] font-semibold tabular-nums leading-none">{value}</p>
      {sub && <p className="mt-1 font-mono text-[9.5px] text-faint">{sub}</p>}
    </div>
  );
}

/* T7 — Search-first (filter + create from query) */
function T7Search() {
  const [items, setItems] = useIdeas();
  const [tab, setTab] = useState(CATS[0].id);
  const [q, setQ] = useState("");
  const active = catOf(tab);
  const filtered = items.filter((i) => i.catId === tab);
  const matched = q.trim() ? filtered.filter((i) => i.title.toLowerCase().includes(q.toLowerCase())) : filtered;

  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<Layers className="size-3.5" />} title="Search-first" desc="Yozish — filtr yoki yangi yaratish" />
      <MaterialTabBar tab={tab} setTab={setTab} items={items} />
      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-6 py-6">
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
          <Search className="size-4 text-faint" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim() && matched.length === 0) {
                setItems((p) => [newIdea(q.trim(), tab), ...p]);
                setQ("");
              }
            }}
            placeholder={`${active.label}da qidiring yoki yangi yarating...`}
            className="flex-1 bg-transparent text-[14px] placeholder:text-faint focus:outline-none" />
          {q.trim() && matched.length === 0 && (
            <button onClick={() => { setItems((p) => [newIdea(q.trim(), tab), ...p]); setQ(""); }}
              className="rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background hover:opacity-90">
              + Yarat
            </button>
          )}
        </div>
        {q.trim() && (
          <p className="mb-2 font-mono text-[10.5px] uppercase tracking-wider text-faint">
            {matched.length > 0 ? `${matched.length} ta topildi` : "Hech narsa topilmadi — Enter bilan yangi yarat"}
          </p>
        )}
        <ul className="space-y-1">
          {matched.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 hover:shadow-sm">
              <Checkbox done={i.done} onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))} small />
              <span className={cn("flex-1 text-[13px]", i.done && "text-faint line-through")}>
                {q.trim() ? (
                  i.title.split(new RegExp(`(${q})`, "i")).map((part, j) =>
                    part.toLowerCase() === q.toLowerCase()
                      ? <mark key={j} className="bg-current-time/30 text-foreground">{part}</mark>
                      : part
                  )
                ) : i.title}
              </span>
              <span className="font-mono text-[10px] text-faint">{formatRel(i.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* T8 — Compact table */
function T8Table() {
  const [items, setItems] = useIdeas();
  const [tab, setTab] = useState(CATS[0].id);
  const [adding, setAdding] = useState(false);
  const [v, setV] = useState("");
  const filtered = items.filter((i) => i.catId === tab);

  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<Layers className="size-3.5" />} title="Compact jadval" desc="Notion-uslub kompakt jadval" />
      <MaterialTabBar tab={tab} setTab={setTab} items={items} />
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[24px_32px_minmax(0,1fr)_70px_60px_28px] items-center gap-x-2 border-b border-border bg-subtle/40 px-4 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-faint">
          <span></span>
          <span>St</span>
          <span>Sarlavha</span>
          <span>Muhim</span>
          <span>Sana</span>
          <span></span>
        </div>
        {filtered.map((i, idx) => (
          <div key={i.id} className="group grid grid-cols-[24px_32px_minmax(0,1fr)_70px_60px_28px] items-center gap-x-2 border-b border-border/40 px-4 py-1 text-[12px] hover:bg-hover/40">
            <span className="font-mono text-[10px] text-faint">{idx + 1}</span>
            <Checkbox done={i.done} onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))} small />
            <span className={cn("truncate", i.done && "text-faint line-through")}>{i.title}</span>
            <span>
              {i.pr && (
                <span className={cn("flex w-fit items-center gap-1 rounded px-1.5 py-0.5 text-[10px]",
                  i.pr === "HIGH" && "bg-priority-high-soft text-priority-high",
                  i.pr === "MEDIUM" && "bg-priority-medium-soft text-priority-medium",
                  i.pr === "LOW" && "bg-priority-low-soft text-priority-low")}>
                  <span className={cn("size-1 rounded-full", PRIORITY_DOT[i.pr])} />
                  {PRIORITY_LABEL[i.pr]}
                </span>
              )}
            </span>
            <span className="font-mono text-[10.5px] tabular-nums text-faint">{formatRel(i.createdAt)}</span>
            <button className="grid size-5 place-items-center rounded text-faint opacity-0 hover:bg-hover hover:text-foreground group-hover:opacity-100">
              <MoreHorizontal className="size-3" />
            </button>
          </div>
        ))}
        {/* "+ new row" at bottom */}
        <div className="grid grid-cols-[24px_32px_minmax(0,1fr)_70px_60px_28px] items-center gap-x-2 border-b border-border/40 px-4 py-1">
          <Plus className="size-3 text-faint" />
          <span />
          {adding ? (
            <form
              onSubmit={(e) => { e.preventDefault(); if (v.trim()) { setItems((p) => [newIdea(v, tab), ...p]); } setV(""); setAdding(false); }}
              className="col-span-4"
            >
              <input autoFocus value={v} onChange={(e) => setV(e.target.value)}
                onBlur={() => { if (v.trim()) setItems((p) => [newIdea(v, tab), ...p]); setV(""); setAdding(false); }}
                onKeyDown={(e) => { if (e.key === "Escape") { setV(""); setAdding(false); } }}
                placeholder="Yangi qator..."
                className="w-full bg-transparent text-[12.5px] placeholder:text-faint focus:outline-none" />
            </form>
          ) : (
            <button onClick={() => setAdding(true)} className="col-span-4 text-left text-[12px] text-faint hover:text-muted">
              Yangi qator qo&apos;shish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* T9 — Tile/wall grid */
function T9Tiles() {
  const [items, setItems] = useIdeas();
  const [tab, setTab] = useState(CATS[0].id);
  const [v, setV] = useState("");
  const active = catOf(tab);
  const filtered = items.filter((i) => i.catId === tab);
  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<Layers className="size-3.5" />} title="Tile wall" desc="Kvadrat plitkalar — devor uslubi" />
      <MaterialTabBar tab={tab} setTab={setTab} items={items} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              if (v.trim()) { setItems((p) => [newIdea(v, tab), ...p]); setV(""); }
            }}
            className="aspect-square overflow-hidden rounded-lg border border-dashed border-border bg-subtle/30 p-3 text-left transition-colors hover:border-border-strong hover:bg-subtle/60"
          >
            <input value={v} onChange={(e) => setV(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { setItems((p) => [newIdea(v, tab), ...p]); setV(""); } }}
              placeholder="+ G'oya"
              onClick={(e) => e.stopPropagation()}
              className="size-full resize-none bg-transparent text-[12px] text-muted placeholder:text-faint focus:outline-none" />
          </button>
          {filtered.map((i) => (
            <article
              key={i.id}
              className={cn("group relative aspect-square flex flex-col overflow-hidden rounded-lg border bg-surface p-3 transition-shadow hover:shadow-md", i.done && "opacity-50")}
              style={{ borderColor: active.color, borderTopWidth: 3 }}
            >
              <div className="flex items-center justify-between">
                {i.pr ? <span className={cn("size-2 rounded-full", PRIORITY_DOT[i.pr])} /> : <span className="size-2" />}
                <Checkbox done={i.done} onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))} small />
              </div>
              <p className={cn("mt-2 flex-1 text-[12px] leading-snug", i.done && "line-through")}>{i.title}</p>
              <p className="mt-1 font-mono text-[9.5px] text-faint">{formatRel(i.createdAt)}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

/* T10 — Reading/prose mode */
function T10Reading() {
  const [items, setItems] = useIdeas();
  const [tab, setTab] = useState(CATS[0].id);
  const [v, setV] = useState("");
  const active = catOf(tab);
  const filtered = items.filter((i) => i.catId === tab);
  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<Layers className="size-3.5" />} title="Reading mode" desc="Hujjat-uslubi serif prose, raqamli ro'yxat" />
      <MaterialTabBar tab={tab} setTab={setTab} items={items} />
      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-10 py-8">
        <h2
          className="text-[28px] font-semibold tracking-[-0.025em]"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          {active.label}
        </h2>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
          {filtered.length} ta g&apos;oya
        </p>
        <ol className="mt-6 space-y-3 text-[15px] leading-relaxed">
          {filtered.map((i, idx) => (
            <li key={i.id} className="flex items-baseline gap-3">
              <span className="w-6 font-mono text-[11px] tabular-nums text-faint">{String(idx + 1).padStart(2, "0")}</span>
              <button
                onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))}
                className={cn("mt-1.5 grid size-3 shrink-0 place-items-center rounded-full border", i.done ? "border-accent bg-accent" : "border-border-strong")}
              >
                {i.done && <Check className="size-1.5 text-background" strokeWidth={4} />}
              </button>
              <span className={cn(i.done && "text-faint line-through")}>{i.title}</span>
            </li>
          ))}
        </ol>
        <form
          onSubmit={(e) => { e.preventDefault(); if (v.trim()) { setItems((p) => [newIdea(v, tab), ...p]); setV(""); } }}
          className="mt-6 flex items-baseline gap-3 border-t border-border pt-4"
        >
          <span className="w-6 font-mono text-[11px] tabular-nums text-faint">{String(filtered.length + 1).padStart(2, "0")}</span>
          <Plus className="size-3 text-faint" />
          <input value={v} onChange={(e) => setV(e.target.value)}
            placeholder="Yana bir g'oya yozing..."
            className="flex-1 bg-transparent text-[15px] placeholder:text-faint focus:outline-none" />
        </form>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ┌─────────── KANBAN VARIANTS (10) ───────────┐
   Linear + WIP/progress yo'nalishida
   ════════════════════════════════════════════════════════════ */

/* K1 — Linear pro (status icons, priority bars, dense) */
function K1LinearPro() {
  const [items, setItems] = useIdeas();
  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<LayoutGrid className="size-3.5" />} title="Linear Pro" desc="Status icon + priority bar — dense" />
      <div className="grid flex-1 grid-cols-4 gap-0 overflow-hidden">
        {CATS.map((c, idx) => {
          const col = items.filter((i) => i.catId === c.id);
          return (
            <section key={c.id} className={cn("flex min-h-0 flex-col overflow-hidden", idx > 0 && "border-l border-border")}>
              <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm" style={{ background: c.color }} />
                  <h3 className="text-[12px] font-medium uppercase tracking-wider">{c.label}</h3>
                  <span className="font-mono text-[10.5px] tabular-nums text-faint">{col.length}</span>
                </div>
                <Plus className="size-3 text-faint hover:text-foreground cursor-pointer" />
              </header>
              <div className="flex-1 overflow-y-auto">
                {col.map((i) => (
                  <article key={i.id} className="group grid grid-cols-[10px_14px_1fr_28px] items-start gap-2 border-b border-border/40 px-3 py-2 hover:bg-hover/40">
                    {i.pr && <span className="mt-1 h-3 w-1 rounded-sm" style={{ background: `var(--priority-${i.pr.toLowerCase()})` }} />}
                    {!i.pr && <span />}
                    <button onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))} className="mt-0.5">
                      <StatusIcon done={i.done} />
                    </button>
                    <p className={cn("text-[12.5px] leading-snug", i.done && "text-faint line-through")}>{i.title}</p>
                    <span className="text-right font-mono text-[9.5px] tabular-nums text-faint">{formatRel(i.createdAt)}</span>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* K2 — Linear focus (collapsed done section) */
function K2LinearFocus() {
  const [items, setItems] = useIdeas();
  const [showDone, setShowDone] = useState<Record<string, boolean>>({});
  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<LayoutGrid className="size-3.5" />} title="Linear Focus" desc="Faqat faollar — bajarilganlar yopilgan" />
      <div className="grid flex-1 grid-cols-4 gap-0 overflow-hidden">
        {CATS.map((c, idx) => {
          const col = items.filter((i) => i.catId === c.id);
          const active = col.filter((i) => !i.done);
          const done = col.filter((i) => i.done);
          return (
            <section key={c.id} className={cn("flex min-h-0 flex-col overflow-hidden", idx > 0 && "border-l border-border")}>
              <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm" style={{ background: c.color }} />
                  <h3 className="text-[12px] font-medium uppercase tracking-wider">{c.label}</h3>
                  <span className="font-mono text-[10.5px] tabular-nums text-faint">{active.length}</span>
                </div>
                <Plus className="size-3 text-faint" />
              </header>
              <div className="flex-1 overflow-y-auto">
                {active.map((i) => (
                  <article key={i.id} className="group flex items-start gap-2 border-b border-border/40 px-3 py-1.5 hover:bg-hover/40">
                    {i.pr && <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: `var(--priority-${i.pr.toLowerCase()})` }} />}
                    <button onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: true } : x))} className="mt-0.5">
                      <StatusIcon done={false} />
                    </button>
                    <p className="flex-1 text-[12.5px] leading-snug">{i.title}</p>
                  </article>
                ))}
                {done.length > 0 && (
                  <button
                    onClick={() => setShowDone((p) => ({ ...p, [c.id]: !p[c.id] }))}
                    className="flex w-full items-center gap-1.5 border-b border-border/40 bg-subtle/20 px-3 py-1.5 text-left text-[10.5px] uppercase tracking-wider text-faint hover:bg-subtle/40"
                  >
                    <ChevronRight className={cn("size-3 transition-transform", showDone[c.id] && "rotate-90")} />
                    Bajarilgan ({done.length})
                  </button>
                )}
                {showDone[c.id] && done.map((i) => (
                  <article key={i.id} className="flex items-start gap-2 border-b border-border/40 bg-subtle/10 px-3 py-1.5">
                    <button onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: false } : x))} className="mt-0.5">
                      <Check className="size-3 text-accent" strokeWidth={3} />
                    </button>
                    <p className="flex-1 text-[12px] text-faint line-through">{i.title}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* K3 — Linear with priority stripe on the left */
function K3LinearStripe() {
  const [items, setItems] = useIdeas();
  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<LayoutGrid className="size-3.5" />} title="Linear stripe" desc="Chap polosa = priority, mass aniqlik" />
      <div className="grid flex-1 grid-cols-4 gap-0 overflow-hidden">
        {CATS.map((c, idx) => {
          const col = items.filter((i) => i.catId === c.id);
          return (
            <section key={c.id} className={cn("flex min-h-0 flex-col overflow-hidden", idx > 0 && "border-l border-border")}>
              <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm" style={{ background: c.color }} />
                  <h3 className="text-[12px] font-medium uppercase tracking-wider">{c.label}</h3>
                  <span className="font-mono text-[10.5px] tabular-nums text-faint">{col.length}</span>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto p-1.5">
                {col.map((i) => (
                  <article key={i.id} className={cn("group mb-1 flex items-stretch overflow-hidden rounded-md border border-border bg-surface", i.done && "opacity-50")}>
                    <div className="shrink-0" style={{ width: 4, background: i.pr ? `var(--priority-${i.pr.toLowerCase()})` : "transparent" }} />
                    <div className="flex flex-1 items-start gap-2 px-2 py-1.5">
                      <button onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))} className="mt-0.5">
                        <StatusIcon done={i.done} />
                      </button>
                      <p className={cn("flex-1 text-[12px] leading-snug", i.done && "line-through")}>{i.title}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* K4 — Linear minimal (no borders, super flat) */
function K4LinearMinimal() {
  const [items, setItems] = useIdeas();
  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<LayoutGrid className="size-3.5" />} title="Linear minimal" desc="Maksimal zich, no-border" />
      <div className="grid flex-1 grid-cols-4 gap-6 overflow-hidden p-4">
        {CATS.map((c) => {
          const col = items.filter((i) => i.catId === c.id);
          return (
            <section key={c.id} className="flex min-h-0 flex-col overflow-hidden">
              <header className="mb-2 flex items-baseline gap-1.5">
                <span className="size-1.5 rounded-full" style={{ background: c.color }} />
                <h3 className="text-[12px] font-medium uppercase tracking-wider text-foreground">{c.label}</h3>
                <span className="font-mono text-[10px] tabular-nums text-faint">·</span>
                <span className="font-mono text-[10.5px] tabular-nums text-faint">{col.length}</span>
              </header>
              <div className="flex-1 overflow-y-auto">
                {col.map((i) => (
                  <article key={i.id} className="group flex items-start gap-2 py-1.5 hover:bg-hover/30 -mx-2 px-2 rounded">
                    <button onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))} className="mt-0.5">
                      <StatusIcon done={i.done} />
                    </button>
                    <p className={cn("flex-1 text-[12.5px] leading-snug", i.done && "text-faint line-through")}>{i.title}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* K5 — WIP gauge (large bar showing capacity) */
function K5WipGauge() {
  const [items, setItems] = useIdeas();
  const LIMIT = 5;
  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<TrendingUp className="size-3.5" />} title="WIP gauge" desc="Sigm gauge ko'rsatadi, limit oshsa qizil" />
      <div className="grid flex-1 grid-cols-4 gap-3 overflow-hidden p-3">
        {CATS.map((c) => {
          const col = items.filter((i) => i.catId === c.id);
          const active = col.filter((i) => !i.done);
          const fill = Math.min(active.length / LIMIT, 1);
          const over = active.length > LIMIT;
          return (
            <section key={c.id} className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
              <header className="border-b border-border px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: c.color }} />
                    <h3 className="text-[12.5px] font-semibold">{c.label}</h3>
                  </span>
                  <span className={cn("font-mono text-[10.5px] tabular-nums", over ? "text-danger font-semibold" : "text-faint")}>
                    {active.length}/{LIMIT}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-subtle">
                  <div className="h-full transition-all" style={{
                    width: `${fill * 100}%`,
                    background: over ? "var(--danger)" : c.color,
                  }} />
                </div>
                <p className={cn("mt-1 font-mono text-[9.5px] uppercase tracking-wider", over ? "text-danger" : "text-faint")}>
                  {over ? "limit oshdi — diqqat" : `${LIMIT - active.length} ta joy`}
                </p>
              </header>
              <div className="flex-1 space-y-1 overflow-y-auto p-2">
                {col.map((i) => (
                  <article key={i.id} className="flex items-start gap-2 rounded border border-border/60 bg-background px-2 py-1.5">
                    <button onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))}>
                      <StatusIcon done={i.done} />
                    </button>
                    <p className={cn("flex-1 text-[12px] leading-snug", i.done && "text-faint line-through")}>{i.title}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* K6 — WIP donut ring per column */
function K6WipDonut() {
  const [items, setItems] = useIdeas();
  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<TrendingUp className="size-3.5" />} title="WIP donut" desc="Har ustun yuqorida donut progres" />
      <div className="grid flex-1 grid-cols-4 gap-3 overflow-hidden p-3">
        {CATS.map((c) => {
          const col = items.filter((i) => i.catId === c.id);
          const done = col.filter((i) => i.done).length;
          const pct = col.length ? done / col.length : 0;
          return (
            <section key={c.id} className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
              <header className="flex items-center gap-3 border-b border-border px-3 py-3">
                <div className="relative grid size-12 place-items-center">
                  <svg viewBox="0 0 36 36" className="-rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="var(--subtle)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke={c.color} strokeWidth="3"
                      strokeDasharray={`${pct * 88} 88`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute font-mono text-[10px] font-semibold tabular-nums">{Math.round(pct * 100)}%</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-[12.5px] font-semibold">{c.label}</h3>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint">{done}/{col.length}</p>
                </div>
              </header>
              <div className="flex-1 space-y-1 overflow-y-auto p-2">
                {col.map((i) => (
                  <article key={i.id} className="flex items-start gap-2 rounded border border-border/60 bg-background px-2 py-1.5">
                    <button onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))}>
                      <StatusIcon done={i.done} />
                    </button>
                    <p className={cn("flex-1 text-[12px]", i.done && "text-faint line-through")}>{i.title}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* K7 — WIP velocity (sparkline + counters) */
function K7WipVelocity() {
  const [items, setItems] = useIdeas();
  // mock velocity per col
  const VEL: Record<string, number[]> = {
    ish:   [2, 3, 1, 4, 3, 5, 4],
    organ: [1, 1, 2, 1, 2, 1, 1],
    shaxs: [0, 1, 0, 1, 0, 1, 0],
    sal:   [3, 2, 4, 3, 5, 4, 5],
  };
  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<TrendingUp className="size-3.5" />} title="WIP velocity" desc="Sparkline — haftalik tezlik" />
      <div className="grid flex-1 grid-cols-4 gap-3 overflow-hidden p-3">
        {CATS.map((c) => {
          const col = items.filter((i) => i.catId === c.id);
          const v = VEL[c.id] ?? [];
          const max = Math.max(...v, 1);
          const last = v[v.length - 1] ?? 0;
          const prev = v[v.length - 2] ?? 0;
          const trend = last > prev ? "up" : last < prev ? "down" : "flat";
          return (
            <section key={c.id} className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
              <header className="border-b border-border px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: c.color }} />
                    <h3 className="text-[12.5px] font-semibold">{c.label}</h3>
                  </span>
                  <span className="font-mono text-[10.5px] tabular-nums text-faint">{col.length}</span>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  {/* Sparkline */}
                  <svg viewBox="0 0 70 22" className="h-5 w-[70px]">
                    <polyline
                      fill="none"
                      stroke={c.color}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={v.map((val, i) => `${(i / (v.length - 1)) * 70},${22 - (val / max) * 18}`).join(" ")}
                    />
                  </svg>
                  <span className={cn("flex items-center gap-0.5 font-mono text-[10px] tabular-nums",
                    trend === "up" ? "text-accent" : trend === "down" ? "text-danger" : "text-faint")}>
                    {trend === "up" ? <ArrowUp className="size-2.5" /> : trend === "down" ? <ArrowDown className="size-2.5" /> : "—"}
                    {last}/h
                  </span>
                </div>
              </header>
              <div className="flex-1 space-y-1 overflow-y-auto p-2">
                {col.map((i) => (
                  <article key={i.id} className="flex items-start gap-2 rounded border border-border/60 bg-background px-2 py-1.5">
                    <button onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))}>
                      <StatusIcon done={i.done} />
                    </button>
                    <p className={cn("flex-1 text-[12px]", i.done && "text-faint line-through")}>{i.title}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* K8 — Progress curve (cumulative) */
function K8ProgressCurve() {
  const [items, setItems] = useIdeas();
  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<TrendingUp className="size-3.5" />} title="Progres curve" desc="Yumshoq stripe + foiz" />
      <div className="grid flex-1 grid-cols-4 gap-3 overflow-hidden p-3">
        {CATS.map((c) => {
          const col = items.filter((i) => i.catId === c.id);
          const done = col.filter((i) => i.done).length;
          const pct = col.length ? Math.round((done / col.length) * 100) : 0;
          return (
            <section key={c.id} className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
              <header className="relative border-b border-border px-3 py-3">
                {/* Background curve */}
                <div className="absolute inset-x-0 bottom-0 h-1">
                  <div className="h-full" style={{ width: `${pct}%`, background: c.color }} />
                </div>
                <div className="relative flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: c.color }} />
                    <h3 className="text-[12.5px] font-semibold">{c.label}</h3>
                  </span>
                  <span className="font-mono text-[14px] font-semibold tabular-nums" style={{ color: c.color }}>{pct}%</span>
                </div>
                <p className="relative mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                  {done} bajarildi · {col.length - done} qoldi
                </p>
              </header>
              <div className="flex-1 space-y-1 overflow-y-auto p-2">
                {col.map((i) => (
                  <article key={i.id} className="flex items-start gap-2 rounded border border-border/60 bg-background px-2 py-1.5">
                    <button onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))}>
                      <StatusIcon done={i.done} />
                    </button>
                    <p className={cn("flex-1 text-[12px]", i.done && "text-faint line-through")}>{i.title}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* K9 — Overflow alert (red glow when over limit) */
function K9Overflow() {
  const [items, setItems] = useIdeas();
  const LIMIT = 4;
  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<AlertCircle className="size-3.5" />} title="Overflow alert" desc="WIP + limit oshganda qizil ogohlantirish" />
      <div className="grid flex-1 grid-cols-4 gap-3 overflow-hidden p-3">
        {CATS.map((c) => {
          const col = items.filter((i) => i.catId === c.id);
          const active = col.filter((i) => !i.done).length;
          const over = active > LIMIT;
          return (
            <section
              key={c.id}
              className={cn(
                "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-surface transition-shadow",
                over ? "border-danger shadow-[0_0_0_2px_var(--danger-soft)]" : "border-border"
              )}
            >
              <header className={cn("border-b px-3 py-2.5", over ? "border-danger/40 bg-danger-soft/40" : "border-border")}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: c.color }} />
                    <h3 className="text-[12.5px] font-semibold">{c.label}</h3>
                  </span>
                  <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums",
                    over ? "bg-danger text-white" : "text-faint")}>
                    {active}/{LIMIT}
                  </span>
                </div>
                {over && (
                  <p className="mt-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-danger">
                    <AlertCircle className="size-3" /> Limit oshdi
                  </p>
                )}
              </header>
              <div className="flex-1 space-y-1 overflow-y-auto p-2">
                {col.map((i) => (
                  <article key={i.id} className="flex items-start gap-2 rounded border border-border/60 bg-background px-2 py-1.5">
                    <button onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))}>
                      <StatusIcon done={i.done} />
                    </button>
                    <p className={cn("flex-1 text-[12px]", i.done && "text-faint line-through")}>{i.title}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* K10 — Linear + WIP combo */
function K10LinearWipCombo() {
  const [items, setItems] = useIdeas();
  const LIMIT = 5;
  return (
    <div className="flex h-[720px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <Header icon={<Zap className="size-3.5" />} title="Linear + WIP combo" desc="Linear zichlik + WIP gauge — eng to'liq" />
      <div className="grid flex-1 grid-cols-4 gap-0 overflow-hidden">
        {CATS.map((c, idx) => {
          const col = items.filter((i) => i.catId === c.id);
          const active = col.filter((i) => !i.done);
          const fill = Math.min(active.length / LIMIT, 1);
          const over = active.length > LIMIT;
          return (
            <section key={c.id} className={cn("flex min-h-0 flex-col overflow-hidden", idx > 0 && "border-l border-border")}>
              <header className="border-b border-border px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-sm" style={{ background: c.color }} />
                    <h3 className="text-[12px] font-medium uppercase tracking-wider">{c.label}</h3>
                  </div>
                  <span className={cn("font-mono text-[10.5px] tabular-nums", over ? "text-danger font-semibold" : "text-faint")}>
                    {active.length}/{LIMIT}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-subtle">
                  <div className="h-full transition-all" style={{ width: `${fill * 100}%`, background: over ? "var(--danger)" : c.color }} />
                </div>
              </header>
              <div className="flex-1 overflow-y-auto">
                {col.map((i) => (
                  <article key={i.id} className="group grid grid-cols-[10px_14px_1fr_28px] items-start gap-2 border-b border-border/40 px-3 py-1.5 hover:bg-hover/40">
                    {i.pr && <span className="mt-1 h-3 w-1 rounded-sm" style={{ background: `var(--priority-${i.pr.toLowerCase()})` }} />}
                    {!i.pr && <span />}
                    <button onClick={() => setItems((p) => p.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))} className="mt-0.5">
                      <StatusIcon done={i.done} />
                    </button>
                    <p className={cn("text-[12px] leading-snug", i.done && "text-faint line-through")}>{i.title}</p>
                    <span className="text-right font-mono text-[9.5px] tabular-nums text-faint">{formatRel(i.createdAt)}</span>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Registry & Page
   ════════════════════════════════════════════════════════════ */

const VARIANTS = [
  // Tab variants (layout + create)
  { key: "t1",  group: "Tab", label: "Linear dense",     desc: "Linear stili — flat dense qatorlar",      render: <T1LinearDense /> },
  { key: "t2",  group: "Tab", label: "Linear grouped",   desc: "Linear stili — status guruhlangan",        render: <T2LinearGrouped /> },
  { key: "t3",  group: "Tab", label: "Spacious",         desc: "Kattaroq kartochkalar, izoh ko'rinadi",   render: <T3Spacious /> },
  { key: "t4",  group: "Tab", label: "Split",            desc: "Chap faol · O'ng bajarilgan",             render: <T4Split /> },
  { key: "t5",  group: "Tab", label: "Timeline",         desc: "Bugun/Kecha/Oldinroq guruhlangan",        render: <T5Timeline /> },
  { key: "t6",  group: "Tab", label: "Stat dashboard",   desc: "Tepada KPI lar, ostida ro'yxat",          render: <T6Stat /> },
  { key: "t7",  group: "Tab", label: "Search-first",     desc: "Qidirish bar + yangi yaratish",            render: <T7Search /> },
  { key: "t8",  group: "Tab", label: "Compact jadval",   desc: "Notion table — bottom-row qo'shish",      render: <T8Table /> },
  { key: "t9",  group: "Tab", label: "Tile wall",        desc: "Kvadrat plitkalar — devor",                render: <T9Tiles /> },
  { key: "t10", group: "Tab", label: "Reading",          desc: "Serif prose, raqamli ro'yxat",            render: <T10Reading /> },
  // Kanban variants (Linear + WIP focus)
  { key: "k1",  group: "Kanban", label: "Linear Pro",       desc: "Status + priority + dense",                 render: <K1LinearPro /> },
  { key: "k2",  group: "Kanban", label: "Linear Focus",     desc: "Faqat faollar, bajarilganlar yopilgan",     render: <K2LinearFocus /> },
  { key: "k3",  group: "Kanban", label: "Linear Stripe",    desc: "Priority chap polosa",                      render: <K3LinearStripe /> },
  { key: "k4",  group: "Kanban", label: "Linear Minimal",   desc: "Maksimal zich, no-border",                  render: <K4LinearMinimal /> },
  { key: "k5",  group: "Kanban", label: "WIP gauge",        desc: "Sigm gauge bar — limitga moslangan",        render: <K5WipGauge /> },
  { key: "k6",  group: "Kanban", label: "WIP donut",        desc: "Har ustun yuqorisida donut progres",        render: <K6WipDonut /> },
  { key: "k7",  group: "Kanban", label: "WIP velocity",     desc: "Sparkline + haftalik tezlik",               render: <K7WipVelocity /> },
  { key: "k8",  group: "Kanban", label: "Progres curve",    desc: "Stripe + foiz badge",                       render: <K8ProgressCurve /> },
  { key: "k9",  group: "Kanban", label: "Overflow alert",   desc: "Limit oshganda qizil ogohlantirish",        render: <K9Overflow /> },
  { key: "k10", group: "Kanban", label: "Linear+WIP combo", desc: "Eng to'liq — Linear + WIP gauge",           render: <K10LinearWipCombo /> },
];

export default function TestPage() {
  const [activeKey, setActiveKey] = useState("t1");
  const active = VARIANTS.find((v) => v.key === activeKey) ?? VARIANTS[0];
  const tabVariants = VARIANTS.filter((v) => v.group === "Tab");
  const kanbanVariants = VARIANTS.filter((v) => v.group === "Kanban");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-subtle/30">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint">Test sahifasi</p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">
            Reja · 10 tab + 10 kanban
          </h1>
          <p className="mt-1 text-[12px] text-faint">
            Joriy: <span className="font-medium text-foreground">{active.label}</span> — {active.desc}.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-faint">
                Tab — layout + create boshqacha (T1, T2 = Linear style)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tabVariants.map((v, i) => {
                  const isA = v.key === activeKey;
                  return (
                    <button key={v.key} onClick={() => setActiveKey(v.key)}
                      className={cn("flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] transition-all",
                        isA ? "border-foreground bg-foreground text-background shadow-sm" : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground")}>
                      <span className={cn("font-mono text-[10px] tabular-nums", isA ? "text-background/70" : "text-faint")}>T{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-medium">{v.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-faint">
                Kanban — Linear va WIP yo&apos;nalishida
              </p>
              <div className="flex flex-wrap gap-1.5">
                {kanbanVariants.map((v, i) => {
                  const isA = v.key === activeKey;
                  return (
                    <button key={v.key} onClick={() => setActiveKey(v.key)}
                      className={cn("flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] transition-all",
                        isA ? "border-foreground bg-foreground text-background shadow-sm" : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground")}>
                      <span className={cn("font-mono text-[10px] tabular-nums", isA ? "text-background/70" : "text-faint")}>K{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-medium">{v.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">{active.render}</main>
    </div>
  );
}
