import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { TelegramLoginWidget } from "@/components/auth/telegram-login-widget";
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

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "";
  const configured = botUsername.length > 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10">
      <MiniAppAutoLogin redirectTo={next} />

      <header className="mb-10 text-center">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint">
          Kirish
        </p>
        <h1 className="mt-3 text-balance text-[28px] font-medium leading-tight tracking-[-0.02em] sm:text-[36px]">
          Telegram orqali kiring
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-muted">
          Alohida ro&apos;yxatdan o&apos;tish shart emas. Telegram tugmasini
          bosing — rejalaringiz akkauntingizga bog&apos;lanadi va istalgan
          qurilmadan ochiladi.
        </p>
      </header>

      <div className="flex flex-col items-center gap-4">
        {configured ? (
          <TelegramLoginWidget botUsername={botUsername} redirectTo={next} />
        ) : (
          <div className="rounded-md border border-dashed border-border bg-surface/40 px-5 py-4 text-center">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
              Bot sozlanmagan
            </p>
            <p className="mt-2 text-[13px] text-muted">
              Administrator <code className="rounded bg-subtle px-1 py-0.5 font-mono text-[12px]">TELEGRAM_BOT_USERNAME</code>{" "}
              env-ni sozlashi kerak.
            </p>
          </div>
        )}

        <p className="text-center text-[12px] text-faint">
          Telegram&apos;da Unumly bot ochilsa, login avtomatik amalga oshadi.
        </p>
      </div>

      <nav className="mt-12">
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
