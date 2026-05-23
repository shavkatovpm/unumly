"use client";

import { useEffect, useState } from "react";
import { Bell, LogOut, Volume2, VolumeX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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
import { LEAD_MIN_OPTIONS, type LeadMin } from "@/lib/notify-time";
import { Dialog } from "./dialog";

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
  const [notifs, setNotifs] = useState<NotificationPrefs | null>(null);
  const router = useRouter();

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

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md" mobilePlacement="center">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
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

      <div className="space-y-6 px-5 py-5">
        {/* ── Ovoz ── */}
        <section>
          <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
            Ovoz
          </p>
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
        <section>
          <p className="mb-3 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
            <Bell className="size-3" />
            Eslatmalar
          </p>
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
            <div className="mt-3 grid grid-cols-3 gap-2">
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
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-muted hover:border-border-strong hover:text-foreground"
                    )}
                  >
                    {m} daq.
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
        <section>
          <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
            Akkaunt
          </p>
          <button
            type="button"
            onClick={signOut}
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
    </Dialog>
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
