"use client";

import { createElement, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Delete,
  PenLine,
  Plus,
  Tag,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinanceCategory, Transaction, TransactionType } from "@/lib/types";
import { CATEGORY_PALETTE, colorWithAlpha } from "@/lib/category-palette";
import { financeIcon } from "@/lib/finance-icons";
import { dateKey, formatSom } from "@/lib/money";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { DatePickerButton } from "./widgets/date-picker-button";

/* Mobil: yangi kirim/chiqim qo'shishning tez oynasi (Sozlamalar > Mavzu >
   Moliya'dan yoqiladi). Avval kategoriya → summa, ✓ saqlaydi. Summa o'z
   raqam klaviaturasi bilan — telefon klaviaturasi faqat izoh yozilganda
   ochiladi. */

type CreateInput = {
  type: TransactionType;
  amount: number;
  categoryId: string | null;
  note?: string;
  date: string;
};

type Props = {
  open: boolean;
  initialType: TransactionType;
  categories: FinanceCategory[];
  transactions: Transaction[];
  onClose: () => void;
  onCreate: (input: CreateInput) => void;
  /** Mavjud kategoriya yaratish formasi (moliya-view'dagi CategoryForm). */
  renderCategoryForm: (type: TransactionType, onCreated: (id: string) => void, onCancel: () => void) => React.ReactNode;
};

const INCOME_COLOR = "oklch(0.62 0.13 158)";
const EXPENSE_COLOR = "oklch(0.62 0.17 22)";
const KINDS: { id: TransactionType; label: string; icon: typeof ArrowDownLeft; color: string }[] = [
  { id: "EXPENSE", label: "Chiqim", icon: ArrowUpRight, color: EXPENSE_COLOR },
  { id: "INCOME", label: "Kirim", icon: ArrowDownLeft, color: INCOME_COLOR },
];
const kindOf = (t: TransactionType) => KINDS.find((k) => k.id === t)!;

const SPRING = { type: "spring", damping: 30, stiffness: 380 } as const;
const SHEET = { type: "spring", damping: 32, stiffness: 320 } as const;
// Oyna tepasi: Telegram close/⋮ zonasi ostida (brauzerda — status bar ostida).
const TOP_GAP = "max(calc(var(--tg-safe-top, 0px) + 6px), calc(env(safe-area-inset-top, 0px) + 12px))";
// Kategoriya ↔ summa bosqichlari — siljimasdan, fade bilan almashadi.
const STEP_FADE = { duration: 0.22, ease: "easeOut" } as const;
const PAGE = { type: "spring", damping: 34, stiffness: 300 } as const;
const UZ_MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}
function dateLabel(k: string) {
  if (k === dateKey()) return "Bugun";
  if (k === yesterdayKey()) return "Kecha";
  const [, m, d] = k.split("-").map(Number);
  return `${d}-${UZ_MONTHS[m - 1]}`;
}
const catOklch = (c: FinanceCategory) => CATEGORY_PALETTE[c.color].oklch;
const catGradient = (c: FinanceCategory) =>
  `linear-gradient(150deg, ${catOklch(c)}, color-mix(in oklch, ${catOklch(c)} 72%, black))`;

const noopSubscribe = () => () => {};

