"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMobileAdd } from "@/lib/mobile-add";
import { MonoHeader, MonoSave, MonoSheet, useIsMobile } from "./widgets/mono-sheet";
import { AnimatePresence, motion } from "framer-motion";
import { useBlurInputOnScrollOut } from "@/lib/use-blur-on-scroll-out";
import {
  Bot,
  Check,
  ChevronRight,
  ListChecks,
  Plus,
  Smartphone,
  X,
} from "lucide-react";
import type { QuickList } from "@/lib/tezkor-types";
import { useHydratedLists, useQuickLists } from "@/lib/tezkor-store";
import { defaultListName, parseListLines } from "@/lib/tezkor-utils";
import { cn } from "@/lib/utils";
import { ListLoader } from "./widgets/list-loader";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { startOfDay, toDateInputValue } from "@/lib/dates";
import { TezkorListDetail } from "./widgets/tezkor-list-detail";
import { TezkorListSheet } from "./widgets/tezkor-list-sheet";

export function TezkorView() {
  const {
    lists,
    createList,
    renameList,
    addItems,
    toggleItem,
    updateItemText,
    removeItem,
    removeList,
    completeList,
    reorderItems,
  } = useQuickLists();
  const hydrated = useHydratedLists();
  const mobile = useIsMobile();
  const Detail = mobile ? TezkorListSheet : TezkorListDetail;

  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  // Glass nav'dagi "+" shu sahifaning qo'shish oynasini ochadi (FAB yashiriladi).
  useMobileAdd(() => setShowCreate(true));
  const openList = openId ? lists.find((l) => l.id === openId) ?? null : null;

  // Sort: most recently updated first
  const sorted = useMemo(
    () => [...lists].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [lists]
  );

  return (
    <div
      data-scroll-lock-on-focus
      className="flex flex-col overflow-y-auto"
      style={{ height: "var(--tg-vh, 100vh)" }}
    >
      {/* Header */}
      <header className="hidden h-12 items-center justify-between gap-2 border-b border-border px-4 md:flex md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em] sm:text-[13px]">Tezkor</h1>
          <span className="truncate text-[13px] text-faint sm:text-[12px]">
            Tez ro&apos;yhatlar
          </span>
        </div>
        {lists.length > 0 && (
          <p className="shrink-0 font-mono text-[11px] tabular-nums text-faint">
            {lists.length}
          </p>
        )}
      </header>

      {/* Mobil sarlavha */}
      {lists.length > 0 && <MobileTitle lists={lists} />}

      {/* Content */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-32 pt-2 sm:px-6 md:pb-8 md:pt-8 lg:max-w-3xl xl:max-w-4xl">
        {/* Intro / empty state */}
        {!hydrated && lists.length === 0 ? (
          <ListLoader />
        ) : lists.length === 0 ? (
          <div className="rise-in rounded-lg border border-dashed border-border px-6 py-12 text-center sm:py-16">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-subtle text-faint">
              <ListChecks className="size-6" />
            </div>
            <p className="text-[15px] font-semibold text-foreground sm:text-[16px]">
              Tezkor ro&apos;yhatlar
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
              Yo&apos;lda esda saqlash kerak narsalar ko&apos;pmi? Har qatorga
              bittadan yozing — bir ro&apos;yhatga jam bo&apos;ladi.
            </p>
            {/* Desktop: asosiy text ostida kesik chiziqli qo'shish card (mobil FAB) */}
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mx-auto mt-6 hidden w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-[13.5px] font-medium text-faint transition-colors hover:border-border-strong hover:bg-hover hover:text-foreground md:flex"
            >
              <Plus className="size-4" />
              Yangi ro&apos;yhat qo&apos;shish
            </button>
          </div>
        ) : (
          <>
            {/* Desktop: yangi ro'yhat — kesik chiziqli card (mobil FAB ishlatadi) */}
            <div className="rise-in mb-6 hidden md:block">
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-[13.5px] font-medium text-faint transition-colors hover:border-border-strong hover:bg-hover hover:text-foreground"
              >
                <Plus className="size-4" />
                Yangi ro&apos;yhat qo&apos;shish
              </button>
            </div>

            <div className="rise-in hidden space-y-2.5 md:block" style={{ animationDelay: "60ms" }}>
              {sorted.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  onOpen={() => setOpenId(list.id)}
                />
              ))}
            </div>

            <div className="md:hidden">
              <MobileLists lists={sorted} onOpen={setOpenId} />
            </div>
          </>
        )}
      </div>

      <CreateListModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(name, items) => {
          createList({ name, items });
          setShowCreate(false);
        }}
      />

      <Detail
        list={openList}
        open={!!openList}
        onClose={() => setOpenId(null)}
        onRename={renameList}
        onAddItems={addItems}
        onToggleItem={toggleItem}
        onUpdateItemText={updateItemText}
        onRemoveItem={removeItem}
        onRemoveList={(id) => {
          removeList(id);
          setOpenId(null);
        }}
        onCompleteList={(id) => {
          completeList(id);
          setOpenId(null);
        }}
        onReorderItems={reorderItems}
      />
    </div>
  );
}

