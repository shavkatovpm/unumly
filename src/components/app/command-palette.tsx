"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Inbox,
  Wallet,
  ListChecks,
  Calendar as CalendarIcon,
  Repeat,
  Target,
  ClipboardList,
  Zap,
  CheckCircle2,
  Trash2,
  Plus,
  Search,
  ArrowRight,
  Sun,
  Moon,
  Settings,
  PanelLeft,
  Keyboard,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createPlan } from "@/lib/plans-store";
import { startOfDay, toDateInputValue } from "@/lib/dates";
import { useTheme } from "@/lib/color-store";
import { useIsMac, modLabel, shiftLabel } from "@/lib/platform";
import { useScrollLock } from "@/lib/use-scroll-lock";

type IconCmp = typeof Inbox;

/** Asosiy sahifalar — `g` + harf bilan tez navigatsiya uchun kalitlari bilan. */
export const NAV_ROUTES: Array<{ href: string; label: string; icon: IconCmp; key?: string }> = [
  { href: "/bugun", label: "Bugun", icon: Inbox, key: "b" },
  { href: "/agenda", label: "Agenda", icon: ListChecks, key: "a" },
  { href: "/kalendar", label: "Kalendar", icon: CalendarIcon, key: "k" },
  { href: "/moliya", label: "Moliya", icon: Wallet, key: "m" },
  { href: "/odat", label: "Odat", icon: Repeat, key: "o" },
  { href: "/reja", label: "Reja", icon: ClipboardList, key: "r" },
  { href: "/tezkor", label: "Tezkor", icon: Zap, key: "t" },
  { href: "/qarz", label: "Qarz", icon: Wallet, key: "q" },
  { href: "/maqsad", label: "Maqsad", icon: Target },
  { href: "/bajarilgan", label: "Bajarilgan", icon: CheckCircle2 },
  { href: "/ochirilgan", label: "O'chirilgan", icon: Trash2 },
];

type Mode = "command" | "newTask" | "help";

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: IconCmp;
  keywords?: string;
  shortcut?: string[];
  run: () => void;
};

