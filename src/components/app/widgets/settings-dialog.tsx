"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BellRing, Check, ChevronRight, GripVertical, LogOut, Menu, Moon, Palette, RotateCcw, Rows3, Sun, Volume2, VolumeX, X } from "lucide-react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { useProfile } from "@/lib/profile-store";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { useIsMobile } from "./mono-sheet";
import { PickerModal } from "./picker-modal";
import { Avatar } from "./avatar";
import { MONO_GROUP, MonoIconButton, MonoLabel, MonoSwitch, MonoTick } from "./mono-bits";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PRIMARY,
  PRIMARY_COUNT,
  NAV_ITEMS,
  loadPrimaryIds,
  savePrimaryIds,
  type NavItemId,
} from "@/lib/mobile-nav";
import { LayoutGroup, motion, Reorder, useDragControls } from "framer-motion";

import {
  loadSelection,
  playOnComplete,
  saveEnabled,
  saveVolume,
  setMasterVolume,
} from "@/lib/sounds";
import {
  getNotificationPrefs,
  updateNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/user-settings-actions";
import {
  LEAD_MIN_OPTIONS,
  formatLeadOptionLabel,
  type LeadMin,
} from "@/lib/notify-time";
import { useTheme, THEME_FAMILIES } from "@/lib/color-store";
import { useBugunTaskStyle, setBugunTaskStyle } from "@/lib/bugun-style-store";
import { Dialog } from "./dialog";
import { ConfirmDialog } from "./confirm-dialog";
import { AutoHeight } from "./auto-height";

type TabId = "menyu" | "theme" | "ovoz" | "eslatma" | "akkaunt";

const TABS: { id: TabId; label: string; mobileOnly?: boolean }[] = [
  { id: "menyu", label: "Menyu", mobileOnly: true },
  { id: "theme", label: "Mavzu" },
  { id: "ovoz", label: "Ovoz" },
  { id: "eslatma", label: "Eslatmalar" },
  { id: "akkaunt", label: "Akkaunt" },
];

/* Oila ko'rsatkichi uchun namuna rang (accent, light) — vizual swatch. */
const THEME_SWATCH: Record<string, string> = {
  mono: "oklch(0.16 0 0)",
  ocean: "oklch(0.52 0.13 245)",
  graphite: "oklch(0.4 0.03 255)",
  raspberry: "oklch(0.52 0.19 358)",
  honey: "oklch(0.66 0.13 88)",
};

export function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.2);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [notifs, setNotifs] = useState<NotificationPrefs | null>(null);
  const [primaryIds, setPrimaryIds] = useState<NavItemId[]>(DEFAULT_PRIMARY);
  const [tab, setTab] = useState<TabId>("ovoz");
  const { family, isDark, setFamily, setMode } = useTheme();
  const bugunTaskStyle = useBugunTaskStyle();
  const router = useRouter();
  const isMobile = useIsMobile();

  // Doim PRIMARY_COUNT ta: yangi bo'lim yoqilsa — ro'yxatdagi oxirgisi
  // uning o'rniga chiqadi (o'chirish yo'q, faqat almashtirish).
  function enablePrimary(id: NavItemId) {
    setPrimaryIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev.slice(0, PRIMARY_COUNT - 1), id];
      savePrimaryIds(next);
      return next;
    });
  }

  // Yoqilgan (asosiy) bo'limlarni drag bilan tartiblash (Framer Reorder)
  function handleReorderPrimary(next: NavItemId[]) {
    setPrimaryIds(next);
    savePrimaryIds(next);
  }

  const isDefaultPrimary = primaryIds.length === DEFAULT_PRIMARY.length && primaryIds.every((x, i) => x === DEFAULT_PRIMARY[i]);
  function resetPrimary() { setPrimaryIds(DEFAULT_PRIMARY); savePrimaryIds(DEFAULT_PRIMARY); }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch { /**/ }
    router.replace("/kirish");
  }

  useEffect(() => {
    if (!open) return;
    const s = loadSelection();
    setEnabled(s.enabled);
    setVolume(s.volume);
    setMasterVolume(s.volume);
    setPrimaryIds(loadPrimaryIds());
    // Mobil'da "Menyu" tabi default ochiladi; desktopda u yashirin, shu sabab "Ovoz".
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    setTab(isMobile ? "menyu" : "ovoz");
    void getNotificationPrefs().then((p) => p && setNotifs(p));
  }, [open]);

  async function toggleNotif(key: "notifyHigh" | "notifyMedium" | "notifyLow" | "notifyUnprioritized") {
    if (!notifs) return;
    const next = { ...notifs, [key]: !notifs[key] };
    setNotifs(next);                    // optimistic
    try {
      const server = await updateNotificationPrefs({ [key]: next[key] });
      setNotifs(server);
    } catch {
      setNotifs(notifs);                // rollback
    }
  }

  async function setLeadMin(leadMin: LeadMin) {
    if (!notifs || notifs.notifyLeadMin === leadMin) return;
    const prev = notifs;
    setNotifs({ ...notifs, notifyLeadMin: leadMin });    // optimistic
    try {
      const server = await updateNotificationPrefs({ notifyLeadMin: leadMin });
      setNotifs(server);
    } catch {
      setNotifs(prev);                  // rollback
    }
  }

  function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    saveEnabled(next);
    if (next) playOnComplete(); // give a small preview when turning on
  }

  function changeVolume(v: number) {
    setVolume(v);
    setMasterVolume(v);
    saveVolume(v);
  }

  // Mobil: dialog o'rniga to'liq ekranli "Sozlamalar" sahifasi
  if (isMobile) {
    return (
      <SettingsMobile
        open={open}
        onClose={onClose}
        s={{
          enabled, toggleEnabled, volume, changeVolume, notifs, toggleNotif, setLeadMin,
          primaryIds, enablePrimary, handleReorderPrimary, resetPrimary, isDefaultPrimary,
          family, isDark, setFamily, setMode, bugunTaskStyle,
          signingOut, askSignOut: () => setConfirmSignOut(true),
        }}
        confirmEl={
          <ConfirmDialog
            open={confirmSignOut}
            title="Akkauntdan chiqasizmi?"
            description="Sessiya yopiladi va kirish sahifasiga qaytasiz."
            confirmLabel="Chiqish"
            destructive
            icon={LogOut}
            onConfirm={() => { setConfirmSignOut(false); signOut(); }}
            onClose={() => setConfirmSignOut(false)}
          />
        }
      />
    );
  }

  return (
    <>
    <Dialog open={open} onClose={onClose} className="max-w-md" mobilePlacement="center">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <p className="text-[15px] font-semibold tracking-[-0.01em]">Sozlamalar</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="grid size-8 place-items-center rounded-md text-faint hover:bg-hover hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              t.mobileOnly && "md:hidden",
              tab === t.id
                ? "bg-accent text-accent-ink"
                : "text-muted hover:bg-hover hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AutoHeight className="min-h-0 max-h-[65vh]">
      <div key={tab} className="fade-in px-5 py-5">
        {/* ── Mobil menyu (faqat mobil) ── */}
        <section className={cn("md:hidden", tab !== "menyu" && "hidden")}>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-faint">Bo&apos;limlar</p>
          <p className="mb-3 text-[11.5px] leading-relaxed text-faint">
            Mobil pastki menyuda qaysi bo&apos;limlar ko&apos;rinishini tanlang.
            Menyuda doim {PRIMARY_COUNT} ta bo&apos;lim va «Boshqaruv» turadi.
            Pastdagi bo&apos;limni yoqsangiz, ro&apos;yxatdagi oxirgisi uning
            o&apos;rniga chiqadi. ⠿ belgisidan ushlab tartibini o&apos;zgartiring.
          </p>
          <LayoutGroup>
            {/* Yoqilganlar — drag bilan tartiblanadi */}
            <Reorder.Group
              axis="y"
              values={primaryIds}
              onReorder={handleReorderPrimary}
              className="space-y-2"
            >
              {primaryIds.map((id) => {
                const item = NAV_ITEMS.find((i) => i.id === id);
                if (!item) return null;
                return (
                  <NavReorderRow
                    key={id}
                    item={item}
                  />
                );
              })}
            </Reorder.Group>

            {/* O'chiqlar — pastda; toggle qilinganda silliq joy almashadi */}
            {NAV_ITEMS.some((i) => !primaryIds.includes(i.id)) && (
              <div className="mt-2 space-y-2">
                {NAV_ITEMS.filter((i) => !primaryIds.includes(i.id)).map((item) => {
                  return (
                    <motion.button
                      key={item.id}
                      layout
                      layoutId={`nav-${item.id}`}
                      transition={{ type: "spring", stiffness: 520, damping: 42 }}
                      type="button"
                      onClick={() => enablePrimary(item.id)}
                      className="flex w-full items-center rounded-md border border-border bg-surface pr-3.5 transition-colors hover:bg-hover/40"
                    >
                      {/* grip joyi uchun bo'sh spacer (tekislash) */}
                      <span aria-hidden className="py-2.5 pl-3 pr-1 opacity-0">
                        <GripVertical className="size-4" />
                      </span>
                      <span className="flex flex-1 items-center justify-between py-2.5 pl-1.5">
                        <span className="flex items-center gap-2.5">
                          <item.icon className="size-4 text-faint" strokeWidth={2} />
                          <span className="text-[13.5px] font-medium">{item.label}</span>
                        </span>
                        <span aria-hidden className="relative h-5 w-9 rounded-full bg-subtle">
                          <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-background shadow" />
                        </span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </LayoutGroup>
          <button
            type="button"
            onClick={resetPrimary}
            disabled={isDefaultPrimary}
            className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-faint transition-colors hover:text-foreground disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" /> Asl holatga qaytarish
          </button>
        </section>

        {/* ── Theme ── */}
        <section className={cn(tab !== "theme" && "hidden")}>
          <p className="mb-3 text-[11.5px] leading-relaxed text-faint">
            Rang palitrasi va rejimni tanlang. Har bir palitra yorug&apos; va
            qorong&apos;i ko&apos;rinishda ishlaydi.
          </p>

          {/* Rejim: Yorug' / Qorong'i */}
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-faint">Rejim</p>
          <div className="mb-5 flex rounded-lg border border-border p-0.5">
            {([["light", "Yorug'"], ["dark", "Qorong'i"]] as const).map(([m, lbl]) => {
              const on = (m === "dark") === isDark;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex-1 rounded-md py-2 text-[13px] font-medium transition-colors",
                    on ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground"
                  )}
                >
                  {lbl}
                </button>
              );
            })}
          </div>

          {/* Palitra */}
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-faint">Palitra</p>
          <div className="space-y-2">
            {THEME_FAMILIES.map((t) => {
              const selected = family === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFamily(t.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border bg-surface px-3.5 py-2.5 transition-colors",
                    selected ? "border-foreground/40" : "border-border hover:bg-hover/40"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="size-4 rounded-full ring-1 ring-border" style={{ background: THEME_SWATCH[t.id] }} />
                    <p className="text-[13.5px] font-medium">{t.name}</p>
                  </div>
                  {selected && <Check className="size-4 text-foreground" />}
                </button>
              );
            })}
          </div>

          {/* Bugun'dagi tasklar ko'rinishi */}
          <p className="mb-1.5 mt-5 text-[11px] font-medium uppercase tracking-[0.16em] text-faint">Bugun</p>
          <button
            type="button"
            onClick={() => setBugunTaskStyle(bugunTaskStyle === "wide" ? "classic" : "wide")}
            className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-3.5 py-3 transition-colors hover:bg-hover/40"
          >
            <div className="text-left">
              <p className="text-[13.5px] font-medium">Kengaytirilgan tasklar</p>
              <p className="text-[11.5px] text-faint">
                Har bir task o&apos;z alohida kattaroq kartasida
              </p>
            </div>
            <span
              aria-hidden
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                bugunTaskStyle === "wide" ? "bg-foreground" : "bg-subtle"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-4 rounded-full bg-background shadow transition-[left] duration-200",
                  bugunTaskStyle === "wide" ? "left-[18px]" : "left-0.5"
                )}
              />
            </span>
          </button>
        </section>

        {/* ── Ovoz ── */}
        <section className={cn(tab !== "ovoz" && "hidden")}>
          <div className="space-y-3">
            <button
              type="button"
              onClick={toggleEnabled}
              className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-3.5 py-3 transition-colors hover:bg-hover/40"
            >
              <div className="flex items-center gap-3">
                {enabled ? (
                  <Volume2 className="size-4 text-foreground" />
                ) : (
                  <VolumeX className="size-4 text-faint" />
                )}
                <div className="text-left">
                  <p className="text-[13.5px] font-medium">Sound effektlar</p>
                  <p className="text-[11.5px] text-faint">
                    Bajarildi va yangi reja uchun ovoz
                  </p>
                </div>
              </div>
              <span
                aria-hidden
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors",
                  enabled ? "bg-foreground" : "bg-subtle"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-4 rounded-full bg-background shadow transition-[left] duration-200",
                    enabled ? "left-[18px]" : "left-0.5"
                  )}
                />
              </span>
            </button>

            <div
              className={cn(
                "rounded-md border border-border bg-surface px-3.5 pt-3 pb-4 transition-opacity",
                !enabled && "opacity-50"
              )}
            >
              <label
                htmlFor="volume-slider"
                className="flex items-baseline gap-2 text-[13px] text-muted"
              >
                Volume
                <span className="font-mono text-[11.5px] tabular-nums text-muted">
                  · {Math.round(volume * 100)}%
                </span>
              </label>
              <div className="mt-4">
                <input
                  id="volume-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  disabled={!enabled}
                  onChange={(e) => changeVolume(parseFloat(e.target.value))}
                  className="range-slider"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Eslatmalar ── */}
        <section className={cn(tab !== "eslatma" && "hidden")}>
          <p className="mb-3 text-[11.5px] leading-relaxed text-faint">
            Bot eslatmasi vazifa vaqtidan biroz oldinroq yuboriladi —
            tayyorlanishga ulgurish uchun. Quyida nechta daqiqa oldinligini
            sozlang.
          </p>

          {/* Lead time selector */}
          <div className="mb-4 rounded-md border border-border bg-surface px-3.5 py-3">
            <p className="text-[13.5px] font-medium">Necha daqiqa oldin</p>
            <p className="mt-0.5 text-[11.5px] text-faint">
              Default: 5 daqiqa. Vaqtsiz rejalar uchun bu sozlama ta&apos;sir
              qilmaydi (ular vaqti belgilanmaganligi sababli eslatma
              yubormaydi).
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {LEAD_MIN_OPTIONS.map((m) => {
                const active = (notifs?.notifyLeadMin ?? 5) === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLeadMin(m)}
                    disabled={!notifs}
                    className={cn(
                      "rounded-md border px-2 py-2 text-[13px] font-medium transition-colors disabled:opacity-50",
                      active
                        ? "border-accent bg-accent text-accent-ink"
                        : "border-border bg-background text-muted hover:border-border-strong hover:text-foreground"
                    )}
                  >
                    {formatLeadOptionLabel(m)}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mb-3 text-[11.5px] leading-relaxed text-faint">
            Muhimlik darajasi bo&apos;yicha eslatmalarni alohida-alohida
            yoqib-o&apos;chirish:
          </p>
          <div className="space-y-2">
            <NotifToggle
              label="Muhim"
              dot="bg-priority-high"
              enabled={notifs?.notifyHigh ?? true}
              loading={!notifs}
              onChange={() => toggleNotif("notifyHigh")}
            />
            <NotifToggle
              label="O'rta"
              dot="bg-priority-medium"
              enabled={notifs?.notifyMedium ?? true}
              loading={!notifs}
              onChange={() => toggleNotif("notifyMedium")}
            />
            <NotifToggle
              label="Past"
              dot="bg-priority-low"
              enabled={notifs?.notifyLow ?? true}
              loading={!notifs}
              onChange={() => toggleNotif("notifyLow")}
            />
            <NotifToggle
              label="Darajasiz"
              dot="bg-faint/40"
              enabled={notifs?.notifyUnprioritized ?? true}
              loading={!notifs}
              onChange={() => toggleNotif("notifyUnprioritized")}
            />
          </div>
        </section>

        {/* ── Akkaunt ── */}
        <section className={cn(tab !== "akkaunt" && "hidden")}>
          <button
            type="button"
            onClick={() => setConfirmSignOut(true)}
            disabled={signingOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-md border border-border bg-surface px-3.5 py-3 transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50",
            )}
          >
            <LogOut className="size-4" />
            <div className="text-left">
              <p className="text-[13.5px] font-medium">Chiqish</p>
              <p className="text-[11.5px] text-faint">
                Sessiyani yopib /kirish sahifasiga qaytadi
              </p>
            </div>
          </button>
        </section>
      </div>
      </AutoHeight>
    </Dialog>

    <ConfirmDialog
      open={confirmSignOut}
      title="Akkauntdan chiqasizmi?"
      description="Sessiya yopiladi va /kirish sahifasiga qaytasiz."
      confirmLabel="Chiqish"
      destructive
      onConfirm={() => {
        setConfirmSignOut(false);
        signOut();
      }}
      onClose={() => setConfirmSignOut(false)}
    />
    </>
  );
}

