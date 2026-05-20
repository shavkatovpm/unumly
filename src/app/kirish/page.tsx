import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { OtpLoginForm } from "@/components/auth/otp-login-form";
import { MiniAppAutoLogin } from "@/components/auth/mini-app-autologin";

export const metadata: Metadata = {
  title: "Kirish",
  description: "Unumly'ga Telegram orqali kiring.",
  robots: { index: false, follow: false },
};

export default async function KirishPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp?.next || "/bugun";

  // Already signed in? Skip the login screen.
  const user = await getSessionUser();
  if (user) redirect(next);

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "unumlybot";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10">
      {/* In Mini App: auto-login via initData (skips OTP entirely) */}
      <MiniAppAutoLogin redirectTo={next} />

      <header className="mb-8 text-center">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint">
          Kirish
        </p>
        <h1 className="mt-3 text-balance text-[28px] font-medium leading-tight tracking-[-0.02em] sm:text-[34px]">
          Telegram orqali kiring
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline decoration-faint/60 underline-offset-2"
          >
            @{botUsername}
          </a>{" "}
          dan bir martalik kod olib, shu yerga kiriting.
        </p>
      </header>

      <OtpLoginForm botUsername={botUsername} redirectTo={next} />

      <p className="mt-8 max-w-sm text-center text-[11.5px] leading-relaxed text-faint">
        Birinchi marta? Tugmani bossangiz bot ochiladi, <strong>/start</strong>{" "}
        bosib telefon raqamingizni ulashasiz — kod darxol DM'ga keladi.
      </p>

      <nav className="mt-10">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint hover:text-foreground"
        >
          ← Bosh sahifaga
        </Link>
      </nav>
    </main>
  );
}
