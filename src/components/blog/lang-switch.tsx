import Link from "next/link";

type Props = {
  /** Joriy sahifa tili */
  active: "uz" | "ru";
  /** O'zbekcha versiya yo'li */
  uzHref: string;
  /** Ruscha versiya yo'li */
  ruHref: string;
};

/**
 * Blog uchun kichik til almashtirgich (UZ / RU).
 * Faqat tarjimasi mavjud sahifalarda ko'rsatiladi.
 */
export function BlogLangSwitch({ active, uzHref, ruHref }: Props) {
  const base =
    "rounded px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] transition-colors";

  return (
    <div className="flex items-center gap-1" aria-label="Til / Язык">
      <Link
        href={uzHref}
        hrefLang="uz"
        aria-current={active === "uz" ? "page" : undefined}
        className={
          active === "uz"
            ? `${base} bg-subtle text-foreground`
            : `${base} text-faint hover:text-foreground`
        }
      >
        Uz
      </Link>
      <span aria-hidden className="text-faint/60">
        /
      </span>
      <Link
        href={ruHref}
        hrefLang="ru"
        aria-current={active === "ru" ? "page" : undefined}
        className={
          active === "ru"
            ? `${base} bg-subtle text-foreground`
            : `${base} text-faint hover:text-foreground`
        }
      >
        Ru
      </Link>
    </div>
  );
}
