"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Bot, Check, MoreHorizontal, X } from "lucide-react";
import type { QuickList } from "@/lib/tezkor-types";
import { parseListLines } from "@/lib/tezkor-utils";
import { playOnComplete } from "@/lib/sounds";
import { useKeyboardArea } from "@/lib/use-keyboard-area";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-dialog";

const LONG_PRESS_MS = 350;
const MOVE_TOLERANCE = 8;

type Props = {
  list: QuickList | null;
  open: boolean;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onAddItems: (id: string, texts: string[]) => void;
  onToggleItem: (itemId: string) => void;
  onUpdateItemText: (itemId: string, text: string) => void;
  onRemoveItem: (itemId: string) => void;
  onRemoveList: (id: string) => void;
  onCompleteList: (id: string) => void;
  onReorderItems: (listId: string, orderedIds: string[]) => void;
};

function haptic() {
  try {
    (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (s: string) => void } } } })
      .Telegram?.WebApp?.HapticFeedback?.impactOccurred("medium");
  } catch { /* old clients */ }
}

/* Qatorni uzoq bosib sudrash. Touch hodisalari: faqat ular orqali brauzer
   aylantirishini sudrash boshlangandan keyin ham to'xtatish mumkin. */
function useLongPressReorder(ref: React.RefObject<HTMLElement | null>, onMove: (id: string, beforeId: string) => void) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const onMoveRef = useRef(onMove);
  useEffect(() => { onMoveRef.current = onMove; });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    let startX = 0;
    let startY = 0;
    let dragging: string | null = null;
    let over: string | null = null;

    function clear() {
      window.clearTimeout(timer);
      timer = 0;
    }
    function onStart(e: TouchEvent) {
      const row = (e.target as HTMLElement).closest?.("[data-reorder-id]") as HTMLElement | null;
      if (!row || (e.target as HTMLElement).closest("button,input") || e.touches.length > 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      const id = row.dataset.reorderId ?? null;
      timer = window.setTimeout(() => {
        dragging = id;
        setDragId(id);
        haptic();
      }, LONG_PRESS_MS);
    }
    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!dragging) {
        if (Math.hypot(t.clientX - startX, t.clientY - startY) > MOVE_TOLERANCE) clear();
        return;
      }
      e.preventDefault();
      const hit = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
      const id = (hit?.closest?.("[data-reorder-id]") as HTMLElement | null)?.dataset.reorderId ?? null;
      if (id !== over) {
        over = id;
        setOverId(id);
      }
    }
    function onEnd(e: TouchEvent) {
      clear();
      if (!dragging) return;
      // Bosib turishdan keyingi click matnni tahrirlashga o'tkazmasin.
      if (e.cancelable) e.preventDefault();
      if (over && over !== dragging) onMoveRef.current(dragging, over);
      dragging = null;
      over = null;
      setDragId(null);
      setOverId(null);
    }
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      clear();
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [ref]);

  return { dragId, overId };
}

function ItemRow({ text, done, onToggle, onUpdate, onRemove }: { text: string; done: boolean; onToggle: () => void; onUpdate: (t: string) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  function commit() {
    const next = draft.trim();
    if (next && next !== text) onUpdate(next);
    else setDraft(text);
    setEditing(false);
  }

  return (
    <div className="flex min-h-12 items-center gap-1">
      <button type="button" onClick={onRemove} aria-label="O'chirish" className="-ml-1.5 grid size-8 shrink-0 place-items-center rounded-full text-faint active:text-danger">
        <X className="size-4" />
      </button>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          enterKeyHint="done"
          aria-label="Narsa"
          className="min-w-0 flex-1 bg-transparent py-2 pl-1 text-[16px] outline-none"
        />
      ) : (
        <span
          onClick={() => { setDraft(text); setEditing(true); }}
          className={cn("min-w-0 flex-1 select-none py-2 pl-1 text-[16px] leading-snug [-webkit-touch-callout:none]", done && "text-faint line-through decoration-faint/60")}
        >
          {text}
        </span>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? "Bekor qilish" : "Bajarildi"}
        className={cn("grid size-[26px] shrink-0 place-items-center rounded-full border-2 transition-colors", done ? "border-accent bg-accent text-accent-ink" : "border-border-strong")}
      >
        {done && <Check className="size-3.5" strokeWidth={3.5} />}
      </button>
    </div>
  );
}

