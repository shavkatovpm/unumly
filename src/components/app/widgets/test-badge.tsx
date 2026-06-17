import { FlaskConical } from "lucide-react";

/** Bo'lim sinov (test/beta) rejimida ekanini bildiruvchi banner.
 *  Moliya va Qarz bo'limlari tepasida ko'rsatiladi. Beta tugagach shu
 *  komponentni (va uni chaqirgan joylarni) olib tashlash kifoya. */
export function TestBadge() {
  return (
    <div
      className="mb-3 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
      style={{
        background: "oklch(0.83 0.13 80 / 0.18)",
        border: "1px solid oklch(0.75 0.14 75 / 0.4)",
      }}
    >
      <span
        className="grid size-7 shrink-0 place-items-center rounded-lg"
        style={{ background: "oklch(0.75 0.15 75 / 0.25)", color: "oklch(0.55 0.15 65)" }}
      >
        <FlaskConical className="size-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[13px] font-semibold" style={{ color: "oklch(0.5 0.14 60)" }}>
          Sinov rejimi
        </p>
        <p className="text-[11.5px]" style={{ color: "oklch(0.58 0.1 65)" }}>
          Bu bo&apos;lim hali test bosqichida — xatolar bo&apos;lishi mumkin
        </p>
      </div>
    </div>
  );
}
