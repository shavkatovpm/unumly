import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BLOG_POSTS_RU } from "@/lib/blog-posts";
import { BlogLangSwitch } from "@/components/blog/lang-switch";

export const metadata: Metadata = {
  title: "Блог о продуктивности и планировании",
  description:
    "Блог Unumly на русском: планирование дня, постановка целей, методы продуктивности и разбор мыслительных приёмов вроде обратного мышления.",
  alternates: {
    canonical: "/blog/ru",
    languages: {
      "ru-RU": "/blog/ru",
      "uz-UZ": "/blog",
    },
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    title: "Блог Unumly",
    description:
      "Планирование дня, цели и методы продуктивности — статьи на русском языке.",
    url: "https://unumly.uz/blog/ru",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogRuPage() {
  return (
    <>
      <main
        lang="ru"
        className="mx-auto min-h-screen max-w-3xl px-6 py-12 sm:px-8 sm:py-16"
      >
        <nav
          className="mb-12 flex items-center justify-between gap-4"
          aria-label="Хлебные крошки"
        >
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint hover:text-foreground"
          >
            ← Главная
          </Link>
          <BlogLangSwitch active="ru" uzHref="/blog" ruHref="/blog/ru" />
        </nav>

        <header className="mb-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint">
            Блог
          </p>
          <h1 className="mt-3 text-balance text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.05] tracking-[-0.025em]">
            О времени и планировании
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
            Статьи на русском о планировании дня, постановке целей и способах
            довести задуманное до конца. Полный архив пока на узбекском —{" "}
            <Link
              href="/blog"
              className="text-foreground underline-offset-4 hover:underline"
            >
              смотреть все статьи
            </Link>
            .
          </p>
        </header>

        <section className="divide-y divide-border/70">
          {BLOG_POSTS_RU.map((p) => (
            <article key={p.slug} className="py-6 first:pt-0">
              <Link href={`/blog/ru/${p.slug}`} className="group block">
                <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
                  <time dateTime={p.publishedAt}>
                    {formatDate(p.publishedAt)}
                  </time>
                  <span aria-hidden>·</span>
                  <span>{p.readingMinutes} мин чтения</span>
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Главная",
                  item: "https://unumly.uz/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Блог",
                  item: "https://unumly.uz/blog/ru",
                },
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "Blog",
              name: "Блог Unumly",
              description:
                "Планирование дня, цели и методы продуктивности — статьи на русском языке.",
              url: "https://unumly.uz/blog/ru",
              inLanguage: "ru",
              publisher: {
                "@type": "Organization",
                name: "Unumly",
                url: "https://unumly.uz",
              },
              blogPost: BLOG_POSTS_RU.map((p) => ({
                "@type": "BlogPosting",
                headline: p.title,
                description: p.description,
                url: `https://unumly.uz/blog/ru/${p.slug}`,
                datePublished: p.publishedAt,
                inLanguage: "ru",
              })),
            },
          ]),
        }}
      />
    </>
  );
}
