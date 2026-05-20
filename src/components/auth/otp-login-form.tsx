"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

export function OtpLoginForm({
  botUsername,
  redirectTo,
}: {
  botUsername: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ name: string | null } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: false });
  }, []);

  // After success, hold the confirmation briefly, then redirect
  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => {
      router.replace(redirectTo);
    }, 1200);
    return () => window.clearTimeout(t);
  }, [success, router, redirectTo]);

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const u = (data as { user?: { firstName?: string | null } })?.user;
        setSuccess({ name: u?.firstName ?? null });
        return;
      }
      if (res.status === 401) {
        setError("Kod noto'g'ri yoki muddati tugagan.");
      } else if (res.status === 429) {
        setError("Juda ko'p noto'g'ri urinish. Botdan yangi kod oling.");
      } else if (res.status === 404) {
        setError("Foydalanuvchi topilmadi.");
      } else {
        setError("Kod tasdiqlanmadi. Qaytadan urinib ko'ring.");
      }
    } catch {
      setError("Tarmoq xatosi. Internet ulanishini tekshiring.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rise-in w-full text-center" role="status" aria-live="polite">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-accent-soft">
          <Check className="size-8 text-accent check-pop" strokeWidth={3} />
        </div>
        <p className="mt-5 text-[18px] font-semibold tracking-[-0.01em] text-foreground">
          {success.name ? `Xush kelibsiz, ${success.name}!` : "Muvaffaqiyatli kirildi"}
        </p>
        <p className="mt-1.5 text-[13px] text-muted">
          Dashboard&apos;ga yo&apos;naltirilmoqda…
        </p>
        <div className="mt-4 flex items-center justify-center">
          <Loader2 className="size-4 animate-spin text-faint" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={verifyOtp} className="w-full space-y-4">
      <a
        href={`https://t.me/${botUsername}?start=login`}
        target="_blank"
        rel="noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-[14px] font-medium text-foreground transition-colors hover:bg-hover/40"
      >
        <Send className="size-4 text-accent" />
        Telegram'dan kod olish
      </a>

      <div className="flex items-center gap-3 py-1">
        <span aria-hidden className="h-px flex-1 bg-border" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          Keyin kodni kiriting
        </span>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>

      <input
        ref={inputRef}
        id="code"
        type="text"
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(digitsOnly(e.target.value).slice(0, 6))}
        required
        aria-label="6 xonali kod"
        className="w-full rounded-md border border-border bg-surface px-3.5 py-3.5 text-center font-mono text-[26px] tabular-nums tracking-[0.4em] placeholder:text-faint/40 focus:border-foreground focus:outline-none"
      />

      {error && <p className="text-[12.5px] text-danger">{error}</p>}

      <button
        type="submit"
        disabled={code.length !== 6 || submitting}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-3 text-[14px] font-medium text-background transition-opacity",
          (code.length !== 6 || submitting) && "cursor-not-allowed opacity-60"
        )}
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            Kirish
            <ArrowRight className="size-4" />
          </>
        )}
      </button>
    </form>
  );
}
