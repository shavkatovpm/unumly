"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, CornerDownRight, FileText, ListChecks, MoreVertical, Pencil, Plus, Table2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePages } from "@/lib/pages-store";
import type { Page } from "@/lib/types";
import type { PartialBlock } from "@blocknote/core";
import { ListLoader } from "../widgets/list-loader";
import { useConfirmRemove } from "../widgets/confirm-dialog";
import { PageIcon } from "./page-icons";
import { PageIconPicker } from "./page-icon-picker";

// BlockNote DOM'ni og'ir manipulyatsiya qiladi — faqat mijoz tomonda,
// SSR paytida hydration mos kelmasligining oldini olish uchun.
// Skeleton BlockNote blokining chap "gutter" bo'shlig'iga (drag-handle/
// add-block joyi uchun ~54px) mos qilib suriladi — aks holda haqiqiy
// kontent kelganda matn skeletonga nisbatan o'ngga siljib ko'rinardi.
const BlockNoteEditor = dynamic(
  () => import("../widgets/block-note-editor").then((m) => m.BlockNoteEditor),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse space-y-3 pl-[54px]">
        <div className="h-8 w-2/5 rounded-md bg-subtle/60" />
        <div className="h-4 w-full rounded bg-subtle/50" />
        <div className="h-4 w-5/6 rounded bg-subtle/50" />
      </div>
    ),
  }
);