function NotifToggle({
  label,
  dot,
  enabled,
  loading,
  onChange,
}: {
  label: string;
  dot: string;
  enabled: boolean;
  loading: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={loading}
      className={cn(
        "flex w-full items-center justify-between rounded-md border border-border bg-surface px-3.5 py-2.5 transition-colors hover:bg-hover/40",
        loading && "opacity-60"
      )}
    >
      <div className="flex items-center gap-2.5">
        <span aria-hidden className={cn("size-2 rounded-full", dot)} />
        <p className="text-[13.5px] font-medium">{label}</p>
      </div>
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          enabled ? "bg-foreground" : "bg-subtle"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-background shadow transition-[left] duration-200",
            enabled ? "left-[18px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

/* Mobil menyu — yoqilgan bo'lim qatori (drag bilan tartiblanadi; o'chirib
   bo'lmaydi — pastdagi bo'lim yoqilsa, oxirgisi o'rniga chiqadi). */
function NavReorderRow({ item }: { item: (typeof NAV_ITEMS)[number] }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item.id}
      layoutId={`nav-${item.id}`}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.03, boxShadow: "0 10px 28px -8px rgba(0,0,0,0.35)" }}
      transition={{ type: "spring", stiffness: 520, damping: 42 }}
      className="flex items-center rounded-md border border-foreground/30 bg-surface pr-3.5"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        aria-label="Tartibini o'zgartirish"
        className="cursor-grab touch-none py-2.5 pl-3 pr-1 text-faint active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex flex-1 items-center justify-between py-2.5 pl-1.5">
        <div className="flex items-center gap-2.5">
          <item.icon className="size-4 text-faint" strokeWidth={2} />
          <p className="text-[13.5px] font-medium">{item.label}</p>
        </div>
        <span aria-hidden className="relative h-5 w-9 rounded-full bg-foreground">
          <span className="absolute left-[18px] top-0.5 size-4 rounded-full bg-background shadow" />
        </span>
      </div>
    </Reorder.Item>
  );
}