function Panel({ list, onClose, onRename, onAddItems, onToggleItem, onUpdateItemText, onRemoveItem, onRemoveList, onCompleteList, onReorderItems }: Props & { list: QuickList }) {
  useScrollLock(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const area = useKeyboardArea(panelRef, true);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(list.name);
  const [text, setText] = useState("");
  const [removing, setRemoving] = useState(false);

  const done = list.items.filter((i) => i.done).length;
  const total = list.items.length;

  const { dragId, overId } = useLongPressReorder(listRef, (id, beforeId) => {
    const ids = list.items.map((i) => i.id);
    const from = ids.indexOf(id);
    const to = ids.indexOf(beforeId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    onReorderItems(list.id, ids);
  });

  function add(texts: string[]) {
    if (texts.length === 0) return;
    onAddItems(list.id, texts);
    setText("");
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
  function commitName() {
    const next = nameDraft.trim();
    if (next && next !== list.name) onRename(list.id, next);
    else setNameDraft(list.name);
    setRenaming(false);
  }

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={list.name}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 28, transition: { duration: 0.16, ease: "easeIn" } }}
      transition={{ type: "spring", stiffness: 460, damping: 40 }}
      className="fixed inset-x-0 z-[60] flex flex-col bg-background px-4"
      style={{
        top: area.top,
        height: area.visibleHeight === null ? "var(--tg-vh, 100dvh)" : area.visibleHeight,
        paddingTop: "var(--modal-safe-top)",
        paddingBottom: area.typing ? 8 : "max(12px, env(safe-area-inset-bottom))",
      }}
    >
      <header className="relative shrink-0">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[12.5px] font-semibold text-muted">
              {list.source === "bot" && <Bot className="size-3.5" />}
              {list.source === "bot" ? "Botdan" : "Ilovadan"} · {done}/{total}
            </p>
            {renaming ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                enterKeyHint="done"
                aria-label="Ro'yhat nomi"
                className="mt-0.5 w-full bg-transparent text-[24px] font-bold tracking-[-0.025em] outline-none"
              />
            ) : (
              <h2 className="mt-0.5 truncate text-[24px] font-bold tracking-[-0.025em]">{list.name}</h2>
            )}
          </div>
          <button type="button" onClick={() => setMenu((v) => !v)} aria-label="Amallar" aria-expanded={menu} className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle">
            <MoreHorizontal className="size-5" />
          </button>
          <button type="button" onClick={onClose} aria-label="Yopish" className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
            <X className="size-5" strokeWidth={2.4} />
          </button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle">
          <motion.div className="h-full rounded-full bg-foreground" initial={false} animate={{ width: `${total ? (done / total) * 100 : 0}%` }} transition={{ duration: 0.3 }} />
        </div>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-12 top-11 z-20 w-52 overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-xl">
              <button type="button" onClick={() => { setMenu(false); setNameDraft(list.name); setRenaming(true); }} className="flex h-11 w-full items-center px-4 text-left text-[14.5px] font-medium">Nomini o&apos;zgartirish</button>
              <button type="button" onClick={() => { setMenu(false); playOnComplete(); onCompleteList(list.id); }} className="flex h-11 w-full items-center px-4 text-left text-[14.5px] font-medium">Bajardim</button>
              <button type="button" onClick={() => { setMenu(false); setRemoving(true); }} className="flex h-11 w-full items-center px-4 text-left text-[14.5px] font-medium text-danger">O&apos;chirish</button>
            </div>
          </>
        )}
      </header>

      <div ref={listRef} className={cn("mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain", dragId && "touch-none")}>
        {list.items.map((item) => (
          <div
            key={item.id}
            data-reorder-id={item.id}
            className={cn(
              "border-b border-border/60 transition-[background-color,box-shadow,transform] duration-150",
              dragId === item.id && "relative z-10 scale-[1.02] rounded-xl bg-surface shadow-lg",
              overId === item.id && dragId !== item.id && "shadow-[inset_0_2px_0_var(--foreground)]"
            )}
          >
            <ItemRow
              text={item.text}
              done={item.done}
              onToggle={() => {
                if (!item.done) playOnComplete();
                onToggleItem(item.id);
              }}
              onUpdate={(t) => onUpdateItemText(item.id, t)}
              onRemove={() => onRemoveItem(item.id)}
            />
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); add(parseListLines(text)); }}
        className="mt-2 flex shrink-0 items-center gap-2 rounded-[22px] bg-subtle py-1.5 pl-4 pr-1.5"
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const lines = parseListLines(e.clipboardData.getData("text"));
            if (lines.length > 1) {
              e.preventDefault();
              add(lines);
            }
          }}
          enterKeyHint="send"
          placeholder="Yana nima kerak?"
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint"
        />
        <button type="submit" onMouseDown={(e) => e.preventDefault()} aria-label="Qo'shish" disabled={!text.trim()} className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition-opacity disabled:opacity-30">
          <ArrowUp className="size-5" strokeWidth={2.6} />
        </button>
      </form>

      <ConfirmDialog
        open={removing}
        title="Ro'yhat o'chirilsinmi?"
        description="30 kun davomida tiklash mumkin."
        confirmLabel="O'chirish"
        destructive
        onConfirm={() => { setRemoving(false); onRemoveList(list.id); }}
        onClose={() => setRemoving(false)}
      />
    </motion.div>
  );
}

const noopSubscribe = () => () => {};

/** Mobil: ro'yhat butun ekranda ochiladi, nav ham yopiladi, faqat × bilan chiqiladi. */
export function TezkorListSheet(props: Props) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {props.open && props.list && <Panel key={props.list.id} {...props} list={props.list} />}
    </AnimatePresence>,
    document.body
  );
}