function MobileTitle({ lists }: { lists: QuickList[] }) {
  const total = lists.reduce((n, l) => n + l.items.length, 0);
  const done = lists.reduce((n, l) => n + l.items.filter((i) => i.done).length, 0);
  return (
    <div className="flex items-center justify-between px-4 pt-1 md:hidden">
      <h1 className="text-[22px] font-bold tracking-[-0.025em]">Tezkor</h1>
      <span className="rounded-full bg-subtle px-3 py-1.5 text-[13px] font-semibold tabular-nums">{done}/{total}</span>
    </div>
  );
}

function ProgressRing({ value, children }: { value: number; children: React.ReactNode }) {
  const size = 38;
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid size-[38px] shrink-0 place-items-center">
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--subtle)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--foreground)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)} className="transition-[stroke-dashoffset] duration-300" />
      </svg>
      {children}
    </span>
  );
}

/* Mobil: yangilangan kuni bo'yicha guruhlangan ixcham ro'yhat. */
function MobileLists({ lists, onOpen }: { lists: QuickList[]; onOpen: (id: string) => void }) {
  const today = toDateInputValue(startOfDay());
  const isToday = (l: QuickList) => toDateInputValue(new Date(l.updatedAt)) === today;
  const groups = [
    { label: "Bugun", rows: lists.filter(isToday) },
    { label: "Avvalroq", rows: lists.filter((l) => !isToday(l)) },
  ].filter((g) => g.rows.length > 0);

  return (
    <>
      {groups.map((g) => (
        <div key={g.label} className="mt-3">
          <p className="mb-1.5 px-1 text-[13px] font-semibold text-muted">{g.label}</p>
          <div className="overflow-hidden rounded-[22px] border border-border bg-surface">
            {g.rows.map((l, idx) => {
              const done = l.items.filter((i) => i.done).length;
              const left = l.items.filter((i) => !i.done).map((i) => i.text).join(", ");
              return (
                <button key={l.id} type="button" onClick={() => onOpen(l.id)} className={cn("flex w-full items-center gap-3 px-3.5 py-3 text-left", idx > 0 && "border-t border-border")}>
                  <ProgressRing value={l.items.length ? done / l.items.length : 0}>
                    {l.source === "bot" ? <Bot className="size-3.5 text-muted" /> : <Check className="size-3.5 text-muted" strokeWidth={3} />}
                  </ProgressRing>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold tracking-[-0.01em]">{l.name}</span>
                    <span className="block truncate text-[13px] text-faint">{left || (l.items.length ? "Hammasi bajarildi" : "Bo'sh ro'yhat")}</span>
                  </span>
                  <span className="shrink-0 text-[13px] tabular-nums text-muted">{done}/{l.items.length}</span>
                  <ChevronRight className="size-4 shrink-0 text-faint" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function ListCard({
  list,
  onOpen,
}: {
  list: QuickList;
  onOpen: () => void;
}) {
  const total = list.items.length;
  const done = list.items.filter((i) => i.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full overflow-hidden rounded-lg border border-border bg-surface p-3.5 text-left shadow-[0_1px_0_var(--border)] transition-colors hover:border-border-strong hover:bg-hover/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {list.source === "bot" ? (
              <Bot className="size-3 shrink-0 text-faint" />
            ) : (
              <Smartphone className="size-3 shrink-0 text-faint" />
            )}
            <p className="truncate text-[14.5px] font-medium tracking-[-0.005em] text-foreground sm:text-[14px]">
              {list.name}
            </p>
          </div>
          {total > 0 && (
            <p className="mt-1 truncate text-[12px] text-faint">
              {list.items.slice(0, 3).map((i) => i.text).join(", ")}
              {total > 3 && ` … +${total - 3}`}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right leading-none">
          <p className="font-mono text-[12.5px] tabular-nums text-foreground">
            {done}/{total}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
            {pct}%
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-subtle">
        <div
          className="h-full bg-foreground transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  );
}

function CreateListModal(props: { open: boolean; onClose: () => void; onCreate: (name: string, items: string[]) => void }) {
  const mobile = useIsMobile();
  if (!mobile) return <CreateListModalDesktop {...props} />;
  return (
    <MonoSheet open={props.open} onClose={props.onClose} label="Yangi ro'yhat">
      <CreateListMobile {...props} />
    </MonoSheet>
  );
}

/* Mobil: nom ixtiyoriy, narsalar qatorma-qator; qo'yilgan matn qatorlarga bo'linadi. */
function CreateListMobile({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, items: string[]) => void }) {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<{ id: number; text: string }[]>([]);
  const [text, setText] = useState("");
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);

  function push(lines: string[]) {
    setRows((all) => [...all, ...lines.map((line) => ({ id: nextId.current++, text: line }))]);
    setText("");
  }
  const items = [...rows.map((r) => r.text.trim()), text.trim()].filter(Boolean);

  return (
    <>
      <MonoHeader label="Yangi ro'yhat" value={name} onChange={setName} placeholder="Nom (ixtiyoriy)" onClose={onClose} autoFocus={false} />
      <div className="rounded-[24px] border border-border bg-surface px-4 py-2">
        {rows.map((r) => (
          <div key={r.id} className="flex h-11 items-center gap-2 border-b border-border">
            <input
              value={r.text}
              onChange={(e) => setRows((all) => all.map((x) => (x.id === r.id ? { ...x, text: e.target.value } : x)))}
              aria-label="Narsa"
              className="min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none"
            />
            <button type="button" onClick={() => setRows((all) => all.filter((x) => x.id !== r.id))} aria-label="O'chirish" className="grid size-8 shrink-0 place-items-center rounded-full text-faint">
              <X className="size-4" />
            </button>
          </div>
        ))}
        <div className="flex h-11 items-center gap-2">
          <Plus className="size-5 shrink-0 text-faint" />
          <input
            ref={inputRef}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) {
                e.preventDefault();
                push([text.trim()]);
              }
            }}
            onPaste={(e) => {
              const lines = parseListLines(e.clipboardData.getData("text"));
              if (lines.length > 1) {
                e.preventDefault();
                push(lines);
              }
            }}
            enterKeyHint="next"
            placeholder={rows.length ? "Yana nima?" : "Birinchi narsani yozing yoki qo'ying"}
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint"
          />
        </div>
      </div>
      <p className="flex items-center justify-center gap-1.5 py-1 text-[12.5px] text-faint">
        <Bot className="size-3.5" /> Botga matn yuborsangiz ham ro&apos;yhat bo&apos;ladi
      </p>
      <MonoSave disabled={items.length === 0} onClick={() => onCreate(name.trim() || defaultListName(), items)}>
        {items.length > 0 ? `${items.length} ta bilan saqlash` : "Saqlash"}
      </MonoSave>
    </>
  );
}

function CreateListModalDesktop({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, items: string[]) => void;
}) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  useBlurInputOnScrollOut(cardRef, open);

  useScrollLock(open);

  // Reset fields when modal opens — autoFocus on textarea pops keyboard
  // synchronously within the user-gesture window (same trick as Bugun).
  useEffect(() => {
    if (!open) return;
    setName("");
    setBody("");
  }, [open]);

  function submit() {
    const items = body
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) return;
    const finalName = name.trim() || defaultListName();
    onCreate(finalName, items);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[3px]"
          />
          <div
            className="fixed inset-0 z-50 flex items-start justify-center px-4 sm:items-center"
            style={{ paddingTop: "var(--modal-safe-top-roomy)" }}
            onClick={onClose}
          >
            <motion.div
              ref={cardRef}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 360 }}
              onClick={(e) => e.stopPropagation()}
              // Cap height to the live visual viewport (–8rem) so when the
              // keyboard opens the modal body becomes scrollable and the
              // footer (Saqlash) stays reachable instead of falling off-screen.
              className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
              style={{ maxHeight: "calc(var(--tg-vh, 100vh) - 8rem)" }}
            >
              <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
                <p className="text-[15px] font-semibold tracking-[-0.01em]">
                  Yangi ro&apos;yhat
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Yopish"
                  className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </header>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nom (ixtiyoriy) — masalan, Bozor ro'yhati"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] placeholder:text-faint focus:border-border-strong focus:outline-none"
                  />
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={7}
                    autoFocus
                    placeholder={"Har qatorga bitta narsa:\n\nBodring\nPomidor\nGugurt"}
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[14px] leading-relaxed placeholder:text-faint focus:border-border-strong focus:outline-none"
                  />
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-subtle/30 px-5 py-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-hover hover:text-foreground"
                  >
                    Bekor
                  </button>
                  <button
                    type="submit"
                    disabled={!body.trim()}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-opacity",
                      body.trim()
                        ? "bg-accent text-accent-ink hover:opacity-90"
                        : "cursor-not-allowed bg-foreground/40 text-background"
                    )}
                  >
                    <Check className="size-3.5" />
                    Saqlash
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