/* ─── Mobil: guruhlangan qatorlar bilan to'liq ekranli sahifa ─── */

type MobileState = {
  enabled: boolean;
  toggleEnabled: () => void;
  volume: number;
  changeVolume: (v: number) => void;
  notifs: NotificationPrefs | null;
  toggleNotif: (key: "notifyHigh" | "notifyMedium" | "notifyLow" | "notifyUnprioritized") => void;
  setLeadMin: (m: LeadMin) => void;
  primaryIds: NavItemId[];
  enablePrimary: (id: NavItemId) => void;
  handleReorderPrimary: (next: NavItemId[]) => void;
  resetPrimary: () => void;
  isDefaultPrimary: boolean;
  family: string;
  isDark: boolean;
  setFamily: (f: (typeof THEME_FAMILIES)[number]["id"]) => void;
  setMode: (m: "light" | "dark") => void;
  bugunTaskStyle: "classic" | "wide";
  signingOut: boolean;
  askSignOut: () => void;
};

const noopSubscribe = () => () => {};

const FAMILY_DESC: Record<string, string> = {
  mono: "Qora-oq, toza",
  ocean: "Sokin ko'k",
  graphite: "Yumshoq kulrang",
  raspberry: "Yorqin malina",
  honey: "Iliq asal",
};

