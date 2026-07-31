import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { BlogLangSwitch } from "@/components/blog/lang-switch";
import {
  BLOG_INDEX_PATHS,
  type BlogLang,
  type BlogPost,
} from "@/lib/blog-posts";

const SITE = "https://unumly.uz";
export const BOT_URL = "https://t.me/unumlybot";

const LOCALE: Record<BlogLang, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};

const T: Record<
  BlogLang,
  { back: string; read: string; faq: string; home: string; blog: string }
> = {
  uz: {
    back: "← Blog",
    read: "daqiqa o'qish",
    faq: "Ko'p so'raladigan savollar",
    home: "Bosh sahifa",
    blog: "Blog",
  },
  ru: {
    back: "← Блог",
    read: "мин чтения",
    faq: "Частые вопросы",
    home: "Главная",
    blog: "Блог",
  },
  en: {
    back: "← Blog",
    read: "min read",
    faq: "Frequently asked questions",
    home: "Home",
    blog: "Blog",
  },
};

export type QA = { q: string; a: string };
export type Step = { name: string; text: string };

/** H2 + matn bloki. Har bo'lim mustaqil o'qilishi uchun alohida section. */
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Raqamlangan qadamlar ro'yxati (HowTo sxemasi bilan bir xil matn). */
export function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-5">
      {steps.map((s, i) => (
        <li key={s.name} className="flex gap-4">
          <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="text-[16px] font-medium text-foreground">{s.name}</h3>
            <p className="mt-1 text-[14.5px] leading-relaxed text-muted">
              {s.text}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Jadval uchun mobil scroll konteyneri. */
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[14.5px]">{children}</table>
    </div>
  );
}

export type ArticleProps = {
  lang: BlogLang;
  post: BlogPost;
  /** Sahifadagi H1 (metadata title'dan uzunroq bo'lishi mumkin) */
  h1: string;
  /** Uch tildagi yo'llar — til almashtirgich va breadcrumb uchun */
  paths: Record<BlogLang, string>;
  /** Oxirgi yangilangan sana (ISO) */
  updated: string;
  /** Birinchi paragraf — to'g'ridan-to'g'ri javob (AEO) */
  answer: ReactNode;
  /** FAQ bo'limi — sahifa oxirida va FAQPage sxemasida */
  faq: QA[];
  /** Yakuniy CTA bloki */
  cta: {
    eyebrow: string;
    title: string;
    text: string;
    botLabel: string;
    siteLabel: string;
    siteHref: string;
  };
  /** Qo'shimcha JSON-LD obyektlari (masalan HowTo) */
  schema?: object[];
  /** Maqola tanasi — Section komponentlari */
  children: ReactNode;
};

/**
 * Blog maqolasining umumiy karkasi: navigatsiya, sarlavha, matn, FAQ, CTA va
 * JSON-LD. Har til uchun alohida statik sahifa shu komponentdan foydalanadi,
 * shuning uchun SEO belgilari barcha tillarda bir xil to'liqlikda chiqadi.
 */
export function BlogArticle({
  lang,
  post,
  h1,
  paths,
  updated,
  answer,
  faq,
  cta,
  schema = [],
  children,
}: ArticleProps) {
  const t = T[lang];
  const url = `${SITE}${paths[lang]}`;
  const blogHref = BLOG_INDEX_PATHS[lang];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t.home, item: `${SITE}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: t.blog,
          item: `${SITE}${blogHref}`,
        },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      url,
      datePublished: post.publishedAt,
      dateModified: updated,
      inLanguage: lang,
      author: { "@type": "Organization", name: "Unumly" },
      publisher: {
        "@type": "Organization",
        name: "Unumly",
        logo: { "@type": "ImageObject", url: `${SITE}/logo.png` },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      workTranslation: (["uz", "ru", "en"] as BlogLang[])
        .filter((l) => l !== lang)
        .map((l) => ({
          "@type": "BlogPosting",
          url: `${SITE}${paths[l]}`,
          inLanguage: l,
        })),
    },
    ...schema,
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: lang,
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <>
      <main
        lang={lang}
        className="mx-auto min-h-screen max-w-2xl px-6 py-12 sm:px-8 sm:py-16"
      >
        <nav
          className="mb-10 flex items-center justify-between gap-4"
          aria-label="Breadcrumb"
        >
          <Link
            href={blogHref}
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint hover:text-foreground"
          >
            {t.back}
          </Link>
          <BlogLangSwitch active={lang} paths={paths} />
        </nav>

        <header className="mb-10">
          <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString(LOCALE[lang], {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span aria-hidden>·</span>
            <span>
              {post.readingMinutes} {t.read}
            </span>
          </div>
          <h1 className="mt-3 text-balance text-[clamp(1.75rem,4.5vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.02em]">
            {h1}
          </h1>
          <p className="mt-5 text-[15.5px] leading-relaxed text-muted">
            {post.description}
          </p>
        </header>

        <article className="space-y-7 text-[15px] leading-[1.7] text-foreground/85">
          <aside className="rounded-md border-l-2 border-foreground/30 bg-subtle/40 py-3 pl-4 pr-3">
            <p className="text-[14.5px] leading-relaxed">{answer}</p>
          </aside>

          {children}

          <section className="border-t border-border pt-7">
            <h2 className="mb-5 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              {t.faq}
            </h2>
            <dl className="space-y-5">
              {faq.map((f) => (
                <div key={f.q}>
                  <dt className="text-[15.5px] font-medium text-foreground">
                    {f.q}
                  </dt>
                  <dd className="mt-1.5 text-[14.5px] leading-relaxed text-muted">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </article>

        <section className="mt-14 rounded-lg border border-border bg-subtle/40 px-6 py-8">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint">
            {cta.eyebrow}
          </p>
          <h2 className="mt-2 text-[18px] font-medium tracking-[-0.01em]">
            {cta.title}
          </h2>
          <p className="mt-2 text-[14px] text-muted">{cta.text}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <a
              href={BOT_URL}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
            >
              <Send className="size-4" />
              {cta.botLabel}
            </a>
            <Link
              href={cta.siteHref}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-5 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-subtle"
            >
              {cta.siteLabel}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}

/** HowTo sxemasi — qadamli maqolalar uchun. */
export function howToSchema(
  lang: BlogLang,
  name: string,
  description: string,
  steps: Step[],
  totalTime?: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    inLanguage: lang,
    ...(totalTime ? { totalTime } : {}),
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}
