"use client";

/* Loyiha — mobil ko'rinish: ixcham sarlavha, Barchasi / Reja / Jadval /
   Analitika tablari, loyiha yaratish-tahrirlash oynasi (MonoSheet). Desktop
   o'zgarmaydi — loyiha-view.tsx md:hidden bilan shu yerga ulaydi. */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Flag, Minus, Pencil, Plus, Settings2, Shapes, Sparkles, TrendingDown, TrendingUp, Undo2, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects, useHydratedProjects } from "@/lib/projects-store";
import { useFocusCounts, useTaqsimotSettings } from "@/lib/taqsimot-store";
import { getFocusHistory } from "@/lib/taqsimot-actions";
import { CATEGORY_COLOR_KEYS, CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import { KATEGORIYALAR } from "@/lib/kategoriya";
import { useMobileAdd } from "@/lib/mobile-add";
import type { CategoryColor, LoyihaKategoriya, Project } from "@/lib/types";
import { ProjectIcon, PROJECT_ICON_CHOICES, randomProjectIcon, type ProjectIconKey } from "../loyiha-icons";
import { MonoSheet, MonoSave } from "../widgets/mono-sheet";
import { PickerModal } from "../widgets/picker-modal";
import { ListLoader } from "../widgets/list-loader";
import { MONO_GROUP, MonoEmpty, MonoIconButton, MonoLabel, MonoSeg, MonoStepper, MonoTitle } from "../widgets/mono-bits";

/* ─── Umumiy yordamchilar (workspace ham ishlatadi) ─── */

export const GURUHLAR: { key: LoyihaKategoriya | null; label: string; desc: string; color: CategoryColor }[] = [
  ...KATEGORIYALAR.map((k) => ({ key: k.key, label: k.label, desc: k.desc, color: k.color })),
  { key: null, label: "Kategoriyasiz", desc: "Bo'sh vaqtdan qo'lda ajrating", color: "gray" },
];
export const katMeta = (k: LoyihaKategoriya | null | undefined) => GURUHLAR.find((g) => g.key === (k ?? null))!;

const ink = (c: CategoryColor) => CATEGORY_PALETTE[c].oklch;
// "white" (var(--foreground)) uchun alpha qo'shib bo'lmaydi — neytral fon
const tint = (c: CategoryColor) => (c === "white" ? "var(--subtle)" : colorWithAlpha(c, 0.14));
const round1 = (n: number) => Math.round(n * 10) / 10;

export function CatDot({ color, className }: { color: CategoryColor; className?: string }) {
  return <span className={cn("size-2 shrink-0 rounded-full", className)} style={{ background: ink(color) }} />;
}

export function ProjectTile({ icon, color, size = 44 }: { icon?: string; color?: CategoryColor; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[14px]"
      style={{ width: size, height: size, background: color ? tint(color) : "var(--subtle)", color: color ? ink(color) : "var(--foreground)" }}
    >
      <ProjectIcon k={icon} className={size >= 40 ? "size-5" : "size-4"} />
    </span>
  );
}

/* ─── Asosiy ko'rinish ─── */

type Tab = "barchasi" | "reja" | "jadval" | "analitika";
const TABS: { id: Tab; label: string }[] = [
  { id: "barchasi", label: "Barchasi" },
  { id: "reja", label: "Reja" },
  { id: "jadval", label: "Jadval" },
  { id: "analitika", label: "Analitika" },
];

export function LoyihaMobile() {
  const { projects } = useProjects();
  const [tab, setTab] = useState<Tab>("barchasi");
  const [creating, setCreating] = useState(false);

  // Nav'dagi "+" — yangi loyiha
  useMobileAdd(() => setCreating(true));

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "calc(var(--tg-vh, 100vh) - var(--tg-safe-top, 0px))" }}>
      <header className="shrink-0 px-4 pb-2.5 pt-1">
        <MonoTitle sub={`${projects.length} ta loyiha`} aside={<MonoIconButton icon={Plus} label="Yangi loyiha" solid onClick={() => setCreating(true)} />}>Loyiha</MonoTitle>
        <div className="mt-2"><MonoSeg value={tab} options={TABS} onChange={setTab} /></div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-32 [-webkit-overflow-scrolling:touch]">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
            {tab === "barchasi" && <Barchasi onCreate={() => setCreating(true)} />}
            {tab === "reja" && <RejaTab />}
            {tab === "jadval" && <JadvalTab />}
            {tab === "analitika" && <AnalitikaTab />}
          </motion.div>
        </AnimatePresence>
      </div>
      <MobileProjectForm open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

