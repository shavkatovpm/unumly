"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  loadSelection,
  playOnComplete,
  saveEnabled,
  saveVolume,
  setMasterVolume,
} from "@/lib/sounds";
import { Dialog } from "./dialog";

export function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.25);

  useEffect(() => {
    if (!open) return;
    const s = loadSelection();
    setEnabled(s.enabled);
    setVolume(s.volume);
    setMasterVolume(s.volume);
  }, [open]);

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
                "rounded-md border border-border bg-surface px-3.5 py-3 transition-opacity",
                !enabled && "opacity-50"
              )}
            >
              <div className="flex items-center justify-between">
                <label
                  htmlFor="volume-slider"
                  className="text-[13px] text-muted"
                >
                  Volume
                </label>
                <span className="font-mono text-[11.5px] tabular-nums text-muted">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <input
                id="volume-slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                disabled={!enabled}
                onChange={(e) => changeVolume(parseFloat(e.target.value))}
                className="mt-2 w-full accent-foreground"
              />
            </div>
          </div>
        </section>

      </div>
    </Dialog>
  );
}
