"use client";

import { createElement, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
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

/* Klaviatura ochilganda (izoh) oyna uning ustiga ko'tariladi. */
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
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
  const inset = useKeyboardInset();
  const k = kindOf(type);

  // Ko'p ishlatilgan kategoriya birinchi (TxnDialog bilan bir xil tartib).
  const typeCats = useMemo(() => {
    const usage = new Map<string, number>();
    for (const t of transactions) if (t.categoryId) usage.set(t.categoryId, (usage.get(t.categoryId) ?? 0) + 1);
    return categories
      .filter((c) => c.type === type)
      .slice()
      .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0));
  }, [categories, transactions, type]);
  const cat = categories.find((c) => c.id === categoryId);

  function setType(t: TransactionType) {
    setTypeRaw(t);
    setCategoryId(null);
    setCreatingCat(false);
    setStep(0);
  }
  function save(catId: string | null) {
    if (amount <= 0) return;
    onCreate({ type, amount, categoryId: catId, note: note.trim() || undefined, date });
  }

  // Kategoriya (yoki kategoriyasiz) tanlandi → summa bosqichi.
  function chooseCategory(id: string | null) {
    setCategoryId(id);
    setStep(1);
  }
  const back = () => (step === 0 ? onClose() : setStep(0));

  const amountText = (
    <span className={cn(!amount && "text-faint/50")}>
      {type === "INCOME" ? "+" : "−"}{formatSom(amount)}
    </span>
  );

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={SHEET}
      role="dialog"
      aria-label={`Yangi ${k.label.toLowerCase()}`}
      className="fixed inset-x-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[32px] border-t border-border bg-surface md:hidden"
      style={{ bottom: inset, paddingBottom: inset ? 12 : "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      <span className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-faint/50" />

      {/* Sarlavha: orqaga/yopish · tur · progress */}
      <div className="flex shrink-0 items-center gap-2 px-4 pt-2">
        <button onClick={back} aria-label={step === 0 ? "Yopish" : "Orqaga"} className="grid size-8 shrink-0 place-items-center rounded-full bg-subtle text-muted">
          {step === 0 ? <X className="size-4" /> : <ArrowLeft className="size-4" />}
        </button>
        <div className="flex flex-1 justify-center">
          <div className="flex rounded-full bg-subtle p-0.5">
            {KINDS.map((x) => {
              const on = type === x.id;
              return (
                <button key={x.id} onClick={() => setType(x.id)} className={cn("relative flex items-center gap-1 rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors", on ? "text-white" : "text-muted")}>
                  {on && <motion.span layoutId="qa-type" transition={SPRING} className="absolute inset-0 rounded-full" style={{ background: x.color }} />}
                  <span className="relative flex items-center gap-1"><x.icon className="size-3.5" strokeWidth={2.4} /> {x.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <span className="size-8 shrink-0" />
      </div>
      <div className="mx-auto mt-2.5 grid w-24 shrink-0 grid-cols-2 gap-1">
        {[0, 1].map((i) => (
          <span key={i} className="h-1 overflow-hidden rounded-full bg-subtle">
            <motion.span className="block h-full rounded-full" style={{ background: k.color }} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.3 }} />
          </span>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={step}
            initial={{ x: step ? 60 : -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: step ? 60 : -60, opacity: 0 }}
            transition={SPRING}
            className="flex flex-col"
          >
            {/* 2-bosqich: tanlangan kategoriya sarlavhada (bosilsa qaytadi) */}
            {step === 1 && (
              <button onClick={() => setStep(0)} className="mx-4 mt-3 flex items-center gap-3 rounded-2xl px-2.5 py-2 text-left" style={{ background: cat ? colorWithAlpha(cat.color, 0.12) : "var(--subtle)" }}>
                {cat ? <CatBadge c={cat} layoutId={`qa-cat-${cat.id}`} size="sm" /> : (
                  <span className="grid size-10 place-items-center rounded-xl bg-surface text-faint"><Tag className="size-5" /></span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] uppercase tracking-[0.12em]" style={{ color: k.color }}>{k.label}</span>
                  <span className="block truncate text-[15px] font-semibold">{cat?.label ?? "Kategoriyasiz"}</span>
                </span>
                <span className="pr-1 text-[12px] text-faint">o&apos;zgartirish</span>
              </button>
            )}

            {/* Sana / izoh — kerak bo'lsa ochiladi */}
            {step === 1 && (
              <DateNote date={date} setDate={setDate} note={note} setNote={setNote} panel={panel} setPanel={setPanel} />
            )}

            {step === 0 ? (
              <>
                <p className="mt-3 px-4 text-center text-[17px] font-semibold">
                  {type === "INCOME" ? "Pul qayerdan keldi?" : "Nimaga sarfladingiz?"}
                </p>
                {creatingCat ? (
                  <div className="px-4 pb-2">
                    {renderCategoryForm(
                      type,
                      (id) => { setCreatingCat(false); chooseCategory(id); },
                      () => setCreatingCat(false)
                    )}
                  </div>
                ) : (
                  <CategoryGrid cats={typeCats} onPick={(c) => chooseCategory(c.id)} />
                )}
                {!creatingCat && (
                  <div className="mt-2 flex items-center justify-between px-4 pb-1">
                    <button onClick={() => setCreatingCat(true)} className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-[12.5px] text-faint">
                      <Plus className="size-3.5" /> Yangi kategoriya
                    </button>
                    <button onClick={() => chooseCategory(null)} className="flex items-center gap-1 text-[12.5px] font-medium text-faint">
                      Kategoriyasiz <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="px-5 pt-3 text-center">
                  <motion.p className="font-mono text-[42px] font-semibold leading-none tabular-nums tracking-tight" style={{ color: amount ? k.color : undefined }}>
                    {amountText}
                  </motion.p>
                  <p className="mt-1.5 text-[12px] text-faint">so&apos;m</p>
                </div>
                <div className="mt-3 flex justify-center gap-1.5 px-4">
                  {[10_000, 50_000, 100_000, 500_000].map((v) => (
                    <button key={v} onClick={() => setAmount((a) => Math.min(a + v, 999_999_999_999))} className="rounded-full border border-border px-2.5 py-1 text-[12px] text-muted active:bg-hover">
                      +{v / 1000}k
                    </button>
                  ))}
                </div>
                <Keypad amount={amount} onChange={setAmount} color={k.color} onSubmit={() => save(categoryId)} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function CatBadge({ c, layoutId, size = "lg" }: { c: FinanceCategory; layoutId?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <motion.span
      layoutId={layoutId}
      className={cn(
        "grid shrink-0 place-items-center text-white",
        size === "lg" ? "size-[84px] rounded-[28px] shadow-[0_14px_30px_-12px_rgba(0,0,0,0.45)]" : size === "md" ? "size-10 rounded-xl" : "size-10 rounded-xl"
      )}
      style={{ background: catGradient(c) }}
    >
      {createElement(financeIcon(c.icon), { className: size === "lg" ? "size-9" : "size-5", strokeWidth: size === "lg" ? 1.9 : 2 })}
    </motion.span>
  );
}

/* Avval kategoriya: 2 ustunli plitkalar (bosilganda sarlavhaga morf) */
function CategoryGrid({ cats, onPick }: { cats: FinanceCategory[]; onPick: (c: FinanceCategory) => void }) {
  if (!cats.length) return <EmptyCats />;
  return (
    <div className="grid grid-cols-2 gap-2 px-4 pt-3">
      {cats.map((c) => (
        <button key={c.id} onClick={() => onPick(c)} className="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3 text-left active:scale-[0.98]" style={{ background: colorWithAlpha(c.color, 0.1) }}>
          <CatBadge c={c} layoutId={`qa-cat-${c.id}`} size="md" />
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
        <button onClick={() => setPanel(panel === "note" ? null : "note")} className={cn("flex min-w-0 flex-1 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px]", panel === "note" ? "border-foreground/30 bg-hover" : "border-border text-muted")}>
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
}: {
  amount: number;
  onChange: (n: number) => void;
  color: string;
  onSubmit: () => void;
}) {
  function press(key: string) {
    const s = String(amount || "");
    if (key === "del") return onChange(Number(s.slice(0, -1) || 0));
    onChange(Number((s + key).slice(0, 12)));
  }
  return (
    <div className="mt-3 grid grid-cols-4 gap-1.5 px-3 pb-1">
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
            <Check className="size-7" strokeWidth={2.6} />
          </button>
        ) : (
          <button
            key={key}
            onClick={() => press(key)}
            aria-label={key === "del" ? "O'chirish" : undefined}
            className={cn(
              "grid h-12 place-items-center rounded-2xl text-[20px] font-medium tabular-nums active:bg-hover",
              key === "del" || key === "000" ? "bg-subtle text-muted" : "bg-subtle/50"
            )}
          >
            {key === "del" ? <Delete className="size-5" /> : key}
          </button>
        )
      )}
    </div>
  );
}
