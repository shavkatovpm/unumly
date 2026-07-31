import Link from "next/link";
import type { BlogLang } from "@/lib/blog-posts";

const LABEL: Record<BlogLang, string> = { uz: "Uz", ru: "Ru", en: "En" };
const ORDER: BlogLang[] = ["uz", "ru", "en"];

type Props = {
  /** Joriy sahifa tili */
  active: BlogLang;
  /** Har til uchun yo'l — maqolaning shu tildagi versiyasi */
  paths: Record<BlogLang, string>;
};

/**
 * Blog uchun til almashtirgich (Uz / Ru / En).
 * Server component — qo'shimcha client JS yuklamaydi.
 */
export function BlogLangSwitch({ active, paths }: Props) {
  const base =
    "rounded px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] transition-colors";

  return (
    <div className="flex items-center gap-0.5" aria-label="Til / Язык / Language">
      {ORDER.map((lang, i) => (
        <span key={lang} className="flex items-center gap-0.5">
          {i > 0 && (
            <span aria-hidden className="text-faint/50">
              /
            </span>
          )}
          <Link
            href={paths[lang]}
            hrefLang={lang}
            aria-current={active === lang ? "page" : undefined}
            className={
              active === lang
                ? `${base} bg-subtle text-foreground`
                : `${base} text-faint hover:text-foreground`
            }
          >
            {LABEL[lang]}
          </Link>
        </span>
      ))}
    </div>
  );
}
