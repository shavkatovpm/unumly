"use client";

import { cn } from "@/lib/utils";

/** Tayyor davomiylik presetlari (daqiqa). */
export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

/**
 * Davomiylik tanlash — tayyor presetlar + ixtiyoriy (istalgan son) maydoni.
 * `value` undefined bo'lsa hech biri tanlanmagan. `max` berilsa, undan oshgan
 * presetlar o'chiriladi (keyingi reja bilan to'qnashuv).
 */
export function DurationPicker({
  value,
  onChange,
  max = null,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  max?: number | null;
}) {
  const isCustom = value != null && !DURATION_PRESETS.includes(value);
  const customConflict = isCustom && max != null && (value as number) > max;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {DURATION_PRESETS.map((d) => {
        const conflict = max != null && d > max;
        return (
          <button
            key={d}
            type="button"
            disabled={conflict}
            onClick={() => onChange(value === d ? undefined : d)}
            title={conflict ? "Keyingi reja bilan to'qnashadi" : undefined}
            className={cn(
              "rounded-md border px-2 py-1 font-mono text-[11px] tabular-nums transition-colors",
              conflict
                ? "cursor-not-allowed border-border/40 text-faint/50 line-through"
                : value === d
                ? "border-accent bg-accent text-accent-ink"
                : "border-border text-muted hover:bg-hover hover:text-foreground"
            )}
          >
            {d}m
          </button>
        );
      })}

      {/* Ixtiyoriy — istalgan daqiqa */}
      <label
        title={customConflict ? "Keyingi reja bilan to'qnashadi" : undefined}
        className={cn(
          "flex items-center rounded-md border py-1 pl-2 pr-1.5 transition-colors",
          customConflict
            ? "border-danger/60 bg-danger-soft"
            : isCustom
            ? "border-accent bg-accent"
            : "border-dashed border-border hover:border-border-strong"
        )}
      >
        <input
          type="text"
          inputMode="numeric"
          value={isCustom ? String(value) : ""}
          onChange={(e) => {
            const n = e.target.value.replace(/\D/g, "").slice(0, 3);
            onChange(n ? Number(n) : undefined);
          }}
          placeholder="ixt"
          aria-label="Ixtiyoriy davomiylik (daqiqa)"
          className={cn(
            "w-8 bg-transparent text-center font-mono text-[11px] tabular-nums outline-none",
            customConflict
              ? "text-danger placeholder:text-faint/60"
              : isCustom
              ? "text-accent-ink placeholder:text-accent-ink/60"
              : "text-foreground placeholder:text-faint/60"
          )}
        />
        <span
          className={cn(
            "font-mono text-[11px]",
            customConflict ? "text-danger" : isCustom ? "text-accent-ink" : "text-faint"
          )}
        >
          m
        </span>
      </label>
    </div>
  );
}