function SettingsMobile({ open, onClose, s, confirmEl }: { open: boolean; onClose: () => void; s: MobileState; confirmEl: React.ReactNode }) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && <SettingsMobilePanel key="settings" onClose={onClose} s={s} confirmEl={confirmEl} />}
    </AnimatePresence>,
    document.body
  );
}

function Row({ icon: Icon, label, sub, value, onClick, right, danger, disabled }: { icon: React.ComponentType<{ className?: string }>; label: string; sub?: string; value?: string; onClick?: () => void; right?: React.ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn("flex min-h-[60px] w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-hover disabled:opacity-50", danger && "text-danger")}>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-[12px]", danger ? "bg-danger-soft" : "bg-subtle")}><Icon className="size-[18px]" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15.5px] font-semibold">{label}</span>
        {sub && <span className="block text-[12.5px] leading-snug text-faint">{sub}</span>}
      </span>
      {value && <span className="shrink-0 text-[14px] text-muted">{value}</span>}
      {right ?? (onClick && !danger && <ChevronRight className="size-4 shrink-0 text-faint" />)}
    </button>
  );
}

function SettingsMobilePanel({ onClose, s, confirmEl }: { onClose: () => void; s: MobileState; confirmEl: React.ReactNode }) {
  useScrollLock(true);
  const profile = useProfile();
  const [pick, setPick] = useState<null | "palette" | "nav" | "lead">(null);
  const fam = THEME_FAMILIES.find((t) => t.id === s.family) ?? THEME_FAMILIES[0];
  const primaryLabels = s.primaryIds.map((id) => NAV_ITEMS.find((i) => i.id === id)?.label).filter(Boolean).join(" · ");
  const lead = (s.notifs?.notifyLeadMin ?? 5) as LeadMin;
  const NOTIFS = [
    { key: "notifyHigh", label: "Muhim", dot: "bg-priority-high" },
    { key: "notifyMedium", label: "O'rta", dot: "bg-priority-medium" },
    { key: "notifyLow", label: "Past", dot: "bg-priority-low" },
    { key: "notifyUnprioritized", label: "Darajasiz", dot: "bg-faint/40" },
  ] as const;
  const onCount = NOTIFS.filter((n) => s.notifs?.[n.key] ?? true).length;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Sozlamalar"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 28, transition: { duration: 0.16, ease: "easeIn" } }}
      transition={{ type: "spring", stiffness: 460, damping: 40 }}
      className="fixed inset-x-0 top-0 z-[60] flex flex-col bg-background"
      style={{ height: "var(--tg-vh, 100dvh)", paddingTop: "var(--modal-safe-top)" }}
    >
      <header className="flex shrink-0 items-center justify-between px-4 pb-2">
        <h1 className="text-[22px] font-bold tracking-[-0.025em]">Sozlamalar</h1>
        <MonoIconButton icon={X} label="Yopish" onClick={onClose} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
        {/* Profil */}
        <div className={cn(MONO_GROUP, "mt-1")}>
          <div className="flex min-h-[60px] items-center gap-3 px-3.5 py-2.5">
            <Avatar name={profile?.name} photoUrl={profile?.photoUrl} className="size-10 rounded-full text-[14px] font-bold" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15.5px] font-semibold">{profile?.name ?? "Foydalanuvchi"}</span>
              <span className="block text-[12.5px] text-faint">Telegram orqali</span>
            </span>
          </div>
        </div>

        <MonoLabel>Ko&apos;rinish</MonoLabel>
        <div className={MONO_GROUP}>
          <div className="flex min-h-[60px] items-center gap-3 px-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-subtle">{s.isDark ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}</span>
            <span className="flex-1 text-[15.5px] font-semibold">Rejim</span>
            <div className="flex rounded-full bg-subtle p-1">
              {([["light", "Yorug'"], ["dark", "Qorong'i"]] as const).map(([m, l]) => (
                <button key={m} type="button" onClick={() => s.setMode(m)} className={cn("h-9 rounded-full px-3.5 text-[13.5px] font-semibold transition-colors", (m === "dark") === s.isDark ? "bg-accent text-accent-ink shadow-sm" : "text-muted")}>{l}</button>
              ))}
            </div>
          </div>
          <Row icon={Palette} label="Palitra" value={fam.name} onClick={() => setPick("palette")} />
          <Row icon={Rows3} label="Kengaytirilgan tasklar" sub="Bugun'da har bir task alohida kattaroq kartada" onClick={() => setBugunTaskStyle(s.bugunTaskStyle === "wide" ? "classic" : "wide")} right={<MonoSwitch on={s.bugunTaskStyle === "wide"} />} />
        </div>

        <MonoLabel>Pastki menyu</MonoLabel>
        <div className={MONO_GROUP}>
          <Row icon={Menu} label="Menyu bo'limlari" sub={`${primaryLabels} · Boshqaruv`} onClick={() => setPick("nav")} />
        </div>

        <MonoLabel>Ovoz</MonoLabel>
        <div className={MONO_GROUP}>
          <Row icon={s.enabled ? Volume2 : VolumeX} label="Ovoz effektlari" sub="Bajarildi va yangi reja uchun ovoz" onClick={s.toggleEnabled} right={<MonoSwitch on={s.enabled} />} />
          <div className={cn("px-3.5 pb-4 pt-3 transition-opacity", !s.enabled && "opacity-40")}>
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] font-semibold">Balandlik</span>
              <span className="text-[14px] font-semibold tabular-nums text-muted">{Math.round(s.volume * 100)}%</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.05} value={s.volume} disabled={!s.enabled}
              onChange={(e) => s.changeVolume(parseFloat(e.target.value))}
              aria-label="Ovoz balandligi"
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-surface [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow"
              style={{ background: `linear-gradient(to right, var(--accent) ${s.volume * 100}%, var(--subtle) ${s.volume * 100}%)` }}
            />
          </div>
        </div>

        <MonoLabel aside={`${onCount}/4 yoqilgan`}>Bot eslatmalari</MonoLabel>
        <div className={MONO_GROUP}>
          <Row icon={BellRing} label="Necha daqiqa oldin" sub="Tayyorlanishga ulgurish uchun" value={formatLeadOptionLabel(lead)} onClick={() => setPick("lead")} disabled={!s.notifs} />
          {NOTIFS.map((n) => (
            <button key={n.key} type="button" disabled={!s.notifs} onClick={() => s.toggleNotif(n.key)} className="flex min-h-[56px] w-full items-center gap-3 px-3.5 text-left active:bg-hover disabled:opacity-60">
              <span className="grid size-9 shrink-0 place-items-center"><span className={cn("size-2.5 rounded-full", n.dot)} /></span>
              <span className="flex-1 text-[15.5px] font-semibold">{n.label}</span>
              <MonoSwitch on={s.notifs?.[n.key] ?? true} />
            </button>
          ))}
        </div>
        <p className="mt-2 px-1 text-[12.5px] leading-relaxed text-faint">Muhimlik bo&apos;yicha eslatmalarni alohida yoqib-o&apos;chiring. Vaqtsiz rejalar eslatma yubormaydi.</p>

        <MonoLabel>Akkaunt</MonoLabel>
        <div className={MONO_GROUP}>
          <Row icon={LogOut} label="Chiqish" sub="Sessiya yopiladi, kirish sahifasiga qaytasiz" danger disabled={s.signingOut} onClick={s.askSignOut} />
        </div>
      </div>

      {/* Palitra */}
      <PickerModal open={pick === "palette"} onClose={() => setPick(null)} label="Palitra">
        <div className={cn(MONO_GROUP, "bg-background")}>
          {THEME_FAMILIES.map((t) => (
            <button key={t.id} type="button" onClick={() => s.setFamily(t.id)} className="flex min-h-[58px] w-full items-center gap-3 px-3.5 text-left active:bg-hover">
              <span className="size-7 shrink-0 rounded-full ring-1 ring-border" style={{ background: THEME_SWATCH[t.id] }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15.5px] font-semibold">{t.name}</span>
                <span className="block text-[12.5px] text-faint">{FAMILY_DESC[t.id]}</span>
              </span>
              <MonoTick on={s.family === t.id} size={24} />
            </button>
          ))}
        </div>
        <p className="mt-2 px-1 text-[12.5px] text-faint">Har biri yorug&apos; va qorong&apos;i rejimda ishlaydi.</p>
      </PickerModal>

      {/* Eslatma vaqti */}
      <PickerModal open={pick === "lead"} onClose={() => setPick(null)} label="Necha daqiqa oldin">
        <p className="mb-3 px-1 text-[13.5px] leading-relaxed text-muted">Bot eslatmasi vazifa vaqtidan shuncha oldin yuboriladi. Standart: 5 daqiqa.</p>
        <div className="grid grid-cols-2 gap-2">
          {LEAD_MIN_OPTIONS.map((m) => (
            <button key={m} type="button" onClick={() => { s.setLeadMin(m); setPick(null); }} className={cn("flex h-[60px] flex-col items-center justify-center rounded-[18px] border", lead === m ? "border-accent bg-accent text-accent-ink" : "border-border bg-background")}>
              <span className="text-[18px] font-bold leading-none tabular-nums">{m === 0 ? "0" : m}</span>
              <span className={cn("mt-1 text-[12px] font-semibold", lead === m ? "opacity-75" : "text-muted")}>{m === 0 ? "O'z vaqtida" : "daqiqa avval"}</span>
            </button>
          ))}
        </div>
      </PickerModal>

      {/* Menyu bo'limlari */}
      <PickerModal open={pick === "nav"} onClose={() => setPick(null)} label="Menyu bo'limlari">
        <p className="mb-2 px-1 text-[12.5px] leading-relaxed text-faint">Doim {PRIMARY_COUNT} ta bo&apos;lim + Boshqaruv. ⠿ dan ushlab tartiblang; pastdagini yoqsangiz, oxirgisi o&apos;rniga chiqadi.</p>
        <Reorder.Group axis="y" values={s.primaryIds} onReorder={s.handleReorderPrimary} className={cn(MONO_GROUP, "bg-background")}>
          {s.primaryIds.map((id, i) => <MobileNavRow key={id} id={id} index={i} />)}
        </Reorder.Group>
        <div className={cn(MONO_GROUP, "mt-2 bg-background")}>
          {NAV_ITEMS.filter((it) => !s.primaryIds.includes(it.id)).map((it) => (
            <button key={it.id} type="button" onClick={() => s.enablePrimary(it.id)} className="flex min-h-[54px] w-full items-center gap-3 pl-12 pr-3.5 text-left active:bg-hover">
              <it.icon className="size-5 text-faint" />
              <span className="flex-1 text-[15px] font-semibold text-muted">{it.label}</span>
              <MonoSwitch on={false} />
            </button>
          ))}
        </div>
        <button type="button" onClick={s.resetPrimary} disabled={s.isDefaultPrimary} className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[16px] text-[14px] font-semibold text-muted disabled:opacity-35">
          <RotateCcw className="size-4" /> Asl holatga qaytarish
        </button>
      </PickerModal>

      {confirmEl}
    </motion.div>
  );
}

function MobileNavRow({ id, index }: { id: NavItemId; index: number }) {
  const controls = useDragControls();
  const it = NAV_ITEMS.find((i) => i.id === id);
  if (!it) return null;
  return (
    <Reorder.Item value={id} dragListener={false} dragControls={controls} whileDrag={{ scale: 1.02, boxShadow: "0 12px 28px -10px rgba(0,0,0,0.3)", zIndex: 2, position: "relative" }} className="flex min-h-[54px] items-center bg-background pr-3.5">
      <button type="button" aria-label="Tartibini o'zgartirish" onPointerDown={(e) => controls.start(e)} className="grid h-[54px] w-12 shrink-0 cursor-grab touch-none place-items-center text-faint">
        <GripVertical className="size-4" />
      </button>
      <it.icon className="size-5" />
      <span className="ml-3 flex-1 text-[15px] font-semibold">{it.label}</span>
      <span className="mr-3 text-[12px] tabular-nums text-faint">{index + 1}</span>
      <MonoSwitch on />
    </Reorder.Item>
  );
}
