"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { Reveal } from "./reveal";
import { Hero } from "./hero";
import { AppMockup } from "./app-mockup";
import { FinanceMockup } from "./finance-mockup";
import { StickyShowcase } from "./showcase";
import { MODULES, PLANS } from "./data";
import { useT, useLang, LANGS } from "./i18n";

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5">
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setLang(l.id)}
          aria-pressed={lang === l.id}
          className={cn(
            "rounded-full px-2 py-1 text-[11px] font-medium transition-colors",
            lang === l.id
              ? "bg-foreground text-background"
              : "text-muted hover:text-foreground"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export function Landing() {
  const t = useT();
  const { lang } = useLang();

  const scrollTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="min-h-screen bg-subtle/50">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5">
          <button
            type="button"
            onClick={scrollTop}
            aria-label="unumly"
            className="shrink-0 transition-opacity hover:opacity-80"
          >
            <Wordmark className="text-[17px]" />
          </button>

          <div className="hidden items-center gap-7 md:flex">
            <a
              href="#imkoniyatlar"
              className="text-[13px] text-muted transition-colors hover:text-foreground"
            >
              {t.nav.features}
            </a>
            <a
              href="#narx"
              className="text-[13px] text-muted transition-colors hover:text-foreground"
            >
              {t.nav.price}
            </a>
            <Link
              href="/blog"
              className="text-[13px] text-muted transition-colors hover:text-foreground"
            >
              {t.nav.blog}
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <LangToggle />
            <Link
              href="/bugun"
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
            >
              {t.nav.login} <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        {/* Hero */}
        <Hero key={lang} />

        {/* Showcase 1 — Bugun */}
        <div className="mt-20 sm:mt-28">
          <Reveal className="mx-auto mb-7 max-w-xl text-center">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-faint">
              {t.showcase1.eyebrow}
            </p>
            <h2 className="mt-3 text-[clamp(1.4rem,3.5vw,2rem)] font-medium tracking-[-0.02em]">
              {t.showcase1.title}
            </h2>
          </Reveal>
          <StickyShowcase
            key={`bugun-${lang}`}
            activeKey="bugun"
            url="unumly.uz/bugun"
          >
            <AppMockup />
          </StickyShowcase>
        </div>

        {/* Showcase 2 — Moliya */}
        <div className="mt-20 sm:mt-28">
          <Reveal className="mx-auto mb-7 max-w-xl text-center">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-faint">
              {t.showcase2.eyebrow}
            </p>
            <h2 className="mt-3 text-[clamp(1.4rem,3.5vw,2rem)] font-medium tracking-[-0.02em]">
              {t.showcase2.title}
            </h2>
          </Reveal>
          <StickyShowcase
            key={`moliya-${lang}`}
            activeKey="moliya"
            url="unumly.uz/moliya"
          >
            <FinanceMockup />
          </StickyShowcase>
        </div>

        {/* Imkoniyatlar */}
        <section id="imkoniyatlar" className="scroll-mt-20 py-20 sm:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-faint">
              {t.features.eyebrow}
            </p>
            <h2 className="mt-4 text-[clamp(1.5rem,4vw,2.25rem)] font-medium tracking-[-0.02em]">
              {t.features.title}
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {MODULES.map((m, i) => {
              const mod = t.modules[m.key];
              return (
                <Reveal
                  key={m.key}
                  delay={(i % 4) * 60}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <m.icon className="size-[17px]" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-medium tracking-tight">
                      {mod.title}
                    </h3>
                    <p className="mt-0.5 text-[12px] leading-snug text-muted">
                      {mod.short}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Narx */}
        <section id="narx" className="scroll-mt-20 pb-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-faint">
              {t.pricing.eyebrow}
            </p>
            <h2 className="mt-4 text-[clamp(1.5rem,4vw,2.25rem)] font-medium tracking-[-0.02em]">
              {t.pricing.title}
            </h2>
            <p className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-4 py-1.5 text-[12.5px] font-medium text-foreground">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
              </span>
              {t.pricing.promoBanner}
            </p>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
            {PLANS.map((plan, i) => {
              const pl = plan.key === "pro" ? t.pricing.pro : t.pricing.free;
              return (
                <Reveal
                  key={plan.key}
                  delay={i * 90}
                  className={cn(
                    "relative flex flex-col rounded-2xl border bg-background p-7",
                    plan.featured
                      ? "border-accent/50 ring-1 ring-accent/25"
                      : "border-border"
                  )}
                >
                  {(plan.promo || plan.featured) && (
                    <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-accent-ink">
                      {plan.promo
                        ? t.pricing.pro.promoLabel
                        : t.pricing.recommended}
                    </span>
                  )}
                  <h3 className="text-[15px] font-medium">{pl.name}</h3>

                  {plan.promo ? (
                    <>
                      <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-[32px] font-medium leading-none tracking-[-0.03em]">
                          {t.pricing.pro.promoPrice}
                        </span>
                        <span className="text-[14px] text-faint line-through">
                          {t.pricing.proPrice} {t.pricing.unit}/
                          {t.pricing.periodMonthly}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[12px] text-muted">
                        {t.pricing.pro.note}
                      </p>
                    </>
                  ) : (
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="text-[32px] font-medium leading-none tracking-[-0.03em]">
                        {t.pricing.priceFree}
                      </span>
                      <span className="text-[13px] text-muted">
                        {t.pricing.unit} / {t.pricing.periodForever}
                      </span>
                    </div>
                  )}

                  <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                    {pl.features.map((feat) => (
                      <li
                        key={feat}
                        className="flex items-start gap-2.5 text-[13px]"
                      >
                        <Check
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            plan.featured ? "text-accent" : "text-muted"
                          )}
                          strokeWidth={2.25}
                        />
                        <span className="leading-snug text-foreground/90">
                          {feat}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={cn(
                      "mt-7 inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-[14px] font-medium transition-opacity hover:opacity-90",
                      plan.featured
                        ? "bg-accent text-accent-ink"
                        : "border border-border-strong text-foreground hover:bg-subtle"
                    )}
                  >
                    {pl.cta} <ArrowUpRight className="size-4" />
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-8">
          <Wordmark className="text-[15px]" showDot={false} />
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-faint">
            © {new Date().getFullYear()} unumly.uz
          </p>
        </div>
      </footer>
    </div>
  );
}