/* ─── Barchasi ─── */

function Barchasi({ onCreate }: { onCreate: () => void }) {
  const { projects } = useProjects();
  const hydrated = useHydratedProjects();
  const router = useRouter();

  if (!hydrated) return <ListLoader />;
  if (projects.length === 0) {
    return (
      <MonoEmpty
        icon={Sparkles}
        title="Hali loyiha yo'q"
        text="Instagram mavzulari, TZ hujjatlar, tasklar jadvali — har biri uchun alohida loyiha oching."
        action={<button type="button" onClick={onCreate} className="flex h-[52px] items-center gap-2 rounded-[22px] bg-accent px-5 text-[15px] font-semibold text-accent-ink"><Plus className="size-5" /> Birinchi loyihani yarating</button>}
      />
    );
  }
  return (
    <>
      {GURUHLAR.map((g) => {
        const items = projects.filter((p) => (p.category ?? null) === g.key);
        if (!items.length) return null;
        return (
          <section key={g.key ?? "none"}>
            <MonoLabel aside={items.length} className="first:mt-1"><span className="flex items-center gap-2"><CatDot color={g.color} />{g.label}</span></MonoLabel>
            <div className={MONO_GROUP}>
              {items.map((p) => (
                <button key={p.id} type="button" onClick={() => router.push(`/loyiha/${p.id}`)} className="flex min-h-[64px] w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-hover">
                  <ProjectTile icon={p.icon} color={p.color} size={42} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold tracking-[-0.01em]">{p.title}</span>
                    <span className="block truncate text-[13px] text-faint">{p.targetHours ? `Haftalik maqsad: ${p.targetHours} soat` : g.desc}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-faint" />
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

/* ─── Reja (vaqt taqsimoti) ─── */

const DAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const DAYS_LONG = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

function RejaTab() {
  const { projects, update } = useProjects();
  const { capacity, categoryPct, setCapacityDay, setCategoryPct } = useTaqsimotSettings();
  const { focus } = useFocusCounts();
  const [day, setDay] = useState<number | null>(null);
  const [prev, setPrev] = useState<Record<string, number> | null>(null);

  const jamiSigim = round1(capacity.reduce((a, b) => a + b, 0));
  const jamiMaqsad = round1(projects.reduce((a, p) => a + (p.targetHours ?? 0), 0));
  const bosh = Math.max(0, round1(jamiSigim - jamiMaqsad));
  const pctJami = KATEGORIYALAR.reduce((a, k) => a + (categoryPct[k.key] ?? 0), 0);

  // Desktop'dagi bilan bir xil: kategoriya foiziga ko'ra teng bo'lib chiqadi
  function avto() {
    const snap: Record<string, number> = {};
    for (const p of projects) snap[p.id] = p.targetHours ?? 0;
    setPrev(snap);
    for (const k of KATEGORIYALAR) {
      const list = projects.filter((p) => p.category === k.key);
      if (!list.length) continue;
      const per = round1((jamiSigim * ((categoryPct[k.key] ?? 0) / 100)) / list.length);
      for (const p of list) update(p.id, { targetHours: per });
    }
  }
  function undo() {
    if (!prev) return;
    for (const [id, v] of Object.entries(prev)) update(id, { targetHours: v });
    setPrev(null);
  }

  return (
    <>
      <MonoLabel aside={`${jamiSigim} soat`} className="mt-1"><span className="flex items-center gap-1.5"><Settings2 className="size-3.5" /> Haftalik sig&apos;im</span></MonoLabel>
      <div className="rounded-[22px] border border-border bg-surface p-2.5">
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d, i) => (
            <button key={d} type="button" onClick={() => setDay(i)} className="flex h-[56px] flex-col items-center justify-center rounded-[14px] bg-subtle active:bg-hover">
              <span className="text-[11.5px] font-medium text-faint">{d}</span>
              <span className="text-[16px] font-semibold tabular-nums">{capacity[i]}</span>
            </button>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {([["Jami sig'im", jamiSigim], ["Maqsad", jamiMaqsad], ["Bo'sh vaqt", bosh]] as const).map(([l, v]) => (
            <div key={l} className="rounded-[14px] border border-border px-2 py-2 text-center">
              <p className="text-[16px] font-bold tabular-nums">{v}<span className="text-[12px] font-semibold text-faint">s</span></p>
              <p className="text-[11.5px] text-faint">{l}</p>
            </div>
          ))}
        </div>
      </div>

      <MonoLabel aside={<span className={cn(pctJami !== 100 && "font-semibold text-danger")}>Jami: {pctJami}%</span>}>Kategoriya maqsadi</MonoLabel>
      <div className={MONO_GROUP}>
        {KATEGORIYALAR.map((k) => (
          <div key={k.key} className="flex min-h-[64px] items-center gap-3 px-3.5">
            <CatDot color={k.color} className="size-2.5" />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{k.label}</span>
              <span className="block truncate text-[12.5px] text-faint">{k.desc}</span>
            </span>
            <MonoStepper value={categoryPct[k.key] ?? 0} step={5} max={100} unit="%" onChange={(v) => setCategoryPct(k.key, v)} />
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex gap-2">
        <button type="button" onClick={avto} className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[22px] bg-accent text-[15.5px] font-semibold text-accent-ink active:opacity-90">
          <Wand2 className="size-5" /> Avtomatik taqsimlash
        </button>
        <AnimatePresence>
          {prev && (
            <motion.button initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 52 }} exit={{ opacity: 0, width: 0 }} type="button" onClick={undo} aria-label="Bekor qilish" className="grid h-[52px] shrink-0 place-items-center rounded-[22px] border border-border bg-surface">
              <Undo2 className="size-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {GURUHLAR.map((g) => {
        const items = projects.filter((p) => (p.category ?? null) === g.key);
        if (!items.length) return null;
        return (
          <section key={g.key ?? "none"}>
            <MonoLabel aside={`${round1(items.reduce((a, p) => a + (p.targetHours ?? 0), 0))} soat`}><span className="flex items-center gap-2"><CatDot color={g.color} />{g.label}</span></MonoLabel>
            <div className={MONO_GROUP}>
              {items.map((p) => (
                <div key={p.id} className="flex min-h-[64px] items-center gap-3 px-3.5">
                  <ProjectTile icon={p.icon} color={p.color} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{p.title}</span>
                    <span className="block text-[12.5px] text-faint">hozir: {focus[p.id] ?? 0} soat</span>
                  </span>
                  <MonoStepper value={p.targetHours ?? 0} unit="s" onChange={(v) => { setPrev(null); update(p.id, { targetHours: v }); }} />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <PickerModal open={day !== null} onClose={() => setDay(null)} label={day !== null ? `${DAYS_LONG[day]} — sig'im` : "Sig'im"}>
        {day !== null && (
          <>
            <div className="flex items-center justify-center gap-4 py-3">
              <button type="button" aria-label="Kamaytirish" onClick={() => setCapacityDay(day, Math.max(0, capacity[day] - 0.5))} className="grid size-14 place-items-center rounded-full bg-subtle"><Minus className="size-6" /></button>
              <p className="w-28 text-center text-[44px] font-bold tabular-nums tracking-[-0.03em]">{capacity[day]}<span className="text-[18px] text-faint">s</span></p>
              <button type="button" aria-label="Oshirish" onClick={() => setCapacityDay(day, Math.min(24, capacity[day] + 0.5))} className="grid size-14 place-items-center rounded-full bg-subtle"><Plus className="size-6" /></button>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[0, 2, 4, 6, 8, 12].map((v) => (
                <button key={v} type="button" onClick={() => setCapacityDay(day, v)} className={cn("h-11 rounded-[14px] text-[14px] font-semibold tabular-nums", capacity[day] === v ? "bg-accent text-accent-ink" : "bg-subtle")}>{v}</button>
              ))}
            </div>
            <button type="button" onClick={() => setDay(null)} className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-[22px] bg-accent text-[15.5px] font-semibold text-accent-ink"><Check className="size-5" strokeWidth={2.6} /> Tayyor</button>
          </>
        )}
      </PickerModal>
    </>
  );
}

/* ─── Jadval (necha marta ishlandi) ─── */

function JadvalTab() {
  const { projects } = useProjects();
  const { focus, inc, dec } = useFocusCounts();
  return (
    <>
      <p className="mt-1 truncate px-1 text-[12.5px] text-faint">Har safar ishlaganingizda «+» bosing — necha marta ishlaganingiz.</p>
      {GURUHLAR.map((g) => {
        const items = projects.filter((p) => (p.category ?? null) === g.key);
        if (!items.length) return null;
        return (
          <section key={g.key ?? "none"}>
            <MonoLabel><span className="flex items-center gap-2"><CatDot color={g.color} />{g.label}</span></MonoLabel>
            <div className={MONO_GROUP}>
              {items.map((p) => {
                const n = focus[p.id] ?? 0;
                const color = p.color ? ink(p.color) : "var(--foreground)";
                return (
                  <div key={p.id} className="flex min-h-[68px] items-center gap-3 px-3.5 py-3">
                    <ProjectTile icon={p.icon} color={p.color} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px] font-semibold">{p.title}</span>
                        <span className="shrink-0 text-[12.5px] tabular-nums text-faint">{n} marta</span>
                      </span>
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        <AnimatePresence initial={false}>
                          {Array.from({ length: n }).map((_, i) => (
                            <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="grid size-[18px] place-items-center rounded-full" style={{ background: color }}>
                              <Check className="size-2.5 text-background" strokeWidth={4} />
                            </motion.span>
                          ))}
                        </AnimatePresence>
                        {n === 0 && <span className="text-[12.5px] text-faint">Hali belgi yo&apos;q</span>}
                      </span>
                    </span>
                    <button type="button" aria-label="Bekor qilish" disabled={n === 0} onClick={() => dec(p.id)} className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle disabled:opacity-35"><Minus className="size-4" /></button>
                    <MonoIconButton icon={Plus} label="Ishladim +1" solid onClick={() => inc(p.id)} />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

/* ─── Analitika ─── */

function ColorRing({ pct, color }: { pct: number; color: string }) {
  const size = 60, stroke = 6, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <span className="relative grid size-[60px] place-items-center">
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--subtle)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} initial={false} animate={{ strokeDashoffset: c * (1 - Math.min(100, pct) / 100) }} transition={{ duration: 0.5 }} />
      </svg>
      <span className="text-[13.5px] font-bold tabular-nums">{pct}%</span>
    </span>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 64, h = 24, max = Math.max(1, ...data), min = Math.min(...data), range = Math.max(1, max - min), step = w / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  return <svg width={w} height={h} className="shrink-0" aria-hidden><polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function AnalitikaTab() {
  const { projects } = useProjects();
  const { focus } = useFocusCounts();
  const [history, setHistory] = useState<Record<string, number[]>>({});
  useEffect(() => {
    let alive = true;
    void getFocusHistory(6).then((h) => { if (alive) setHistory(h); });
    return () => { alive = false; };
  }, []);

  const kats = useMemo(() => KATEGORIYALAR.map((k) => {
    const items = projects.filter((p) => p.category === k.key);
    const maqsad = round1(items.reduce((a, p) => a + (p.targetHours ?? 0), 0));
    const amalda = round1(items.reduce((a, p) => a + (focus[p.id] ?? 0), 0));
    return { ...k, maqsad, amalda, pct: maqsad > 0 ? Math.round((amalda / maqsad) * 100) : 0 };
  }), [projects, focus]);
  const rows = useMemo(() => projects
    .filter((p) => (p.targetHours ?? 0) > 0 || (focus[p.id] ?? 0) > 0)
    .map((p) => {
      const amalda = focus[p.id] ?? 0, maqsad = p.targetHours ?? 0;
      return { p, amalda, maqsad, pct: maqsad > 0 ? Math.round((amalda / maqsad) * 100) : amalda > 0 ? 100 : 0 };
    })
    .sort((a, b) => b.pct - a.pct), [projects, focus]);

  return (
    <>
      <MonoLabel className="mt-1">Reja bo&apos;yicha bajarish — kategoriya</MonoLabel>
      <div className="grid grid-cols-2 gap-2">
        {kats.map((k) => (
          <div key={k.key} className="flex flex-col items-center rounded-[22px] border border-border bg-surface p-3">
            <ColorRing pct={k.pct} color={ink(k.color)} />
            <p className="mt-2 text-[14px] font-semibold">{k.label}</p>
            <p className="text-[12.5px] tabular-nums text-faint">{k.amalda} / {k.maqsad} soat</p>
          </div>
        ))}
      </div>

      <MonoLabel>Reja bo&apos;yicha bajarish — loyiha</MonoLabel>
      {rows.length === 0 ? (
        <p className="rounded-[22px] border border-border bg-surface py-6 text-center text-[14px] text-faint">Hali maqsad yoki belgi kiritilmagan</p>
      ) : (
        <div className={MONO_GROUP}>
          {rows.map(({ p, amalda, maqsad, pct }) => (
            <div key={p.id} className="flex min-h-[64px] items-center gap-3 px-3.5 py-3">
              <ProjectTile icon={p.icon} color={p.color} size={36} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[15px] font-semibold">{p.title}</span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums">{pct}%</span>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-subtle">
                  <motion.span className="block h-full rounded-full" style={{ background: pct > 100 || !p.color ? "var(--foreground)" : ink(p.color) }} initial={false} animate={{ width: `${Math.min(100, pct)}%` }} />
                </span>
                <span className="mt-1 block text-[12px] tabular-nums text-faint">{amalda} / {maqsad} soat</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <MonoLabel>Trend — oxirgi 6 hafta</MonoLabel>
      {projects.length === 0 ? (
        <p className="rounded-[22px] border border-border bg-surface py-6 text-center text-[14px] text-faint">Hali loyiha yo&apos;q</p>
      ) : (
        <div className={MONO_GROUP}>
          {projects.map((p) => {
            const data = history[p.id] ?? [0, 0, 0, 0, 0, focus[p.id] ?? 0];
            const last = data[data.length - 1], before = data[data.length - 2];
            const delta = before ? Math.round(((last - before) / before) * 100) : 0;
            return (
              <div key={p.id} className="flex min-h-[64px] items-center gap-3 px-3.5">
                <ProjectTile icon={p.icon} color={p.color} size={36} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{p.title}</span>
                <Sparkline data={data} color={p.color ? ink(p.color) : "var(--foreground)"} />
                <span className="w-[54px] shrink-0 text-right">
                  <span className="block text-[14px] font-semibold tabular-nums">{last}s</span>
                  <span className={cn("flex items-center justify-end gap-0.5 text-[11.5px] font-semibold tabular-nums", delta > 0 ? "text-foreground" : delta < 0 ? "text-danger" : "text-faint")}>
                    {delta > 0 ? <TrendingUp className="size-3" /> : delta < 0 ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
                    {delta !== 0 && `${delta > 0 ? "+" : ""}${delta}%`}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ─── Loyiha formasi (yaratish/tahrirlash) ─── */

export function MobileProjectForm({ open, initial, onClose }: { open: boolean; initial?: Project; onClose: () => void }) {
  return (
    <MonoSheet open={open} onClose={onClose} label={initial ? "Loyihani tahrirlash" : "Yangi loyiha"} dismissable={false}>
      {open && <FormBody key={initial?.id ?? "new"} initial={initial} onClose={onClose} />}
    </MonoSheet>
  );
}

function FormBody({ initial, onClose }: { initial?: Project; onClose: () => void }) {
  const { create, update } = useProjects();
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [icon, setIcon] = useState<ProjectIconKey>(() => (initial?.icon as ProjectIconKey) ?? randomProjectIcon());
  const [color, setColor] = useState<CategoryColor>(initial?.color ?? "indigo");
  const [category, setCategory] = useState<LoyihaKategoriya | "none">(initial?.category ?? "none");
  const [pickIcon, setPickIcon] = useState(false);
  const cat = category === "none" ? null : category;

  function submit() {
    const t = title.trim();
    if (!t) return;
    if (initial) {
      update(initial.id, { title: t, icon, color, category: cat });
      onClose();
    } else {
      const id = create({ title: t, icon, color });
      if (cat) update(id, { category: cat });
      onClose();
      router.push(`/loyiha/${id}`);
    }
  }

  return (
    <>
      <div className="rounded-[24px] border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-semibold text-muted">{initial ? "Loyihani tahrirlash" : "Yangi loyiha"}</p>
          <button type="button" onClick={onClose} aria-label="Yopish" className="grid size-8 place-items-center rounded-full bg-subtle"><X className="size-4" strokeWidth={2.4} /></button>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button type="button" onClick={() => setPickIcon(true)} aria-label="Ikonani tanlash" className="relative">
            <ProjectTile icon={icon} color={color} size={52} />
            <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border border-border bg-surface"><Pencil className="size-2.5" /></span>
          </button>
          <input
            autoFocus={!initial}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            enterKeyHint="done"
            placeholder="Masalan: Instagram kontent"
            className="min-w-0 flex-1 bg-transparent text-[21px]! font-bold tracking-[-0.02em] outline-none placeholder:text-[18px] placeholder:font-semibold placeholder:text-faint"
          />
        </div>
      </div>
      <div className="rounded-[22px] border border-border bg-surface p-3">
        <p className="mb-2 flex items-center gap-1 text-[11.5px] font-semibold opacity-75"><Flag className="size-3.5" /> Kategoriya</p>
        <div className="grid grid-cols-5 gap-1.5">
          {([...KATEGORIYALAR.map((k) => k.key), "none"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setCategory(k)} className={cn("flex h-11 items-center justify-center gap-1.5 rounded-[14px] border text-[14px] font-semibold", category === k ? "border-accent bg-accent text-accent-ink" : "border-border text-muted")}>
              {k !== "none" && <CatDot color={katMeta(k).color} className="size-1.5" />}{k === "none" ? "—" : k}
            </button>
          ))}
        </div>
        <p className="mt-2 px-1 text-[12.5px] text-faint">{cat ? `${katMeta(cat).label}: ${katMeta(cat).desc}` : "Kategoriyasiz — bo'sh vaqtdan qo'lda ajratiladi"}</p>
      </div>
      <div className="rounded-[22px] border border-border bg-surface p-3">
        <p className="mb-1 flex items-center gap-1 text-[11.5px] font-semibold opacity-75"><Shapes className="size-3.5" /> Rangi · {CATEGORY_PALETTE[color].label}</p>
        <div className="grid grid-cols-9 gap-y-1">
          {CATEGORY_COLOR_KEYS.map((k) => (
            <button key={k} type="button" onClick={() => setColor(k)} aria-label={CATEGORY_PALETTE[k].label} className="grid h-10 place-items-center">
              <span className={cn("grid size-8 place-items-center rounded-full", color === k && "ring-2 ring-foreground ring-offset-2 ring-offset-surface")} style={{ background: ink(k) }}>
                {color === k && <Check className="size-3.5 text-background" strokeWidth={3} />}
              </span>
            </button>
          ))}
        </div>
      </div>
      <MonoSave disabled={!title.trim()} onClick={submit}>{initial ? "Saqlash" : "Yaratish"}</MonoSave>

      <PickerModal open={pickIcon} onClose={() => setPickIcon(false)} label="Ikonani tanlash">
        <div className="grid grid-cols-6 gap-1.5">
          {PROJECT_ICON_CHOICES.map((k) => (
            <button key={k} type="button" aria-label={k} onClick={() => { setIcon(k); setPickIcon(false); }} className={cn("grid aspect-square place-items-center rounded-[14px] border", icon === k ? "border-accent bg-accent text-accent-ink" : "border-border text-muted")}>
              <ProjectIcon k={k} className="size-5" />
            </button>
          ))}
        </div>
      </PickerModal>
    </>
  );
}
