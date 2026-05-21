import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BLOG_POSTS } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "Blog: Productivity va vaqt boshqarish haqida",
  description:
    "Unumly blogi: vaqt boshqarish, rejalashtirish va samaradorlik haqida o'zbek tilidagi maqolalar. Time blocking, Pomodoro, kunlik reja tuzish va boshqalar.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog: Unumly",
    description:
      "Vaqt boshqarish, rejalashtirish va samaradorlik haqida o'zbek tilidagi maqolalar.",
    url: "https://unumly.uz/blog",
  },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  return (
    <>
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
        <nav className="mb-12" aria-label="Breadcrumb">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint hover:text-foreground"
          >
            ← Bosh sahifa
          </Link>
        </nav>

        <header className="mb-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint">
            Blog
          </p>
          <h1 className="mt-3 text-balance text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.05] tracking-[-0.025em]">
            Vaqt va rejalashtirish haqida
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
            Vaqtni boshqarish, kunlik rejalashtirish, samaradorlik uslublari va
            Unumly ilovasidan unumli foydalanish bo&apos;yicha o&apos;zbekcha
            maqolalar.
          </p>
        </header>

        <section className="divide-y divide-border/70">
          {BLOG_POSTS.map((p) => (
            <article key={p.slug} className="py-6 first:pt-0">
              <Link href={`/blog/${p.slug}`} className="group block">
                <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
                  <time dateTime={p.publishedAt}>
                    {formatDate(p.publishedAt)}
                  </time>
                  <span aria-hidden>·</span>
                  <span>{p.readingMinutes} daqiqa o&apos;qish</span>
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
                  name: "Bosh sahifa",
                  item: "https://unumly.uz/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Blog",
                  item: "https://unumly.uz/blog",
                },
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "Blog",
              name: "Unumly Blog",
              description:
                "Vaqt boshqarish, kunlik rejalashtirish va samaradorlik haqida o'zbek tilidagi maqolalar.",
              url: "https://unumly.uz/blog",
              inLanguage: "uz",
              publisher: {
                "@type": "Organization",
                name: "Unumly",
                url: "https://unumly.uz",
              },
              blogPost: BLOG_POSTS.map((p) => ({
                "@type": "BlogPosting",
                headline: p.title,
                description: p.description,
                url: `https://unumly.uz/blog/${p.slug}`,
                datePublished: p.publishedAt,
                inLanguage: "uz",
              })),
            },
          ]),
        }}
      />
    </>
  );
}
