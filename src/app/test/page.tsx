"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Coffee,
  Dumbbell,
  Flame,
  Heart,
  Inbox,
  Lightbulb,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────── Types & mock data ─────────────── */
type Category = "ish" | "shaxsiy" | "salomatlik" | "o'rganish";
type Horizon = "week" | "month" | "later" | "someday";
type Quadrant = "iu" | "in" | "ni" | "nn"; // important×urgent matrix

type Idea = {
  id: string;
  title: string;
  notes?: string;
  category: Category;
  horizon: Horizon;
  quadrant: Quadrant;
  day?: number; // 0=Mon..6=Sun for week board
  done: boolean;
  createdAt: string;
};

const CAT_LABEL: Record<Category, string> = {
  ish: "Ish",
  shaxsiy: "Shaxsiy",
  salomatlik: "Salomatlik",
  "o'rganish": "O'rganish",
};

const CAT_COLOR: Record<Category, { dot: string; bg: string; text: string }> = {
  ish:          { dot: "bg-priority-high",   bg: "bg-priority-high-soft",   text: "text-priority-high" },
  shaxsiy:      { dot: "bg-priority-medium", bg: "bg-priority-medium-soft", text: "text-priority-medium" },
  salomatlik:   { dot: "bg-priority-low",    bg: "bg-priority-low-soft",    text: "text-priority-low" },
  "o'rganish":  { dot: "bg-current-time",    bg: "bg-current-time/10",      text: "text-current-time" },
};

const CAT_ICON: Record<Category, React.ReactNode> = {
  ish:          <Briefcase className="size-3" />,
  shaxsiy:      <Heart className="size-3" />,
  salomatlik:   <Dumbbell className="size-3" />,
  "o'rganish":  <Lightbulb className="size-3" />,
};

const SEED: Idea[] = [
  { id: "1",  title: "Yangi dizayn tizimini o'rganib chiqish", category: "o'rganish", horizon: "month", quadrant: "in", day: 1, done: false, createdAt: "2026-05-10", notes: "Linear va Things misollarini ko'rib chiqish" },
  { id: "2",  title: "Pricing sahifani qayta dizayn qilish",     category: "ish",       horizon: "week",  quadrant: "iu", day: 1, done: false, createdAt: "2026-05-11" },
  { id: "3",  title: "Onam bilan video qo'ng'iroq",              category: "shaxsiy",   horizon: "week",  quadrant: "ni", day: 2, done: false, createdAt: "2026-05-12" },
  { id: "4",  title: "Hafta yakuni — yutuqlar ro'yxati",         category: "ish",       horizon: "week",  quadrant: "in", day: 4, done: false, createdAt: "2026-05-12" },
  { id: "5",  title: "Yugurish — 5 km",                          category: "salomatlik", horizon: "week",  quadrant: "in", day: 0, done: true,  createdAt: "2026-05-13" },
  { id: "6",  title: "Yangi kitob: Atomic Habits",               category: "o'rganish", horizon: "month", quadrant: "nn", day: 5, done: false, createdAt: "2026-05-14" },
  { id: "7",  title: "Mobil ilova prototipini boshlash",         category: "ish",       horizon: "month", quadrant: "in", day: 2, done: false, createdAt: "2026-05-14", notes: "Figma'da wireframe" },
  { id: "8",  title: "Konferentsiya uchun arizalar",             category: "ish",       horizon: "later", quadrant: "ni", day: 3, done: false, createdAt: "2026-05-15" },
  { id: "9",  title: "Yangi tilni o'rganish — yapon",            category: "o'rganish", horizon: "someday", quadrant: "nn", day: 6, done: false, createdAt: "2026-05-15" },
  { id: "10", title: "Doktorga uchrashuv",                       category: "salomatlik", horizon: "week",  quadrant: "iu", day: 3, done: false, createdAt: "2026-05-16" },
  { id: "11", title: "Stol va kreslo almashtirish",              category: "shaxsiy",   horizon: "later", quadrant: "nn", day: 5, done: false, createdAt: "2026-05-17" },
  { id: "12", title: "Yangi loyiha taklifini yozish",            category: "ish",       horizon: "week",  quadrant: "iu", day: 2, done: false, createdAt: "2026-05-18" },
];