export function MoliyaQuickAdd(props: Props) {
  // Portal faqat brauzerda (SSR'da document yo'q).
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  useScrollLock(props.open);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {props.open && (
        <>
          <motion.div
            key="qa-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={props.onClose}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[3px] md:hidden"
          />
          <Sheet key="qa-sheet" {...props} />
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* Telefon klaviaturasi (izoh) ochilganda oyna qimirlamaydi: balandligi
   ochilgan paytdagi ekran bo'yicha qotiriladi (Android'da viewport qisqarsa
   ham), klaviatura shunchaki pastki qismini yopadi. iOS sahifani yuqoriga
   sursa — `top` shunga moslanadi. */
function useViewportShift() {
  const [shift, setShift] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setShift(Math.max(0, vv.offsetTop));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return shift;
}

/* Har ochilishda yangidan mount bo'ladi — holat o'z-o'zidan tiklanadi. */
function Sheet({ initialType, categories, transactions, onClose, onCreate, renderCategoryForm }: Props) {
  const [type, setTypeRaw] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(() => dateKey());
  const [note, setNote] = useState("");
  const [step, setStep] = useState<0 | 1>(0);
  const [panel, setPanel] = useState<null | "date" | "note">(null);
  const [creatingCat, setCreatingCat] = useState(false);
  const shift = useViewportShift();
  // O'lchamlar ochilgan paytdagi ekran bo'yicha bir marta — klaviatura
  // (dvh o'zgarishi) ularni birdaniga o'zgartirib yubormasin.
  const [baseHeight] = useState(() => window.innerHeight);
  const sizes = useMemo(() => {
    const clamp = (v: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, v)));
    return {
      key: clamp(baseHeight * 0.076, 52, 72),
      keyFont: clamp(baseHeight * 0.031, 22, 28),
      amountFont: clamp(baseHeight * 0.06, 40, 52),
    };
  }, [baseHeight]);
  const k = kindOf(type);
  const typeIdx = KINDS.findIndex((x) => x.id === type);
  const noteOpen = panel === "note";

  // Eng ko'p ishlatilgan kategoriya tepada; teng bo'lsa — foydalanuvchi tartibi.
  const catsByType = useMemo(() => {
    const usage = new Map<string, number>();
    for (const t of transactions) if (t.categoryId) usage.set(t.categoryId, (usage.get(t.categoryId) ?? 0) + 1);
    const sorted = categories
      .slice()
      .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.order - b.order);
    return {
      EXPENSE: sorted.filter((c) => c.type === "EXPENSE"),
      INCOME: sorted.filter((c) => c.type === "INCOME"),
    } as Record<TransactionType, FinanceCategory[]>;
  }, [categories, transactions]);
  const cat = categories.find((c) => c.id === categoryId);

  // Tur faqat kategoriya bosqichida almashadi (tugma yoki chap/o'ngga surish).
  function setType(t: TransactionType) {
    if (t === type) return;
    setTypeRaw(t);
    setCategoryId(null);
    setCreatingCat(false);
  }
  function save(catId: string | null) {
    if (amount <= 0) return;
    onCreate({ type, amount, categoryId: catId, note: note.trim() || undefined, date });
  }

  // Kategoriya (yoki kategoriyasiz) tanlandi → summa bosqichi.
  function chooseCategory(id: string | null) {
    setCategoryId(id);
    setPanel(null);
    setStep(1);
  }
  const back = () => (step === 0 ? onClose() : setStep(0));

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={SHEET}
      role="dialog"
      aria-label={`Yangi ${k.label.toLowerCase()}`}
      // Doim bir xil balandlik: tepada Telegram close/⋮ zonasigacha (brauzerda — status bar ostigacha).
      className="fixed inset-x-0 z-50 flex flex-col overflow-hidden rounded-t-[32px] border-t border-border bg-surface md:hidden"
      style={{
        top: `calc(${shift}px + ${TOP_GAP})`,
        height: `calc(${baseHeight}px - ${TOP_GAP})`,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
      }}
    >
      <span className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-faint/50" />

      {/* Sarlavha: orqaga/yopish · tur (faqat 1-bosqichda almashadi) · progress */}
      <div className="flex shrink-0 select-none items-center gap-2 px-4 pt-2">
        <button
          onClick={back}
          aria-label={step === 0 ? "Yopish" : "Orqaga"}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface text-foreground shadow-[0_2px_8px_-3px_rgba(0,0,0,0.18)] transition-transform active:scale-90"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={step}
              initial={{ opacity: 0, rotate: step ? 90 : -90, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: step ? -90 : 90, scale: 0.6 }}
              transition={{ duration: 0.18 }}
              className="grid"
            >
              {step === 0 ? <X className="size-5" strokeWidth={2.4} /> : <ArrowLeft className="size-5" strokeWidth={2.4} />}
            </motion.span>
          </AnimatePresence>
        </button>
        <div className="relative flex h-8 flex-1 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {step === 0 ? (
              <motion.div
                key="seg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex rounded-full bg-subtle p-0.5"
              >
                {KINDS.map((x) => {
                  const on = type === x.id;
                  return (
                    <button key={x.id} onClick={() => setType(x.id)} className={cn("relative flex items-center gap-1 rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors", on ? "text-white" : "text-muted")}>
                      {on && <motion.span layoutId="qa-type-pill" transition={SPRING} className="absolute inset-0 rounded-full" style={{ background: x.color }} />}
                      <span className="relative flex items-center gap-1"><x.icon className="size-3.5" strokeWidth={2.4} /> {x.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.span
                key="badge"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1 rounded-full px-3 py-1 text-[12.5px] font-semibold text-white"
                style={{ background: k.color }}
              >
                <k.icon className="size-3.5" strokeWidth={2.4} /> {k.label}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <span className="size-10 shrink-0" />
      </div>
      <div className="mx-auto mt-2.5 grid w-24 shrink-0 grid-cols-2 gap-1">
        {[0, 1].map((i) => (
          <span key={i} className="h-1 overflow-hidden rounded-full bg-subtle">
            <motion.span className="block h-full rounded-full" style={{ background: k.color }} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.3 }} />
          </span>
        ))}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          {step === 0 ? (
            /* ── 1-bosqich: kategoriya (chap/o'ngga surish — Chiqim/Kirim) ── */
            <motion.div
              key="cat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={STEP_FADE}
              className="absolute inset-0 flex flex-col"
            >
              <div className="shrink-0 px-4 pt-3 text-center">
                <div className="relative h-6">
                  <AnimatePresence initial={false}>
                    <motion.p
                      key={type}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="absolute inset-0 text-[17px] font-semibold"
                    >
                      {type === "INCOME" ? "Pul qayerdan keldi?" : "Nimaga sarfladingiz?"}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <p className="mt-0.5 text-[11.5px] text-faint">Chapga / o&apos;ngga surib Chiqim ↔ Kirim</p>
              </div>
              <TypePager
                index={typeIdx}
                onIndexChange={(i) => setType(KINDS[i].id)}
                disabled={creatingCat}
                pages={KINDS.map((kind) =>
                  creatingCat && kind.id === type ? (
                    <div key={kind.id} className="px-4">
                      {renderCategoryForm(
                        type,
                        (id) => { setCreatingCat(false); chooseCategory(id); },
                        () => setCreatingCat(false)
                      )}
                    </div>
                  ) : (
                    <CategoryGrid key={kind.id} cats={catsByType[kind.id]} onPick={(c) => chooseCategory(c.id)} />
                  )
                )}
              />
              {!creatingCat && (
                <div className="flex shrink-0 items-center justify-between border-t border-border px-4 pt-2.5">
                  <button onClick={() => setCreatingCat(true)} className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-[12.5px] text-faint">
                    <Plus className="size-3.5" /> Yangi kategoriya
                  </button>
                  <button onClick={() => chooseCategory(null)} className="flex items-center gap-1 text-[12.5px] font-medium text-faint">
                    Kategoriyasiz <ChevronRight className="size-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            /* ── 2-bosqich: summa (tur bu yerda o'zgarmaydi) ── */
            <motion.div
              key="amount"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={STEP_FADE}
              className="absolute inset-0 flex flex-col"
            >
              {/* Tanlangan kategoriya — bosilsa 1-bosqichga qaytadi */}
              <button onClick={() => setStep(0)} className="mx-4 mt-3 flex shrink-0 items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-transform active:scale-[0.99]" style={{ background: cat ? colorWithAlpha(cat.color, 0.12) : "var(--subtle)" }}>
                {cat ? <CatBadge c={cat} /> : (
                  <span className="grid size-10 place-items-center rounded-xl bg-surface text-faint"><Tag className="size-5" /></span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] uppercase tracking-[0.12em]" style={{ color: k.color }}>{k.label}</span>
                  <span className="block truncate text-[15px] font-semibold">{cat?.label ?? "Kategoriyasiz"}</span>
                </span>
                <span className="pr-1 text-[12px] text-faint">o&apos;zgartirish</span>
              </button>

              <div className="shrink-0">
                <DateNote date={date} setDate={setDate} note={note} setNote={setNote} panel={panel} setPanel={setPanel} />
              </div>

              {/* Summa — bo'sh joy markazida. Izoh ochilganda silliq kichrayadi. */}
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5">
                <motion.div
                  layout="position"
                  animate={{ scale: noteOpen ? 0.78 : 1 }}
                  transition={SPRING}
                  className="flex flex-col items-center"
                >
                  <AnimatedAmount value={amount} color={k.color} fontSize={sizes.amountFont} />
                  <p className="mt-1.5 text-[12px] text-faint">so&apos;m</p>
                </motion.div>
              </div>

              {/* Izoh yozilayotganda raqamlar joyida qolib, faqat fade bo'ladi —
                  ustini telefon klaviaturasi yopadi (hech narsa siljimaydi). */}
              <motion.div
                animate={{ opacity: noteOpen ? 0 : 1 }}
                transition={{ duration: 0.18 }}
                aria-hidden={noteOpen}
                className={cn("shrink-0", noteOpen && "pointer-events-none")}
              >
                <Keypad amount={amount} onChange={setAmount} color={k.color} onSubmit={() => save(categoryId)} keyHeight={sizes.key} keyFont={sizes.keyFont} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* Kirim/Chiqim pager — sahifalar bitta lentada yonma-yon. Lenta barmoqqa 1:1
   ergashadi; birinchi harakatda yo'nalish qulflanadi (gorizontal — surish,
   vertikal — ro'yxat scroll'i, brauzerda). Qo'yib yuborilganda masofa yoki
   tezlikka qarab sahifaga yopishadi; chetlarda rezina. Surishdan keyingi
   tasodifiy bosish bekor qilinadi. Tugma orqali almashsa ham shu lenta suriladi. */
function TypePager({
  index,
  onIndexChange,
  pages,
  disabled,
}: {
  index: number;
  onIndexChange: (i: number) => void;
  pages: React.ReactNode[];
  disabled?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);
  const gesture = useRef<{ lock: "x" | "y" | null; startX: number }>({ lock: null, startX: 0 });
  const suppressClick = useRef(false);
  const positioned = useRef(false);
  const last = pages.length - 1;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Index (tugma yoki surish) yoki kenglik o'zgarsa — lentani shu sahifaga suramiz.
  useEffect(() => {
    if (!width) return;
    const target = -index * width;
    if (!positioned.current) {
      positioned.current = true;
      x.set(target);
      return;
    }
    const controls = animate(x, target, PAGE);
    return () => controls.stop();
  }, [index, width, x]);

  return (
    <motion.div
      ref={viewportRef}
      className="relative mt-2 min-h-0 flex-1 select-none overflow-hidden"
      style={{ touchAction: "pan-y" }}
      onPanStart={() => {
        x.stop();
        gesture.current = { lock: null, startX: x.get() };
      }}
      onPan={(_, info) => {
        if (disabled || !width) return;
        const g = gesture.current;
        if (!g.lock) {
          if (Math.abs(info.offset.x) < 8 && Math.abs(info.offset.y) < 8) return;
          g.lock = Math.abs(info.offset.x) > Math.abs(info.offset.y) ? "x" : "y";
        }
        if (g.lock !== "x") return;
        let next = g.startX + info.offset.x;
        const min = -last * width;
        if (next > 0) next *= 0.3; // rezina — chap chet
        else if (next < min) next = min + (next - min) * 0.3; // rezina — o'ng chet
        x.set(next);
      }}
      onPanEnd={(_, info) => {
        const g = gesture.current;
        if (g.lock !== "x" || !width) return;
        suppressClick.current = true;
        window.setTimeout(() => { suppressClick.current = false; }, 80);
        const dx = info.offset.x;
        const vx = info.velocity.x;
        let target = index;
        if ((dx < -width * 0.2 || vx < -450) && index < last) target = index + 1;
        else if ((dx > width * 0.2 || vx > 450) && index > 0) target = index - 1;
        if (target !== index) onIndexChange(target);
        else animate(x, -index * width, PAGE);
      }}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      <motion.div className="absolute inset-y-0 left-0 flex" style={{ x, width: `${pages.length * 100}%` }}>
        {pages.map((page, i) => (
          <div
            key={i}
            aria-hidden={i !== index}
            className="h-full overflow-y-auto overscroll-contain pb-3"
            // Har bir sahifa o'zi scroll konteyner — brauzer faqat vertikal
            // gestni olsin, aks holda gorizontal surishni `pointercancel` bilan
            // bekor qilib yuboradi (touch'da surish "qotib" qaytardi).
            style={{ width: `${100 / pages.length}%`, touchAction: "pan-y" }}
          >
            {page}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

function CatBadge({ c }: { c: FinanceCategory }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: catGradient(c) }}>
      {createElement(financeIcon(c.icon), { className: "size-5", strokeWidth: 2 })}
    </span>
  );
}

/* 2 ustunli plitkalar — sig'masa sahifa scroll bo'ladi (o'lcham kichraymaydi). */
function CategoryGrid({ cats, onPick }: { cats: FinanceCategory[]; onPick: (c: FinanceCategory) => void }) {
  if (!cats.length) return <EmptyCats />;
  return (
    <div className="grid grid-cols-2 gap-2 px-4 pt-1">
      {cats.map((c) => (
        <button key={c.id} onClick={() => onPick(c)} className="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3 text-left transition-transform active:scale-[0.98]" style={{ background: colorWithAlpha(c.color, 0.1) }}>
          <CatBadge c={c} />
          <span className="truncate text-[14px] font-medium">{c.label}</span>
        </button>
      ))}
    </div>
  );
}

function EmptyCats() {
  return <p className="px-4 py-6 text-center text-[13px] text-faint">Hali kategoriya yo&apos;q — yangisini yarating yoki kategoriyasiz davom eting.</p>;
}

function DateNote({
  date,
  setDate,
  note,
  setNote,
  panel,
  setPanel,
}: {
  date: string;
  setDate: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  panel: null | "date" | "note";
  setPanel: (p: null | "date" | "note") => void;
}) {
  const today = dateKey();
  const yesterday = yesterdayKey();
  const chip = (on: boolean) =>
    cn("rounded-full border px-3 py-1.5 text-[12.5px] transition-colors", on ? "border-foreground/30 bg-hover font-medium text-foreground" : "border-border text-muted");
  return (
    <>
      <div className="mt-2.5 flex gap-2 px-4">
        <button onClick={() => setPanel(panel === "date" ? null : "date")} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px]", panel === "date" ? "border-foreground/30 bg-hover" : "border-border text-muted")}>
          <CalendarDays className="size-3.5" /> {dateLabel(date)}
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => setPanel(panel === "note" ? null : "note")} className={cn("flex min-w-0 flex-1 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px]", panel === "note" ? "border-foreground/30 bg-hover" : "border-border text-muted")}>
          <PenLine className="size-3.5 shrink-0" />
          <span className="truncate">{note || "Izoh qo'shish"}</span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {panel && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden px-4">
            <div className="pt-2">
              {panel === "date" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button onClick={() => { setDate(today); setPanel(null); }} className={chip(date === today)}>Bugun</button>
                  <button onClick={() => { setDate(yesterday); setPanel(null); }} className={chip(date === yesterday)}>Kecha</button>
                  <DatePickerButton
                    value={date}
                    onChange={(v) => { setDate(v); setPanel(null); }}
                    active={date !== today && date !== yesterday}
                    format={dateLabel}
                    label={date !== today && date !== yesterday ? dateLabel(date) : "Boshqa sana"}
                    placeholder="Boshqa sana"
                  />
                </div>
              ) : (
                <input
                  autoFocus
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") setPanel(null); }}
                  // Klaviatura yopilsa — izoh paneli ham yopiladi, raqamlar qaytadi.
                  onBlur={() => setPanel(null)}
                  enterKeyHint="done"
                  placeholder="Izoh (ixtiyoriy)"
                  className="w-full rounded-xl border border-border bg-subtle/40 px-3 py-2 text-[14px] outline-none focus:border-foreground/30"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* Raqam klaviaturasi — o'ngdagi katta ✓ saqlaydi */
function Keypad({
  amount,
  onChange,
  color,
  onSubmit,
  keyHeight,
  keyFont,
}: {
  amount: number;
  onChange: (n: number) => void;
  color: string;
  onSubmit: () => void;
  keyHeight: number;
  keyFont: number;
}) {
  function press(key: string) {
    const s = String(amount || "");
    if (key === "del") return onChange(Number(s.slice(0, -1) || 0));
    onChange(Number((s + key).slice(0, 12)));
  }
  return (
    <div className="mt-3 grid grid-cols-4 gap-2 px-3 pb-1">
      {["1", "2", "3", "del", "4", "5", "6", "000", "7", "8", "9", "ok", "00", "0"].map((key) =>
        key === "ok" ? (
          <button
            key={key}
            onClick={() => amount > 0 && onSubmit()}
            disabled={amount <= 0}
            aria-label="Saqlash"
            className="row-span-2 grid place-items-center rounded-2xl text-white transition-opacity disabled:opacity-40"
            style={{ background: color }}
          >
            <Check className="size-8" strokeWidth={2.6} />
          </button>
        ) : (
          <button
            key={key}
            onClick={() => press(key)}
            aria-label={key === "del" ? "O'chirish" : undefined}
            className={cn(
              "grid place-items-center rounded-2xl font-medium tabular-nums transition-colors active:bg-hover",
              key === "del" || key === "000" ? "bg-subtle text-muted" : "bg-subtle/50"
            )}
            style={{ height: keyHeight, fontSize: keyFont }}
          >
            {key === "del" ? <Delete className="size-6" /> : key}
          </button>
        )
      )}
    </div>
  );
}

/* Summa — belgisiz. Faqat qo'shilgan/o'chirilgan oxirgi raqam animatsiya
   bo'ladi (o'ng chetda), qolganlari silliq suriladi. Har bir raqam key'ni
   tartib raqami (chapdan) bo'yicha oladi; minglik bo'shliq alohida element
   emas — guruh boshidagi raqamning chap chetidagi bo'sh joy, shuning uchun
   guruhlash o'zgarganda hech narsa kirib-chiqmaydi. */
function AnimatedAmount({ value, color, fontSize }: { value: number; color: string; fontSize: number }) {
  const digits = String(value).split("");
  const n = digits.length;
  return (
    <p
      className="relative flex font-semibold leading-none tabular-nums tracking-tight"
      style={{ color: value ? color : undefined, fontSize }}
      aria-live="polite"
      aria-label={`${formatSom(value)} so'm`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {digits.map((ch, i) => (
          <motion.span
            key={value ? `d${i}` : "zero"}
            layout="position"
            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            transition={{ type: "spring", damping: 28, stiffness: 420 }}
            className={cn("inline-block", !value && "text-faint/50")}
            style={{ marginLeft: i > 0 && (n - i) % 3 === 0 ? "0.28em" : 0 }}
          >
            {ch}
          </motion.span>
        ))}
      </AnimatePresence>
    </p>
  );
}
