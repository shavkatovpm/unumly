/** Inline loader — kontent yuklanayotganda ko'rsatiladi (to'lqin ustunlar).
 *  Sof CSS animatsiya, keyframe komponent ichida `<style>` orqali inject
 *  qilinadi (Tailwind/Lightning CSS uni "ishlatilmagan" deb o'chirib
 *  yubormasligi uchun). CSS animatsiya compositor'da ishlaydi — yuklanish
 *  paytida JS band bo'lsa ham (mobil) qotmaydi. `label` faqat a11y uchun. */
export function ListLoader({ label = "Yuklanmoqda…" }: { label?: string }) {
  return (
    <div
      className="fade-in flex items-center justify-center px-6"
      style={{ minHeight: "55vh" }}
      role="status"
      aria-label={label}
    >
      <style>{
        "@keyframes unumly-wave{0%,100%{transform:translateY(-7px)}50%{transform:translateY(7px)}}"
      }</style>
      <div className="flex items-center gap-1" style={{ height: 28 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="block rounded-full bg-foreground"
            style={{
              width: 5,
              height: 14,
              animation: "unumly-wave 0.9s ease-in-out infinite",
              // Manfiy delay — har katak darhol to'lqinning o'z fazasidan
              // boshlanadi (boshlang'ich "sakrash" bo'lmaydi, silliq).
              animationDelay: `${-i * 0.12}s`,
            }}
          />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
