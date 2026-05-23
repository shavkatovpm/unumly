"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Check,
  ListChecks,
  Plus,
  Smartphone,
  X,
} from "lucide-react";
import type { QuickList } from "@/lib/tezkor-types";
import { useHydratedLists, useQuickLists } from "@/lib/tezkor-store";
import { defaultListName } from "@/lib/tezkor-utils";
import { cn } from "@/lib/utils";
import { ListLoader } from "./widgets/list-loader";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { TezkorListDetail } from "./widgets/tezkor-list-detail";

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

  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
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
      <header className="flex h-12 items-center justify-between gap-2 border-b border-border px-4 md:px-6">
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

      {/* Content */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:py-8 md:pb-8">
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
              Bozorga ketyapsizmi? Yo&apos;lda esda saqlash kerak narsalar
              ko&apos;pmi? Har qatorga bittadan yozing — bir ro&apos;yhatga
              jam bo&apos;ladi.
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[12px] text-faint">
              Yoki shunchaki botga yozib yuboring — har xabar avtomatik
              ro&apos;yhatga qo&apos;shiladi.
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-[13.5px] font-medium text-background transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" />
              Yangi ro&apos;yhat
            </button>
          </div>
        ) : (
          <>
            {/* Desktop: New-list button row (mobile uses FAB) */}
            <div className="rise-in mb-6 hidden md:block">
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-left text-[13.5px] text-muted shadow-[0_1px_0_var(--border)] transition-colors hover:border-border-strong hover:text-foreground"
              >
                <Plus className="size-4 text-faint" />
                Yangi ro&apos;yhat qo&apos;shish
              </button>
            </div>

            <div className="rise-in space-y-2.5" style={{ animationDelay: "60ms" }}>
              {sorted.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  onOpen={() => setOpenId(list.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        aria-label="Yangi ro'yhat"
        className={cn(
          "fixed right-4 z-30 grid size-14 place-items-center rounded-full bg-foreground text-background shadow-[0_10px_30px_-5px_rgba(0,0,0,0.35)] transition-all duration-200 hover:scale-105 active:scale-95 md:hidden",
          (showCreate || !!openList) && "pointer-events-none scale-75 opacity-0"
        )}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)" }}
      >
        <Plus className="size-6" strokeWidth={2.5} />
      </button>

      <CreateListModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(name, items) => {
          createList({ name, items });
          setShowCreate(false);
        }}
      />

      <TezkorListDetail
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

function CreateListModal({
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
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 4rem)" }}
            onClick={onClose}
          >
            <motion.div
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
                        ? "bg-foreground text-background hover:opacity-90"
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