const HORIZON_META: { key: Horizon; label: string; sub: string; icon: React.ReactNode }[] = [
  { key: "week",    label: "Bu hafta",  sub: "Hozirgi ustuvor",   icon: <Zap className="size-3.5" /> },
  { key: "month",   label: "Bu oy",     sub: "Hali muhim, lekin shoshilinch emas", icon: <Calendar className="size-3.5" /> },
  { key: "later",   label: "Keyinroq",  sub: "Yaqin oylar uchun", icon: <Clock className="size-3.5" /> },
  { key: "someday", label: "Bir kun",   sub: "Hayolimda bor",     icon: <Sparkles className="size-3.5" /> },
];

const QUADRANT_META: { key: Quadrant; label: string; sub: string; tone: string }[] = [
  { key: "iu", label: "Muhim · Shoshilinch",      sub: "Hozir bajar",       tone: "border-priority-high/40   bg-priority-high-soft/40" },
  { key: "in", label: "Muhim · Shoshilinch emas", sub: "Rejalashtir",       tone: "border-priority-medium/40 bg-priority-medium-soft/40" },
  { key: "ni", label: "Muhim emas · Shoshilinch", sub: "Topshir / bo'lish", tone: "border-priority-low/40    bg-priority-low-soft/40" },
  { key: "nn", label: "Muhim emas · Sekin",       sub: "Tashlab yubor",     tone: "border-border bg-subtle/40" },
];

const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const WEEKDAYS_FULL = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

type VariantState = {
  ideas: Idea[];
  setIdeas: React.Dispatch<React.SetStateAction<Idea[]>>;
};
function useVariantState(): VariantState {
  const [ideas, setIdeas] = useState(SEED);
  return { ideas, setIdeas };
}

/* ────────────────────────────────────────────────────────────
   V1 — Inbox (tez tushirish)
   ──────────────────────────────────────────────────────────── */
