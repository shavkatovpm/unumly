import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BlogLangSwitch } from "@/components/blog/lang-switch";
import {
  BLOG_INDEX_PATHS,
  type BlogLang,
  type BlogPost,
} from "@/lib/blog-posts";

const SITE = "https://unumly.uz";

const LOCALE: Record<BlogLang, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};

const T: Record<
  BlogLang,
  { back: string; eyebrow: string; read: string; home: string; blog: string }
> = {
  uz: {
    back: "← Bosh sahifa",
    eyebrow: "Blog",
    read: "daqiqa o'qish",
    home: "Bosh sahifa",
    blog: "Blog",
  },
  ru: {
    back: "← Главная",
    eyebrow: "Блог",
    read: "мин чтения",
    home: "Главная",
    blog: "Блог",
  },
  en: {
    back: "← Home",
    eyebrow: "Blog",
    read: "min read",
    home: "Home",
    blog: "Blog",
  },
};

type Props = {
  lang: BlogLang;
  posts: BlogPost[];
  h1: string;
  lead: ReactNode;
  /** JSON-LD `Blog` uchun nom va tavsif */
  blogName: string;
  blogDescription: string;
};

/**
 * Blog indeks sahifasining umumiy karkasi. Har til uchun alohida statik
 * sahifa shu komponentdan foydalanadi — sarlavha va matn tildan keladi.
 */
export function BlogIndex({
  lang,
  posts,
  h1,
  lead,
  blogName,
  blogDescription,
}: Props) {
  const t = T[lang];
  const indexPath = BLOG_INDEX_PATHS[lang];
  const base = `${SITE}${indexPath}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t.home, item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: t.blog, item: base },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: blogName,
      description: blogDescription,
      url: base,
      inLanguage: lang,
      publisher: { "@type": "Organization", name: "Unumly", url: SITE },
      blogPost: posts.map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        description: p.description,
        url: `${base}/${p.slug}`,
        datePublished: p.publishedAt,
        inLanguage: lang,
      })),
    },
  ];

  return (
    <>
      <main
        lang={lang}
        className="mx-auto min-h-screen max-w-3xl px-6 py-12 sm:px-8 sm:py-16"
      >
        <nav
          className="mb-12 flex items-center justify-between gap-4"
          aria-label="Breadcrumb"
        >
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint hover:text-foreground"
          >
            {t.back}
          </Link>
          <BlogLangSwitch active={lang} paths={BLOG_INDEX_PATHS} />
        </nav>

        <header className="mb-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint">
            {t.eyebrow}
          </p>
          <h1 className="mt-3 text-balance text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.05] tracking-[-0.025em]">
            {h1}
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
            {lead}
          </p>
        </header>

        <section className="divide-y divide-border/70">
          {posts.map((p) => (
            <article key={p.slug} className="py-6 first:pt-0">
              <Link href={`${indexPath}/${p.slug}`} className="group block">
                <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
                  <time dateTime={p.publishedAt}>
                    {new Date(p.publishedAt).toLocaleDateString(LOCALE[lang], {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <span aria-hidden>·</span>
                  <span>
                    {p.readingMinutes} {t.read}
                  </span>
                </div>
                <h2 className="mt-2 flex items-start gap-2 text-[18px] font-medium leading-snug tracking-[-0.01em] transition-colors group-hover:text-foreground">
                  <span className="flex-1 text-balance">{p.title}</span>
                  <ArrowUpRight className="mt-1 size-4 shrink-0 text-faint transition-colors group-hover:text-foreground" />
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">
                  {p.description}
                </p>
              </Link>
            </article>
          ))}
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
