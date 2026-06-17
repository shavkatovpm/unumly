/** Bo'lim sinov (test/beta) rejimida ekanini bildiruvchi kichik belgi.
 *  Moliya va Qarz bo'limlari sarlavhasida ko'rsatiladi. Beta tugagach
 *  shu komponentni olib tashlash kifoya. */
export function TestBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none ${className ?? ""}`}
      style={{ background: "oklch(0.8 0.12 80 / 0.16)", color: "oklch(0.58 0.13 70)" }}
      title="Bu bo'lim hozircha sinov (test) rejimida — xatolar bo'lishi mumkin"
    >
      <span className="size-1.5 rounded-full" style={{ background: "oklch(0.7 0.16 70)" }} />
      Sinov rejimi
    </span>
  );
}
