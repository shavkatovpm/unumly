import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — Productivity va vaqt boshqarish haqida",
  description:
    "Unumly blogi: vaqt boshqarish, rejalashtirish va samaradorlik haqida o'zbek tilidagi maqolalar. Tez orada birinchi yozuvlar.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — Unumly",
    description:
      "Vaqt boshqarish, rejalashtirish va samaradorlik haqida o'zbek tilidagi maqolalar.",
    url: "https://unumly.uz/blog",
  },
};

export default function BlogPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
      <nav className="mb-12">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint hover:text-foreground"
        >
          ← Bosh sahifa
        </Link>
      </nav>

      <header className="mb-10">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint">
          Blog
        </p>
        <h1 className="mt-3 text-balance text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.05] tracking-[-0.025em]">
          Vaqt va rejalashtirish haqida
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
          Bu yerda vaqtni boshqarish, kunlik rejalashtirish, samaradorlik
          uslublari va Unumly ilovasidan unumli foydalanish bo&apos;yicha
          o&apos;zbekcha maqolalar e&apos;lon qilinadi.
        </p>
      </header>

      <section className="rounded-lg border border-dashed border-border bg-subtle/30 px-6 py-12 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
          Tez orada
        </p>
        <p className="mt-3 text-[14px] text-muted">
          Birinchi maqolalar tayyorlanmoqda — kunlik rejalashtirish
          uslublari, vazifalarni tartibga solish va kalendar bilan ishlash
          bo&apos;yicha.
        </p>
      </section>
    </main>
  );
}