function V1Inbox() {
  const { ideas, setIdeas } = useVariantState();
  const [newTitle, setNewTitle] = useState("");
  const [filter, setFilter] = useState<Category | "all">("all");
  const filtered = ideas.filter((i) => filter === "all" || i.category === filter);
  const planned = ideas.filter((i) => i.done).length;

  function add() {
    const t = newTitle.trim();
    if (!t) return;
    setIdeas((prev) => [
      { id: Date.now().toString(36), title: t, category: "shaxsiy", horizon: "later", quadrant: "in", done: false, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setNewTitle("");
  }

  return (
    <div className="flex h-[680px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <header className="flex shrink-0 items-baseline justify-between border-b border-border px-6 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Reja</p>
          <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">
            Inbox — fikrlar daftari
          </h1>
          <p className="mt-0.5 text-[12px] text-muted">
            Boshga kelgan har bir g&apos;oyani tashlang. Keyin ajratasiz.
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[18px] font-semibold tabular-nums">{ideas.length}</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
            {planned} rejalash
          </p>
        </div>
      </header>

      <form
        onSubmit={(e) => { e.preventDefault(); add(); }}
        className="border-b border-border bg-subtle/30 px-6 py-3"
      >
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 transition-colors focus-within:border-border-strong">
          <Plus className="size-4 text-faint" />
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Yangi g'oya yoki ish... Enter bilan saqlash."
            className="flex-1 bg-transparent text-[14px] placeholder:text-faint focus:outline-none"
          />
          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-faint">
            ↵
          </kbd>
        </div>
      </form>

      <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-subtle/20 px-6 py-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>Hammasi</FilterChip>
        {(Object.keys(CAT_LABEL) as Category[]).map((c) => (
          <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)} category={c}>
            {CAT_LABEL[c]}
          </FilterChip>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-border/60">
          {filtered.map((i) => (
            <li
              key={i.id}
              className={cn(
                "group flex items-start gap-3 px-6 py-3 transition-colors hover:bg-hover/40",
                i.done && "opacity-50"
              )}
            >
              <button
                onClick={() => setIdeas((prev) => prev.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))}
                className={cn(
                  "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-md border transition-all",
                  i.done ? "border-accent bg-accent" : "border-border-strong hover:border-accent"
                )}
              >
                {i.done && <Check className="size-2.5 text-background" strokeWidth={4} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[13.5px] leading-snug", i.done && "line-through")}>{i.title}</p>
                {i.notes && (
                  <p className="mt-0.5 text-[11.5px] text-muted">{i.notes}</p>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  <CategoryChip category={i.category} />
                  <span className="font-mono text-[10px] text-faint">
                    {i.createdAt.slice(5)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10.5px] text-muted hover:bg-hover hover:text-foreground">
                  <Calendar className="size-3" />
                  Rejalash
                </button>
                <button
                  onClick={() => setIdeas((prev) => prev.filter((x) => x.id !== i.id))}
                  className="grid size-6 place-items-center rounded text-faint hover:bg-danger-soft hover:text-danger"
                  aria-label="O'chirish"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
  category,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  category?: Category;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-surface text-muted hover:bg-hover hover:text-foreground"
      )}
    >
      {category && <span className={cn("size-1.5 rounded-full", CAT_COLOR[category].dot)} />}
      {children}
    </button>
  );
}

function CategoryChip({ category }: { category: Category }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        CAT_COLOR[category].bg,
        CAT_COLOR[category].text
      )}
    >
      <span className={cn("size-1.5 rounded-full", CAT_COLOR[category].dot)} />
      {CAT_LABEL[category]}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────
   V2 — Vaqt gorizonti (GTD-style)
   ──────────────────────────────────────────────────────────── */
function V2Horizons() {
  const { ideas, setIdeas } = useVariantState();
  const grouped: Record<Horizon, Idea[]> = {
    week:    ideas.filter((i) => i.horizon === "week"),
    month:   ideas.filter((i) => i.horizon === "month"),
    later:   ideas.filter((i) => i.horizon === "later"),
    someday: ideas.filter((i) => i.horizon === "someday"),
  };

  function move(id: string, to: Horizon) {
    setIdeas((prev) => prev.map((x) => x.id === id ? { ...x, horizon: to } : x));
  }

  return (
    <div className="flex h-[680px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <header className="flex shrink-0 items-baseline justify-between border-b border-border px-6 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Reja</p>
          <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">
            Vaqt gorizontlari
          </h1>
          <p className="mt-0.5 text-[12px] text-muted">
            Har bir g&apos;oyani qachon qilishingizga qarab guruhlang.
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background">
          <Plus className="size-3.5" /> Yangi
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
        {HORIZON_META.map((h) => {
          const items = grouped[h.key];
          return (
            <section
              key={h.key}
              className="overflow-hidden rounded-lg border border-border bg-surface"
            >
              <header className="flex items-center justify-between border-b border-border bg-subtle/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-md bg-surface text-muted">
                    {h.icon}
                  </span>
                  <div>
                    <h2 className="text-[13px] font-semibold tracking-[-0.01em]">{h.label}</h2>
                    <p className="text-[10.5px] text-faint">{h.sub}</p>
                  </div>
                </div>
                <span className="font-mono text-[10.5px] tabular-nums text-faint">{items.length}</span>
              </header>
              {items.length === 0 ? (
                <p className="px-3 py-4 text-center text-[11.5px] text-faint">— bo&apos;sh —</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {items.map((i) => (
                    <li key={i.id} className="group flex items-center gap-2 px-3 py-1.5">
                      <span className={cn("size-1.5 shrink-0 rounded-full", CAT_COLOR[i.category].dot)} />
                      <span className="flex-1 truncate text-[13px]">{i.title}</span>
                      <CategoryChip category={i.category} />
                      <select
                        value={i.horizon}
                        onChange={(e) => move(i.id, e.target.value as Horizon)}
                        className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10.5px] text-muted group-hover:block"
                      >
                        {HORIZON_META.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   V3 — Toifa kanban
   ──────────────────────────────────────────────────────────── */
function V3Categories() {
  const { ideas, setIdeas } = useVariantState();
  const cats: Category[] = ["ish", "shaxsiy", "salomatlik", "o'rganish"];
  const grouped: Record<Category, Idea[]> = {
    ish: ideas.filter((i) => i.category === "ish"),
    shaxsiy: ideas.filter((i) => i.category === "shaxsiy"),
    salomatlik: ideas.filter((i) => i.category === "salomatlik"),
    "o'rganish": ideas.filter((i) => i.category === "o'rganish"),
  };

  function move(id: string, to: Category) {
    setIdeas((prev) => prev.map((x) => x.id === id ? { ...x, category: to } : x));
  }

  return (
    <div className="flex h-[680px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <header className="flex shrink-0 items-baseline justify-between border-b border-border px-6 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Reja</p>
          <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">
            Toifalar bo&apos;yicha
          </h1>
          <p className="mt-0.5 text-[12px] text-muted">
            Ishlarni hayot sohalariga ajrating.
          </p>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-4 gap-3 overflow-hidden p-4">
        {cats.map((c) => {
          const items = grouped[c];
          return (
            <section
              key={c}
              className={cn(
                "flex min-h-0 flex-col overflow-hidden rounded-lg border-t-4 bg-surface",
                "border-border"
              )}
              style={{ borderTopColor: `var(--${c === "o'rganish" ? "current-time" : `priority-${c === "ish" ? "high" : c === "shaxsiy" ? "medium" : "low"}`})` }}
            >
              <header className="border-b border-border bg-subtle/30 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("grid size-5 place-items-center rounded", CAT_COLOR[c].bg, CAT_COLOR[c].text)}>
                      {CAT_ICON[c]}
                    </span>
                    <h2 className="text-[12.5px] font-semibold">{CAT_LABEL[c]}</h2>
                  </div>
                  <span className="font-mono text-[10.5px] tabular-nums text-faint">{items.length}</span>
                </div>
              </header>
              <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
                {items.length === 0 ? (
                  <p className="py-6 text-center text-[11px] text-faint">— bo&apos;sh —</p>
                ) : (
                  items.map((i) => (
                    <article
                      key={i.id}
                      className={cn(
                        "group rounded-md border border-border bg-background p-2 transition-shadow hover:shadow-sm",
                        i.done && "opacity-50"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => setIdeas((prev) => prev.map((x) => x.id === i.id ? { ...x, done: !x.done } : x))}
                          className={cn(
                            "mt-0.5 grid size-[14px] shrink-0 place-items-center rounded border",
                            i.done ? "border-accent bg-accent" : "border-border-strong"
                          )}
                        >
                          {i.done && <Check className="size-2 text-background" strokeWidth={4} />}
                        </button>
                        <p className={cn("flex-1 text-[12px] leading-snug", i.done && "line-through")}>
                          {i.title}
                        </p>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="font-mono text-[9.5px] uppercase tracking-wider text-faint">
                          {HORIZON_META.find((h) => h.key === i.horizon)?.label}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                          {cats.filter((x) => x !== c).map((x) => (
                            <button
                              key={x}
                              onClick={() => move(i.id, x)}
                              className={cn("size-3 rounded-full", CAT_COLOR[x].dot)}
                              title={`${CAT_LABEL[x]}ga ko'chirish`}
                            />
                          ))}
                        </div>
                      </div>
                    </article>
                  ))
                )}
                <button className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1.5 text-[10.5px] text-faint hover:border-border-strong hover:text-muted">
                  <Plus className="size-3" /> Qo&apos;shish
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   V4 — Eisenhower matritsasi
   ──────────────────────────────────────────────────────────── */
function V4Eisenhower() {
  const { ideas, setIdeas } = useVariantState();
  const grouped: Record<Quadrant, Idea[]> = {
    iu: ideas.filter((i) => i.quadrant === "iu"),
    in: ideas.filter((i) => i.quadrant === "in"),
    ni: ideas.filter((i) => i.quadrant === "ni"),
    nn: ideas.filter((i) => i.quadrant === "nn"),
  };

  function move(id: string, to: Quadrant) {
    setIdeas((prev) => prev.map((x) => x.id === id ? { ...x, quadrant: to } : x));
  }

  return (
    <div className="flex h-[680px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <header className="flex shrink-0 items-baseline justify-between border-b border-border px-6 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Reja</p>
          <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">
            Muhimlik · Shoshilinch matritsasi
          </h1>
          <p className="mt-0.5 text-[12px] text-muted">
            Eisenhower usuli — qaysi ishni darrov, qaysisini rejalashtirish kerakligini ko&apos;ring.
          </p>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[100px_1fr_1fr] grid-rows-[40px_1fr_1fr] gap-2 overflow-hidden p-4">
        {/* Headers */}
        <div />
        <div className="grid place-items-center text-[10.5px] font-medium uppercase tracking-wider text-faint">
          Shoshilinch
        </div>
        <div className="grid place-items-center text-[10.5px] font-medium uppercase tracking-wider text-faint">
          Shoshilinch emas
        </div>
        <div className="flex items-center justify-end pr-2 text-right text-[10.5px] font-medium uppercase tracking-wider text-faint">
          Muhim
        </div>
        <Quadrant data={QUADRANT_META[0]} items={grouped.iu} onMove={move} accent="text-priority-high" />
        <Quadrant data={QUADRANT_META[1]} items={grouped.in} onMove={move} accent="text-priority-medium" />
        <div className="flex items-center justify-end pr-2 text-right text-[10.5px] font-medium uppercase tracking-wider text-faint">
          Muhim emas
        </div>
        <Quadrant data={QUADRANT_META[2]} items={grouped.ni} onMove={move} accent="text-priority-low" />
        <Quadrant data={QUADRANT_META[3]} items={grouped.nn} onMove={move} accent="text-faint" />
      </div>
    </div>
  );
}

function Quadrant({
  data,
  items,
  onMove,
  accent,
}: {
  data: typeof QUADRANT_META[number];
  items: Idea[];
  onMove: (id: string, to: import("react").Key) => void;
  accent: string;
}) {
  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-lg border", data.tone)}>
      <header className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
        <div>
          <p className={cn("text-[11px] font-semibold", accent)}>{data.label}</p>
          <p className="text-[10px] text-faint">{data.sub}</p>
        </div>
        <span className="font-mono text-[10.5px] tabular-nums text-faint">{items.length}</span>
      </header>
      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-faint">— bo&apos;sh —</p>
        ) : (
          items.map((i) => (
            <li key={i.id} className="group flex items-center gap-2 rounded-md border border-border/70 bg-surface px-2 py-1">
              <span className={cn("size-1.5 shrink-0 rounded-full", CAT_COLOR[i.category].dot)} />
              <span className="flex-1 truncate text-[11.5px]">{i.title}</span>
              <select
                value="" // unused, just trigger select
                onChange={(e) => onMove(i.id, e.target.value)}
                className="hidden bg-transparent text-[10px] text-faint group-hover:block"
              >
                <option value="">→</option>
                {QUADRANT_META.map((q) => (
                  <option key={q.key} value={q.key}>{q.label}</option>
                ))}
              </select>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   V5 — Hafta board (7 ustun)
   ──────────────────────────────────────────────────────────── */
function V5WeekBoard() {
  const { ideas, setIdeas } = useVariantState();
  const today = new Date();
  const todayIdx = (today.getDay() + 6) % 7;

  function move(id: string, day: number) {
    setIdeas((prev) => prev.map((x) => x.id === id ? { ...x, day } : x));
  }

  return (
    <div className="flex h-[680px] flex-col overflow-hidden rounded-lg border border-border bg-background">
      <header className="flex shrink-0 items-baseline justify-between border-b border-border px-6 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Reja</p>
          <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">
            Bu hafta rejasi
          </h1>
          <p className="mt-0.5 text-[12px] text-muted">
            Har bir kunga aniqlikni qo&apos;shing. Bo&apos;sh kunlar — fokus uchun joy.
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[18px] font-semibold tabular-nums">
            {ideas.filter((i) => i.day !== undefined).length}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
            joylangan
          </p>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-7 gap-2 overflow-hidden p-3">
        {Array.from({ length: 7 }, (_, day) => {
          const items = ideas.filter((i) => i.day === day);
          const isToday = day === todayIdx;
          return (
            <section
              key={day}
              className={cn(
                "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-surface",
                isToday ? "border-current-time/50 bg-current-time/[0.03]" : "border-border"
              )}
            >
              <header className="border-b border-border bg-subtle/40 px-2 py-1.5">
                <div className="flex items-baseline justify-between">
                  <p className={cn("text-[12px] font-semibold", isToday && "text-current-time")}>
                    {WEEKDAYS_FULL[day].slice(0, 3)}
                  </p>
                  <span className="font-mono text-[10px] tabular-nums text-faint">{items.length}</span>
                </div>
                {isToday && (
                  <p className="font-mono text-[9px] uppercase tracking-wider text-current-time">
                    bugun
                  </p>
                )}
              </header>
              <div className="flex-1 space-y-1 overflow-y-auto p-1.5">
                {items.length === 0 && (
                  <p className="py-4 text-center text-[10.5px] text-faint">—</p>
                )}
                {items.map((i) => (
                  <article
                    key={i.id}
                    className="group rounded border border-border/70 bg-background p-1.5"
                  >
                    <div className="flex items-start gap-1.5">
                      <span className={cn("mt-0.5 size-1.5 shrink-0 rounded-full", CAT_COLOR[i.category].dot)} />
                      <p className={cn("flex-1 text-[11px] leading-tight", i.done && "text-faint line-through")}>
                        {i.title}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                      {[0, 1, 2, 3, 4, 5, 6].filter((d) => d !== day).map((d) => (
                        <button
                          key={d}
                          onClick={() => move(i.id, d)}
                          className="grid size-3 place-items-center rounded text-[8px] text-faint hover:bg-hover hover:text-foreground"
                          title={`${WEEKDAYS_FULL[d]}ga ko'chirish`}
                        >
                          {WEEKDAYS[d][0]}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
                <button className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-1 text-[10px] text-faint hover:border-border-strong">
                  <Plus className="size-2.5" />
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────── Registry ─────────────── */
const VARIANTS = [
  { key: "v1", label: "Inbox",       desc: "G'oyalar daftari — tez tushiring, keyin ajrating", render: <V1Inbox /> },
  { key: "v2", label: "Gorizont",    desc: "Bu hafta / Bu oy / Keyinroq / Bir kun",            render: <V2Horizons /> },
  { key: "v3", label: "Toifalar",    desc: "Ish / Shaxsiy / Salomatlik / O'rganish kanban",    render: <V3Categories /> },
  { key: "v4", label: "Eisenhower",  desc: "Muhimlik × Shoshilinch matritsasi",                render: <V4Eisenhower /> },
  { key: "v5", label: "Hafta",       desc: "7 kunlik board — har kunga joy",                   render: <V5WeekBoard /> },
];

/* ─────────────── Page ─────────────── */
export default function TestPage() {
  const [activeKey, setActiveKey] = useState("v1");
  const active = VARIANTS.find((v) => v.key === activeKey) ?? VARIANTS[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-subtle/30">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint">
            Test sahifasi
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">
            Reja · 5 ta varyant
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Joriy: <span className="font-medium text-foreground">{active.label}</span> — {active.desc}.
          </p>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {VARIANTS.map((v, i) => {
              const isActive = v.key === activeKey;
              return (
                <button
                  key={v.key}
                  onClick={() => setActiveKey(v.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] transition-all",
                    isActive
                      ? "border-foreground bg-foreground text-background shadow-sm"
                      : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground"
                  )}
                >
                  <span className={cn("font-mono text-[10px] tabular-nums", isActive ? "text-background/70" : "text-faint")}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium">{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">{active.render}</main>
    </div>
  );
}