export function CommandPalette({
  open,
  mode,
  onOpenChange,
  onToggleSidebar,
}: {
  open: boolean;
  mode: Mode;
  onOpenChange: (open: boolean, mode?: Mode) => void;
  onToggleSidebar: () => void;
}) {
  const router = useRouter();
  const { isDark, toggleMode } = useTheme();
  const mac = useIsMac();
  const mod = modLabel(mac);
  const shift = shiftLabel(mac);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useScrollLock(open);

  // Ochilganda holatni tozalab, inputga fokus beramiz.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
  }, [open, mode]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Esc — oynani yopadi.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  function createTask(title: string) {
    const t = title.trim();
    if (!t) return;
    createPlan({ title: t, scope: "DAILY", scheduledFor: toDateInputValue(startOfDay()) });
    close();
    router.push("/bugun");
  }

  // ── Buyruqlar ro'yxati ───────────────────────────────────────
  const commands = useMemo<Command[]>(() => {
    const navCmds: Command[] = NAV_ROUTES.map((r) => ({
      id: `nav:${r.href}`,
      label: `${r.label}'ga o'tish`,
      icon: r.icon,
      keywords: r.label,
      shortcut: r.key ? [mod, shift, r.key.toUpperCase()] : undefined,
      run: () => {
        router.push(r.href);
        close();
      },
    }));

    const actionCmds: Command[] = [
      {
        id: "new-task",
        label: "Yangi task",
        hint: "Bugun uchun",
        icon: Plus,
        keywords: "qo'shish yaratish add new",
        shortcut: [mod, "I"],
        run: () => onOpenChange(true, "newTask"),
      },
      {
        id: "toggle-theme",
        label: isDark ? "Yorug' rejim" : "Qorong'u rejim",
        icon: isDark ? Sun : Moon,
        keywords: "mavzu tema theme dark light rejim",
        run: () => {
          toggleMode();
          close();
        },
      },
      {
        id: "toggle-sidebar",
        label: "Sidebar'ni ko'rsatish / yashirish",
        icon: PanelLeft,
        keywords: "menyu panel",
        shortcut: [mod, "B"],
        run: () => {
          onToggleSidebar();
          close();
        },
      },
      {
        id: "settings",
        label: "Sozlamalar",
        icon: Settings,
        keywords: "settings profil",
        run: () => {
          window.dispatchEvent(new CustomEvent("unumly:open-settings"));
          close();
        },
      },
      {
        id: "shortcuts",
        label: "Klaviatura shortcut'lari",
        icon: Keyboard,
        keywords: "yordam help hotkey",
        shortcut: [mod, "/"],
        run: () => onOpenChange(true, "help"),
      },
    ];

    return [...actionCmds, ...navCmds];
  }, [router, close, isDark, toggleMode, onToggleSidebar, onOpenChange, mod, shift]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Faol indeks ro'yxat chegarasidan chiqmasin (render paytida cheklaymiz).
  const activeIdx = filtered.length ? Math.min(active, filtered.length - 1) : 0;

  if (!open) return null;

  // ── Yordam (shortcut'lar ro'yxati) ───────────────────────────
  if (mode === "help") {
    return (
      <Overlay onClose={close}>
        <div className="border-b border-border px-4 py-3">
          <p className="text-[14px] font-semibold">Klaviatura shortcut&apos;lari</p>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          <ShortcutSection title="Asosiy">
            <ShortcutRow label="Buyruqlar oynasi" keys={[mod, "K"]} />
            <ShortcutRow label="Yangi task" keys={[mod, "I"]} />
            <ShortcutRow label="Sidebar" keys={[mod, "B"]} />
            <ShortcutRow label="Shu oyna" keys={[mod, "/"]} />
          </ShortcutSection>
          <ShortcutSection title="Navigatsiya">
            {NAV_ROUTES.filter((r) => r.key).map((r) => (
              <ShortcutRow key={r.href} label={r.label} keys={[mod, shift, r.key!.toUpperCase()]} />
            ))}
            <p className="mt-1 text-[11.5px] text-faint">
              Boshqa sahifalar uchun {mod}K orqali qidiring.
            </p>
          </ShortcutSection>
        </div>
      </Overlay>
    );
  }

  // ── Yangi task ───────────────────────────────────────────────
  if (mode === "newTask") {
    return (
      <Overlay onClose={close}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createTask(query);
          }}
          className="flex items-center gap-2.5 px-4 py-3.5"
        >
          <Plus className="size-4 shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Yangi task nomi…"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint/60"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="flex shrink-0 items-center gap-1 rounded-md bg-foreground px-2 py-1 text-[12px] font-medium text-background disabled:opacity-40"
          >
            <CornerDownLeft className="size-3.5" />
            Qo&apos;shish
          </button>
        </form>
        <div className="border-t border-border px-4 py-2 text-[11.5px] text-faint">
          Bugun uchun task qo&apos;shiladi. Yopish uchun{" "}
          <Kbd>Esc</Kbd>.
        </div>
      </Overlay>
    );
  }

  // ── Buyruqlar oynasi ─────────────────────────────────────────
  const showCreate = query.trim().length > 0 && filtered.length === 0;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showCreate) createTask(query);
      else filtered[activeIdx]?.run();
    }
  }

  return (
    <Overlay onClose={close}>
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <Search className="size-4 shrink-0 text-faint" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Buyruq yoki sahifa qidiring…"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint/60"
        />
        <Kbd>Esc</Kbd>
      </div>

      <div className="max-h-[min(60vh,420px)] overflow-y-auto py-1.5">
        {showCreate ? (
          <Row
            active
            icon={Plus}
            label={`Yangi task: “${query.trim()}”`}
            onClick={() => createTask(query)}
            shortcut={[<CornerDownLeft key="e" className="size-3" />]}
          />
        ) : filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-faint">Hech narsa topilmadi</p>
        ) : (
          filtered.map((c, i) => (
            <Row
              key={c.id}
              active={i === activeIdx}
              icon={c.icon}
              label={c.label}
              hint={c.hint}
              onClick={c.run}
              onHover={() => setActive(i)}
              shortcut={c.shortcut?.map((s) => <Kbd key={s}>{s}</Kbd>)}
            />
          ))
        )}
      </div>
    </Overlay>
  );
}

/* ─── Sub-komponentlar ─── */

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      data-command-palette
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
      >
        {children}
      </motion.div>
    </div>
  );
}

function Row({
  active,
  icon: Icon,
  label,
  hint,
  shortcut,
  onClick,
  onHover,
}: {
  active: boolean;
  icon: IconCmp;
  label: string;
  hint?: string;
  shortcut?: React.ReactNode[];
  onClick: () => void;
  onHover?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseMove={onHover}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2 text-left",
        active ? "bg-hover" : "hover:bg-hover/60"
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-foreground" : "text-faint")} />
      <span className="min-w-0 flex-1 truncate text-[13.5px]">{label}</span>
      {hint && <span className="shrink-0 text-[11.5px] text-faint">{hint}</span>}
      {shortcut && shortcut.length > 0 && (
        <span className="flex shrink-0 items-center gap-1">{shortcut}</span>
      )}
      {active && !shortcut && <ArrowRight className="size-3.5 shrink-0 text-faint" />}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="grid h-5 min-w-5 place-items-center rounded border border-border bg-subtle px-1.5 font-mono text-[10.5px] text-muted">
      {children}
    </kbd>
  );
}

function ShortcutSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-faint">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[13px]">{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k) => (
          <Kbd key={k}>{k}</Kbd>
        ))}
      </span>
    </div>
  );
}