const SLIDE_VARIANTS = {
  enter: (dir: number) => ({ x: dir > 0 ? "4%" : "-4%", opacity: 0 }),
  center: { x: "0%", opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-4%" : "4%", opacity: 0 }),
};

/** `draggedId`ni `beforeId`dan oldinga (yoki `null` bo'lsa oxiriga) ko'chiradi.
 *  O'zgarish bo'lmasa (allaqachon o'sha joyda) xuddi shu massiv referensiyasini
 *  qaytaradi — bekorga qayta render/animatsiya bo'lmasligi uchun. */
function moveBeforeId(ids: string[], draggedId: string, beforeId: string | null): string[] {
  const rest = ids.filter((id) => id !== draggedId);
  let next: string[];
  if (beforeId === null) {
    next = [...rest, draggedId];
  } else {
    const to = rest.indexOf(beforeId);
    next = to < 0 ? ids : [...rest.slice(0, to), draggedId, ...rest.slice(to)];
  }
  if (next.length === ids.length && next.every((id, i) => id === ids[i])) return ids;
  return next;
}

/** Loyihaning "Hujjatlar" ko'rinishi — cheksiz ichma-ich sahifalar, har biri
 *  BlockNote bilan tahrirlanadigan erkin hujjat (TZ, checklist, jadval —
 *  hammasi bitta joyda). Modal/sheet emas — sahifaga bosilganda xuddi papka
 *  ichiga kirgandek, o'sha sahifaning o'ziga "kiriladi" (drill-down
 *  navigatsiya); uning ichidan yana bo'lim sahifa ochish mumkin, va h.k. —
 *  cheksiz chuqurlikda. */
export function HujjatlarPanel({ projectId }: { projectId: string }) {
  const { pages, hydrated, create, update, remove, reorder } = usePages(projectId);
  const [path, setPath] = useState<string[]>([]);
  const [dir, setDir] = useState(0);
  // PageCard'ning "⋯" menyusidagi "Ostidan bo'lim sahifa" bosilganda: shu
  // sahifa ichiga kiriladi va u yerdagi PageView mount bo'lishi bilan o'zining
  // "bo'lim sahifa qo'shish" inputini avtomatik ochadi (autoStartCreatingChild).
  const [autoCreateChildFor, setAutoCreateChildFor] = useState<string | null>(null);

  // BlockNote'ning JS/CSS bo'lagini foydalanuvchi biror sahifani ochishidan
  // ancha oldin, Hujjatlar tabiga kirilgan zahoti oldindan yuklab qo'yamiz —
  // aks holda har safar sahifa ichiga kirilganda skeleton bir muddat
  // ko'rinib, so'ng haqiqiy kontent balandligi boshqacha bo'lgani uchun
  // pastdagi "Bo'lim sahifalar" bo'limi sakrab joylashardi.
  useEffect(() => {
    import("../widgets/block-note-editor");
  }, []);

  // Joriy (yo'ldagi oxirgi) sahifa o'chirilgan bo'lsa — avtomatik bir
  // qadam orqaga qaytamiz (o'chirish o'z sahifasi ichidan bosiladi).
  useEffect(() => {
    if (path.length === 0) return;
    const lastId = path[path.length - 1];
    if (!pages.some((p) => p.id === lastId)) {
      setDir(-1);
      setPath((prev) => prev.slice(0, -1));
    }
  }, [pages, path]);

  const roots = pages.filter((p) => !p.parentId).sort((a, b) => a.order - b.order);
  const currentId = path[path.length - 1] ?? null;
  const current = pages.find((p) => p.id === currentId) ?? null;

  const confirmItems = pages.map((p) => ({ id: p.id, title: p.title }));
  const { askRemove, confirmEl } = useConfirmRemove(confirmItems, remove, {
    itemLabel: "Sahifani",
    description: '"{title}" va uning ichidagi barcha bo\'lim sahifalar o\'chiriladi.',
  });

  function childCount(id: string) {
    return pages.filter((p) => p.parentId === id).length;
  }

  function openPage(id: string) {
    setDir(1);
    setPath((prev) => [...prev, id]);
  }

  function goBack() {
    setDir(-1);
    setPath((prev) => prev.slice(0, -1));
  }

  function requestAddChild(id: string) {
    openPage(id);
    setAutoCreateChildFor(id);
  }

  if (!hydrated) return <ListLoader />;

  return (
    <div className="mx-auto max-w-2xl overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:max-w-4xl xl:max-w-5xl">
      {/* mode="wait" — aks holda eski va yangi ko'rinish bir lahza bir vaqtda
          layout'da qolib, konteyner balandligi vaqtincha o'sib-pasayib
          "sakrab" ko'rinardi. */}
      <AnimatePresence initial={false} custom={dir} mode="wait">
        {current ? (
          <motion.div
            key={current.id}
            custom={dir}
            variants={SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <PageView
              page={current}
              pages={pages}
              childCount={childCount}
              onBack={goBack}
              onUpdate={update}
              onOpenChild={openPage}
              onCreateChild={(title) => create({ parentId: current.id, title })}
              onRemove={() => askRemove(current.id)}
              onRemoveChild={askRemove}
              onReorderChildren={reorder}
              onRequestAddChild={requestAddChild}
              autoStartCreatingChild={autoCreateChildFor === current.id}
              onConsumedAutoStart={() => setAutoCreateChildFor(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="root"
            custom={dir}
            variants={SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <RootList
              roots={roots}
              childCount={childCount}
              onOpen={openPage}
              onCreate={(title) => create({ parentId: null, title })}
              onUpdate={update}
              onRemove={askRemove}
              onReorder={reorder}
              onRequestAddChild={requestAddChild}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {confirmEl}
    </div>
  );
}

/** Sahifa kartasi (root ro'yxatda ham, "Bo'lim sahifalar"da ham ishlatiladi).
 *  Ustiga bosilsa sahifa ichiga kiradi; ustidan hover qilinganda (mobil'da
 *  doim ko'rinadi) "⋯" tugmasi chiqadi — undan "Tahrirlash" (nomni shu
 *  yerning o'zida, navigatsiyasiz o'zgartirish) va "O'chirish" mumkin.
 *
 *  Xuddi shu "⋯" tugma — drag-handle. Tortish boshlanganda karta grid
 *  oqimidan butunlay "chiqarib olinadi": o'z joyida faqat ko'rinmas
 *  (bo'sh, lekin o'lchamni saqlaydigan) joy qoladi, haqiqiy karta esa
 *  portal orqali document.body'ga chiqarilib, `position:fixed` bilan
 *  bevosita barmoq/kursorga ergashadi. Shu tufayli grid layout bilan hech
 *  qanday transform to'qnashuvi bo'lmaydi — qo'shnilar `layout` bilan
 *  silliq joy bo'shatadi, qo'yilganda esa karta faqat BITTA marta, aynan
 *  o'zining yangi katagiga tekis "tushadi". Oddiy bosish esa hamon
 *  menyuni ochadi. */
function PageCard({
  page,
  count,
  compact,
  dragging,
  onOpen,
  onRename,
  onRemove,
  onAddSibling,
  onAddChild,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  page: Page;
  count: number;
  compact?: boolean;
  dragging: boolean;
  onOpen: () => void;
  onRename: (title: string) => void;
  onRemove: () => void;
  onAddSibling: () => void;
  onAddChild: () => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, clientX: number, clientY: number) => void;
  onDragEnd: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(page.title);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [ghost, setGhost] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const grabOffsetRef = useRef({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function startRename() {
    setDraft(page.title);
    setMenuOpen(false);
    setRenaming(true);
  }
  function confirmRename() {
    const t = draft.trim();
    setRenaming(false);
    if (t && t !== page.title) onRename(t);
  }
  function cancelRename() {
    setRenaming(false);
  }

  // Global (document-level) pointer listeners — tinglagichlar shu yerning
  // o'zida, POINTERDOWN paytida SINXRON ravishda ulanadi (React effect
  // orqali emas — aks holda tez bosish/qo'yib yuborish effect ulanishidan
  // oldin tugab, hodisa hech qachon "ushlanmasdan" menyu ochilishiga
  // (klikka) xalaqit berardi). Sichqoncha uchun ozgina masofa, sensorli
  // qurilma uchun qisqa ushlab turish — aks holda oddiy bosish ham
  // "tortish" sifatida boshlanib, menyuni ochishga to'sqinlik qilardi.
  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const measuredRect = rootRef.current?.getBoundingClientRect();
    if (!measuredRect) return;
    const rect = measuredRect;
    const startX = e.clientX;
    const startY = e.clientY;
    const isMouse = e.pointerType === "mouse";
    grabOffsetRef.current = { x: startX - rect.left, y: startY - rect.top };

    let started = false;
    let holdTimer: number | null = null;

    function begin() {
      if (started) return;
      started = true;
      if (holdTimer !== null) window.clearTimeout(holdTimer);
      setGhost({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
      setIsDragging(true);
      onDragStart(page.id);
    }

    function onMove(ev: PointerEvent) {
      if (!started) {
        const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        if (isMouse && dist >= 4) begin();
        return;
      }
      ev.preventDefault();
      setGhost((g) => (g ? { ...g, left: ev.clientX - grabOffsetRef.current.x, top: ev.clientY - grabOffsetRef.current.y } : g));
      onDragMove(page.id, ev.clientX, ev.clientY);
    }
    function onUp() {
      if (holdTimer !== null) window.clearTimeout(holdTimer);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      if (started) {
        setIsDragging(false);
        setGhost(null);
        onDragEnd();
      }
    }

    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);

    if (!isMouse) {
      holdTimer = window.setTimeout(begin, 150);
    }
  }

  const cardCls = cn(
    "group relative flex items-center border transition-colors",
    compact ? "gap-1 rounded-lg pr-1" : "gap-1 rounded-xl pr-1.5",
    "border-border bg-surface hover:border-border-strong hover:bg-hover"
  );

  return (
    <>
      <motion.div
        layout
        ref={rootRef}
        data-reorder-id={page.id}
        transition={{ type: "spring", stiffness: 520, damping: 42 }}
        className={cn(dragging && "invisible")}
      >
        {renaming ? (
          <div
            className={cn(
              "flex items-center border border-accent bg-surface",
              compact ? "gap-2.5 rounded-lg px-3 py-2.5" : "gap-3 rounded-xl px-3.5 py-3"
            )}
          >
            {compact ? (
              <PageIcon k={page.icon} className="size-3.5 shrink-0 text-faint" />
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-subtle text-faint">
                <PageIcon k={page.icon} className="size-4" />
              </span>
            )}
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={confirmRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); confirmRename(); }
                if (e.key === "Escape") cancelRename();
              }}
              placeholder="Nomsiz"
              className={cn(
                "min-w-0 flex-1 bg-transparent font-medium text-foreground outline-none placeholder:text-faint",
                compact ? "text-[13px]" : "text-[14px]"
              )}
            />
          </div>
        ) : (
          <div className={cardCls}>
            <button
              type="button"
              onClick={onOpen}
              className={cn(
                "flex min-w-0 flex-1 items-center text-left",
                compact ? "gap-2.5 py-2.5 pl-3" : "gap-3 py-3 pl-3.5"
              )}
            >
              {compact ? (
                <PageIcon k={page.icon} className="size-3.5 shrink-0 text-faint" />
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-subtle text-faint">
                  <PageIcon k={page.icon} className="size-4" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate font-medium", compact ? "text-[13px]" : "text-[14px]")}>
                  {page.title || "Nomsiz"}
                </span>
                {!compact && count > 0 && (
                  <span className="text-[11.5px] text-faint">{count} bo&apos;lim sahifa</span>
                )}
              </span>
              {compact && count > 0 && <span className="shrink-0 text-[11px] text-faint">{count}</span>}
              <ChevronRight className={cn(compact ? "size-3.5" : "size-4", "shrink-0 text-faint")} />
            </button>
            <div className="relative shrink-0">
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                onPointerDown={handlePointerDown}
                aria-label="Ko'proq / tartibni o'zgartirish"
                data-open={menuOpen || undefined}
                className="grid size-7 shrink-0 touch-none place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground active:cursor-grabbing sm:cursor-grab sm:opacity-0 sm:group-hover:opacity-100 sm:data-[open]:opacity-100"
              >
                <MoreVertical className="size-4" />
              </button>
              <PageCardMenu
                open={menuOpen}
                triggerRef={triggerRef}
                onClose={() => setMenuOpen(false)}
                onRename={startRename}
                onRemove={() => { setMenuOpen(false); onRemove(); }}
                onAddSibling={() => { setMenuOpen(false); onAddSibling(); }}
                onAddChild={() => { setMenuOpen(false); onAddChild(); }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {mounted && ghost && createPortal(
        <div
          style={{
            position: "fixed",
            left: ghost.left,
            top: ghost.top,
            width: ghost.width,
            height: ghost.height,
            zIndex: 100,
            pointerEvents: "none",
          }}
          className={cn(cardCls, "border-accent shadow-2xl ring-1 ring-black/5")}
        >
          <span className={cn("flex min-w-0 flex-1 items-center", compact ? "gap-2.5 py-2.5 pl-3" : "gap-3 py-3 pl-3.5")}>
            {compact ? (
              <PageIcon k={page.icon} className="size-3.5 shrink-0 text-faint" />
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-subtle text-faint">
                <PageIcon k={page.icon} className="size-4" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate font-medium", compact ? "text-[13px]" : "text-[14px]")}>
                {page.title || "Nomsiz"}
              </span>
              {!compact && count > 0 && (
                <span className="text-[11.5px] text-faint">{count} bo&apos;lim sahifa</span>
              )}
            </span>
            {compact && count > 0 && <span className="shrink-0 text-[11px] text-faint">{count}</span>}
          </span>
        </div>,
        document.body
      )}
    </>
  );
}

const CARD_MENU_WIDTH = 208;

/** "⋯" tugmasi ostida chiqadigan Tahrirlash/O'chirish menyusi. Portal orqali
 *  document.body'ga chiqariladi — aks holda HujjatlarPanel'ning slide
 *  animatsiyasi uchun qo'yilgan `overflow-x-hidden` konteyneri (CSS bo'yicha
 *  overflow-y'ni ham majburan "auto" qilib qo'yadi) menyuni kesib tashlar edi. */
function PageCardMenu({
  open,
  triggerRef,
  onClose,
  onRename,
  onRemove,
  onAddSibling,
  onAddChild,
}: {
  open: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onRename: () => void;
  onRemove: () => void;
  onAddSibling: () => void;
  onAddChild: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function place() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const left = Math.min(r.right - CARD_MENU_WIDTH, window.innerWidth - CARD_MENU_WIDTH - 8);
      setPos({ top: r.bottom + 4, left: Math.max(8, left) });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    }
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      onClose();
    }
    const tid = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(tid);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose, triggerRef]);

  if (!open || !mounted || !pos) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[100] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-2xl ring-1 ring-black/5"
      style={{ top: pos.top, left: pos.left, width: CARD_MENU_WIDTH }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={onAddSibling}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-hover"
      >
        <Plus className="size-3.5 text-faint" /> Yonidan sahifa qo&apos;shish
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={onAddChild}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-hover"
      >
        <CornerDownRight className="size-3.5 text-faint" /> Ostidan bo&apos;lim sahifa
      </button>
      <div className="my-1 border-t border-border" />
      <button
        type="button"
        role="menuitem"
        onClick={onRename}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-hover"
      >
        <Pencil className="size-3.5 text-faint" /> Tahrirlash
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={onRemove}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-danger transition-colors hover:bg-hover"
      >
        <Trash2 className="size-3.5" /> O&apos;chirish
      </button>
    </div>,
    document.body
  );
}

function RootList({
  roots,
  childCount,
  onOpen,
  onCreate,
  onUpdate,
  onRemove,
  onReorder,
  onRequestAddChild,
}: {
  roots: Page[];
  childCount: (id: string) => number;
  onOpen: (id: string) => void;
  /** Sahifani berilgan nom bilan yaratadi va id'sini qaytaradi. */
  onCreate: (title: string) => string;
  onUpdate: (id: string, patch: Partial<Page>) => void;
  onRemove: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  /** Berilgan sahifa ichiga kirib, uning "bo'lim sahifa qo'shish" inputini avtomatik ochadi. */
  onRequestAddChild: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  // "Yonidan sahifa qo'shish": yangi sahifa aynan shu karta yonida (undan
  // keyin) paydo bo'lishi kerak. `onCreate` optimistik ravishda yaratadi,
  // lekin yangi id `roots`/`order`ga faqat KEYINGI render'da qo'shiladi —
  // shuning uchun joylashtirishni SINXRON emas, quyidagi effect orqali,
  // yangi id `rootIds`da paydo bo'lishini kutib amalga oshiramiz.
  const [siblingDraft, setSiblingDraft] = useState<{ afterId: string; value: string } | null>(null);
  const pendingPositionRef = useRef<{ newId: string; afterId: string } | null>(null);

  // Drag-reorder: karta bevosita barmoq/kursorga ergashadi (PageCard'ning
  // o'z `drag`i); shu yerda faqat qaysi karta hozir tortilayotgani va
  // tortish paytida pointer qaysi boshqa kartaga to'g'ri kelayotgani
  // kuzatiladi — topilsa mahalliy `order` jonli yangilanadi, qolgan
  // kartalar esa `layout` bilan silliq joy bo'shatadi. Tortish tugagach
  // bitta so'rov bilan serverga saqlanadi.
  const rootIds = roots.map((p) => p.id);
  const rootIdsKey = rootIds.join(",");
  const [order, setOrder] = useState<string[]>(rootIds);
  useEffect(() => { setOrder(rootIds); }, [rootIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const orderRef = useRef(order);
  useEffect(() => { orderRef.current = order; }, [order]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  function handleDrag(id: string, clientX: number, clientY: number) {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const row = el?.closest?.("[data-reorder-id]") as HTMLElement | null;
    const overId = row?.dataset.reorderId ?? null;
    if (overId && overId !== id) {
      setOrder((prev) => moveBeforeId(prev, id, overId));
    }
  }
  function handleDragEnd() {
    setDraggingId(null);
    onReorder(orderRef.current);
  }

  useEffect(() => {
    const pending = pendingPositionRef.current;
    if (!pending || !rootIds.includes(pending.newId)) return;
    pendingPositionRef.current = null;
    const idx = rootIds.indexOf(pending.afterId);
    const beforeId = idx >= 0 && idx + 1 < rootIds.length ? rootIds[idx + 1] : null;
    const next = moveBeforeId(rootIds, pending.newId, beforeId === pending.newId ? null : beforeId);
    setOrder(next);
    onReorder(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootIdsKey]);

  function startAddSibling(afterId: string) {
    setSiblingDraft({ afterId, value: "" });
  }
  function confirmAddSibling() {
    if (!siblingDraft) return;
    const t = siblingDraft.value.trim();
    const afterId = siblingDraft.afterId;
    setSiblingDraft(null);
    if (!t) return;
    const newId = onCreate(t);
    pendingPositionRef.current = { newId, afterId };
  }
  function cancelAddSibling() {
    setSiblingDraft(null);
  }

  function confirmCreate() {
    const t = draft.trim();
    setCreating(false);
    setDraft("");
    if (!t) return; // nom kiritilmasa — hech narsa yaratilmaydi
    onCreate(t); // faqat yaratiladi — ichiga kirib ketmaydi
  }
  function cancelCreate() {
    setCreating(false);
    setDraft("");
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-faint">Hujjatlar</p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-faint transition-colors hover:bg-hover hover:text-foreground"
        >
          <Plus className="size-3.5" /> Yangi sahifa
        </button>
      </div>

      {roots.length === 0 && !creating ? (
        <div className="overflow-hidden rounded-2xl bg-subtle/50 px-6 py-12 text-center sm:px-10 sm:py-16">
          <div className="mx-auto flex w-fit items-center justify-center">
            <span className="-mr-2.5 grid size-11 shrink-0 -rotate-6 place-items-center rounded-xl border border-border bg-surface text-faint shadow-sm">
              <ListChecks className="size-5" />
            </span>
            <span className="z-10 grid size-14 shrink-0 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-md">
              <FileText className="size-6" />
            </span>
            <span className="-ml-2.5 grid size-11 shrink-0 rotate-6 place-items-center rounded-xl border border-border bg-surface text-faint shadow-sm">
              <Table2 className="size-5" />
            </span>
          </div>
          <p className="mx-auto mt-6 max-w-xs text-[16px] font-semibold tracking-[-0.01em] text-foreground">
            Bu yerda hali hech narsa yo&apos;q
          </p>
          <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-muted">
            Mavzular ro&apos;yxati, TZ, checklist yoki jadval — birinchi sahifangizni
            yarating va yozishni boshlang.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2.5 text-[13.5px] font-medium text-background transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            Birinchi sahifani yaratish
          </button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {creating && (
            <div className="flex items-center gap-3 rounded-xl border border-accent bg-surface px-3.5 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-subtle text-faint">
                <FileText className="size-4" />
              </span>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={confirmCreate}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); confirmCreate(); }
                  if (e.key === "Escape") cancelCreate();
                }}
                placeholder="Sahifa nomi..."
                className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-foreground outline-none placeholder:text-faint"
              />
            </div>
          )}
          {order.map((id) => {
            const p = roots.find((r) => r.id === id);
            if (!p) return null;
            return (
              <Fragment key={id}>
                <PageCard
                  page={p}
                  count={childCount(p.id)}
                  dragging={draggingId === id}
                  onOpen={() => onOpen(p.id)}
                  onRename={(title) => onUpdate(p.id, { title })}
                  onRemove={() => onRemove(p.id)}
                  onAddSibling={() => startAddSibling(p.id)}
                  onAddChild={() => onRequestAddChild(p.id)}
                  onDragStart={setDraggingId}
                  onDragMove={handleDrag}
                  onDragEnd={handleDragEnd}
                />
                {siblingDraft?.afterId === id && (
                  <div className="flex items-center gap-3 rounded-xl border border-accent bg-surface px-3.5 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-subtle text-faint">
                      <FileText className="size-4" />
                    </span>
                    <input
                      autoFocus
                      value={siblingDraft.value}
                      onChange={(e) => setSiblingDraft((d) => (d ? { ...d, value: e.target.value } : d))}
                      onBlur={confirmAddSibling}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); confirmAddSibling(); }
                        if (e.key === "Escape") cancelAddSibling();
                      }}
                      placeholder="Sahifa nomi..."
                      className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-foreground outline-none placeholder:text-faint"
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PageView({
  page,
  pages,
  childCount,
  onBack,
  onUpdate,
  onOpenChild,
  onCreateChild,
  onRemove,
  onRemoveChild,
  onReorderChildren,
  onRequestAddChild,
  autoStartCreatingChild,
  onConsumedAutoStart,
}: {
  page: Page;
  pages: Page[];
  childCount: (id: string) => number;
  onBack: () => void;
  onUpdate: (id: string, patch: Partial<Page>) => void;
  onOpenChild: (id: string) => void;
  /** Bo'lim sahifani berilgan nom bilan yaratadi va id'sini qaytaradi. */
  onCreateChild: (title: string) => string;
  onRemove: () => void;
  onRemoveChild: (id: string) => void;
  onReorderChildren: (orderedIds: string[]) => void;
  /** Berilgan (ichki, shu sahifaning bo'limi bo'lgan) sahifa ichiga kirib,
   *  uning o'z "bo'lim sahifa qo'shish" inputini avtomatik ochadi. */
  onRequestAddChild: (id: string) => void;
  /** true bo'lsa — bu sahifa "Ostidan bo'lim sahifa" orqali ochilgan, shuning
   *  uchun mount bo'lishi bilan o'zining bo'lim-sahifa qo'shish inputi
   *  avtomatik ochiladi. */
  autoStartCreatingChild: boolean;
  onConsumedAutoStart: () => void;
}) {
  const children = pages.filter((p) => p.parentId === page.id).sort((a, b) => a.order - b.order);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(page.title);
  const [creatingChild, setCreatingChild] = useState(false);
  const [draftChild, setDraftChild] = useState("");
  const [pickingIcon, setPickingIcon] = useState(false);

  useEffect(() => {
    if (autoStartCreatingChild) {
      setCreatingChild(true);
      onConsumedAutoStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const childIds = children.map((c) => c.id);
  const childIdsKey = childIds.join(",");
  const [childOrder, setChildOrder] = useState<string[]>(childIds);
  useEffect(() => { setChildOrder(childIds); }, [childIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const childOrderRef = useRef(childOrder);
  useEffect(() => { childOrderRef.current = childOrder; }, [childOrder]);

  const [draggingChildId, setDraggingChildId] = useState<string | null>(null);
  function handleChildDrag(id: string, clientX: number, clientY: number) {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const row = el?.closest?.("[data-reorder-id]") as HTMLElement | null;
    const overId = row?.dataset.reorderId ?? null;
    if (overId && overId !== id) {
      setChildOrder((prev) => moveBeforeId(prev, id, overId));
    }
  }
  function handleChildDragEnd() {
    setDraggingChildId(null);
    onReorderChildren(childOrderRef.current);
  }

  // "Yonidan sahifa qo'shish" (bo'lim sahifa darajasida) — xuddi RootList'dagi
  // kabi, yangi id `childOrder`da paydo bo'lishini kutib joylashtiradi.
  const [siblingDraft, setSiblingDraft] = useState<{ afterId: string; value: string } | null>(null);
  const pendingPositionRef = useRef<{ newId: string; afterId: string } | null>(null);

  useEffect(() => {
    const pending = pendingPositionRef.current;
    if (!pending || !childIds.includes(pending.newId)) return;
    pendingPositionRef.current = null;
    const idx = childIds.indexOf(pending.afterId);
    const beforeId = idx >= 0 && idx + 1 < childIds.length ? childIds[idx + 1] : null;
    const next = moveBeforeId(childIds, pending.newId, beforeId === pending.newId ? null : beforeId);
    setChildOrder(next);
    onReorderChildren(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childIdsKey]);

  function startAddSibling(afterId: string) {
    setSiblingDraft({ afterId, value: "" });
  }
  function confirmAddSibling() {
    if (!siblingDraft) return;
    const t = siblingDraft.value.trim();
    const afterId = siblingDraft.afterId;
    setSiblingDraft(null);
    if (!t) return;
    const newId = onCreateChild(t);
    pendingPositionRef.current = { newId, afterId };
  }
  function cancelAddSibling() {
    setSiblingDraft(null);
  }

  function confirmCreateChild() {
    const t = draftChild.trim();
    setCreatingChild(false);
    setDraftChild("");
    if (!t) return; // nom kiritilmasa — hech narsa yaratilmaydi
    onCreateChild(t); // faqat yaratiladi — ichiga kirib ketmaydi
  }
  function cancelCreateChild() {
    setCreatingChild(false);
    setDraftChild("");
  }

  function startEdit() {
    setDraftTitle(page.title);
    setEditingTitle(true);
  }
  function saveEdit() {
    onUpdate(page.id, { title: draftTitle.trim() || "Nomsiz" });
    setEditingTitle(false);
  }
  function cancelEdit() {
    setEditingTitle(false);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12.5px] text-faint transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Orqaga
        </button>
        {editingTitle ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRemove}
              aria-label="O'chirish"
              className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-danger"
            >
              <Trash2 className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              aria-label="Bekor qilish"
              className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={saveEdit}
              aria-label="Saqlash"
              className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-accent"
            >
              <Check className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            aria-label="Tahrirlash"
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setPickingIcon(true)}
          aria-label="Ikonani o'zgartirish"
          title="Ikonani o'zgartirish"
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-subtle text-faint transition-colors hover:bg-hover hover:text-foreground"
        >
          <PageIcon k={page.icon} className="size-4" />
        </button>
        {editingTitle ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
              if (e.key === "Escape") cancelEdit();
            }}
            placeholder="Nomsiz"
            className="min-w-0 flex-1 bg-transparent text-[24px] font-semibold tracking-[-0.015em] text-foreground outline-none placeholder:text-faint"
          />
        ) : (
          <h1
            className="min-w-0 flex-1 cursor-pointer truncate text-[24px] font-semibold tracking-[-0.015em] text-foreground"
            onClick={startEdit}
          >
            {page.title || "Nomsiz"}
          </h1>
        )}
      </div>

      {pickingIcon && (
        <PageIconPicker
          value={page.icon}
          onClose={() => setPickingIcon(false)}
          onSelect={(icon) => onUpdate(page.id, { icon })}
        />
      )}
      <div className="mt-4">
        <EditorGrowWrap>
          <BlockNoteEditor
            key={page.id}
            initialContent={page.content as PartialBlock[] | null}
            onChange={(blocks) => onUpdate(page.id, { content: blocks as unknown[] })}
          />
        </EditorGrowWrap>
      </div>

      {children.length > 0 ? (
        <div className="mt-8 border-t border-border pt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-faint">
            Bo&apos;lim sahifalar
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {childOrder.map((id) => {
              const c = children.find((r) => r.id === id);
              if (!c) return null;
              return (
                <Fragment key={id}>
                  <PageCard
                    page={c}
                    count={childCount(c.id)}
                    compact
                    dragging={draggingChildId === id}
                    onOpen={() => onOpenChild(c.id)}
                    onRename={(title) => onUpdate(c.id, { title })}
                    onRemove={() => onRemoveChild(c.id)}
                    onAddSibling={() => startAddSibling(c.id)}
                    onAddChild={() => onRequestAddChild(c.id)}
                    onDragStart={setDraggingChildId}
                    onDragMove={handleChildDrag}
                    onDragEnd={handleChildDragEnd}
                  />
                  {siblingDraft?.afterId === id && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-accent bg-surface px-3 py-2.5">
                      <FileText className="size-3.5 shrink-0 text-faint" />
                      <input
                        autoFocus
                        value={siblingDraft.value}
                        onChange={(e) => setSiblingDraft((d) => (d ? { ...d, value: e.target.value } : d))}
                        onBlur={confirmAddSibling}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); confirmAddSibling(); }
                          if (e.key === "Escape") cancelAddSibling();
                        }}
                        placeholder="Sahifa nomi..."
                        className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-foreground outline-none placeholder:text-faint"
                      />
                    </div>
                  )}
                </Fragment>
              );
            })}
            {creatingChild ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-accent bg-surface px-3 py-2.5">
                <FileText className="size-3.5 shrink-0 text-faint" />
                <input
                  autoFocus
                  value={draftChild}
                  onChange={(e) => setDraftChild(e.target.value)}
                  onBlur={confirmCreateChild}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); confirmCreateChild(); }
                    if (e.key === "Escape") cancelCreateChild();
                  }}
                  placeholder="Sahifa nomi..."
                  className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-foreground outline-none placeholder:text-faint"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreatingChild(true)}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-[12.5px] text-faint transition-colors hover:border-border-strong hover:text-foreground"
              >
                <Plus className="size-3.5" /> Bo&apos;lim sahifa qo&apos;shish
              </button>
            )}
          </div>
        </div>
      ) : creatingChild ? (
        <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-accent bg-surface px-3 py-2.5">
          <FileText className="size-3.5 shrink-0 text-faint" />
          <input
            autoFocus
            value={draftChild}
            onChange={(e) => setDraftChild(e.target.value)}
            onBlur={confirmCreateChild}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); confirmCreateChild(); }
              if (e.key === "Escape") cancelCreateChild();
            }}
            placeholder="Sahifa nomi..."
            className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-foreground outline-none placeholder:text-faint"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreatingChild(true)}
          className="mt-6 flex items-center gap-1.5 text-[12.5px] text-faint opacity-50 transition-opacity hover:opacity-100"
        >
          <Plus className="size-3.5" /> Bo&apos;lim sahifa qo&apos;shish
        </button>
      )}
    </div>
  );
}

/** BlockNote asinxron (dynamic import) yuklanadi — avval skeleton, so'ng
 *  haqiqiy muharrir balandligi farq qilgani uchun pastdagi "Bo'lim
 *  sahifalar" bo'limi sakrab tushib qolardi. Shu wrapper birinchi haqiqiy
 *  o'lcham kelgach balandlikni CSS transition bilan silliq o'zgartiradi,
 *  so'ng butunlay o'zini yo'qotib (`settled`) tabiiy oqimga qaytadi — shundan
 *  keyingi tahrirlashlarda (foydalanuvchi blok qo'shsa) hech qanday
 *  cheklov/orqa fon ishi qolmaydi. */
function EditorGrowWrap({ children }: { children: React.ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);

  useLayoutEffect(() => {
    if (settled) return;
    const el = innerRef.current;
    if (!el) return;
    let settleTimer: number | null = null;
    const ro = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => setSettled(true), 400);
    });
    ro.observe(el);
    const maxTimer = window.setTimeout(() => setSettled(true), 2000);
    return () => {
      ro.disconnect();
      if (settleTimer) window.clearTimeout(settleTimer);
      window.clearTimeout(maxTimer);
    };
  }, [settled]);

  if (settled) return <>{children}</>;

  return (
    <div
      style={{
        height: height ?? undefined,
        overflow: "hidden",
        transition: height === null ? undefined : "height 260ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
