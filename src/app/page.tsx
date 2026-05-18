import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
      />

      <header className="px-6 py-6 sm:px-10">
        <Wordmark className="text-base" />
      </header>

      <section className="flex flex-1 items-center justify-center px-6 sm:px-10">
        <div className="w-full max-w-xl text-center">
          <p className="rise-in mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted backdrop-blur-sm">
            <span className="size-1 rounded-full bg-accent" />
            Lokal rejim — ma'lumotlar shu brauzerda saqlanadi
          </p>

          <h1
            className="rise-in text-balance text-4xl font-medium leading-[1.1] tracking-[-0.03em] text-foreground sm:text-6xl"
            style={{ animationDelay: "60ms" }}
          >
            Rejalaringizni
            <br />
            tinchgina yuriting.
          </h1>

          <p
            className="rise-in mx-auto mt-6 max-w-md text-balance text-[15px] leading-relaxed text-muted sm:text-base"
            style={{ animationDelay: "140ms" }}
          >
            Kunlik, haftalik, oylik va yillik ishlaringizni bir joyda
            tartibga soling. Ortiqcha hech narsa — faqat siz va rejalaringiz.
          </p>

          <div
            className="rise-in mt-10 flex flex-col items-center gap-3"
            style={{ animationDelay: "220ms" }}
          >
            <Link
              href="/bugun"
              className={buttonVariants({ variant: "accent", size: "lg" }) + " min-w-56"}
            >
              Boshlash
              <ArrowRight className="size-4" />
            </Link>
            <p className="text-xs text-faint">
              Ro'yxatdan o'tish shart emas — darhol foydalaning.
            </p>
          </div>

          <ul
            className="rise-in mx-auto mt-16 flex max-w-md items-center justify-between text-[11px] uppercase tracking-[0.18em] text-faint"
            style={{ animationDelay: "320ms" }}
          >
            <li>Kun</li>
            <li className="text-border">·</li>
            <li>Hafta</li>
            <li className="text-border">·</li>
            <li>Oy</li>
            <li className="text-border">·</li>
            <li>Yil</li>
          </ul>
        </div>
      </section>

      <footer className="px-6 py-6 text-center text-xs text-faint sm:px-10">
        © {new Date().getFullYear()} unumly.uz
      </footer>
    </main>
  );
}
