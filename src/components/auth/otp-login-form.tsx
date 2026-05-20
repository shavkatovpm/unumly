"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Stage = "phone" | "code";

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
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0); // seconds until next OTP allowed

  const codeInputRef = useRef<HTMLInputElement>(null);

  // Countdown for "Resend in Ns"
  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [remaining]);

  // Autofocus code input when entering stage 2
  useEffect(() => {
    if (stage === "code") codeInputRef.current?.focus();
  }, [stage]);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStage("code");
        setRemaining(60);
        setInfo("Telegram'dan kod yuborildi — 5 daqiqa ichida kiriting.");
        setCode("");
      } else if (res.status === 404) {
        setError(
          data?.hint ??
            "Bu raqam ro'yxatdan o'tmagan. Avval @unumlybot ga kirib telefon raqamini ulashing."
        );
      } else if (res.status === 429 && data?.retryAfterSec) {
        setRemaining(Number(data.retryAfterSec));
        setError(`Ko'p so'rov yuborildi. ${data.retryAfterSec} soniyadan keyin urinib ko'ring.`);
      } else if (res.status === 502) {
        setError("Telegram bilan bog'lanib bo'lmadi. Keyinroq urinib ko'ring.");
      } else {
        setError("Raqam noto'g'ri. Format: +998901234567");
      }
    } catch {
      setError("Tarmoq xatosi. Internet ulanishini tekshiring.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.replace(redirectTo);
        return;
      }
      if (res.status === 401 && data?.attemptsLeft !== undefined) {
        setError(`Kod noto'g'ri. Yana ${data.attemptsLeft} urinish qoldi.`);
      } else if (res.status === 429) {
        setError("Juda ko'p noto'g'ri urinish. Yangi kod so'rang.");
      } else if (data?.error === "no_active_code") {
        setError("Kod muddati tugagan. Yangi kod so'rang.");
      } else {
        setError("Kod tasdiqlanmadi. Qaytadan urinib ko'ring.");
      }
    } catch {
      setError("Tarmoq xatosi.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetToPhone() {
    setStage("phone");
    setCode("");
    setError(null);
    setInfo(null);
  }

  if (stage === "phone") {
    return (
      <form onSubmit={requestOtp} className="w-full space-y-3">
        <label htmlFor="phone" className="block text-[12px] uppercase tracking-[0.18em] text-faint">
          Telefon raqami
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+998 90 123 45 67"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full rounded-md border border-border bg-surface px-3.5 py-3 text-[15px] placeholder:text-faint focus:border-foreground focus:outline-none"
        />
        {error && (
          <p className="text-[12.5px] text-danger">{error}</p>
        )}
        <button
          type="submit"
          disabled={!phone.trim() || submitting}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-3 text-[14px] font-medium text-background transition-opacity",
            (!phone.trim() || submitting) && "cursor-not-allowed opacity-60"
          )}
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Kod yuborish
              <ArrowRight className="size-4" />
            </>
          )}
        </button>

        <p className="pt-2 text-center text-[11.5px] text-faint">
          Ro&apos;yxatdan o&apos;tmaganmisiz?{" "}
          <a
            href={`https://t.me/${botUsername}?start=signup`}
            target="_blank"
            rel="noreferrer"
            className="text-muted underline decoration-faint/60 underline-offset-2 hover:text-foreground"
          >
            @{botUsername} ga kiring
          </a>
        </p>
      </form>
    );
  }

  // stage === "code"
  return (
    <form onSubmit={verifyOtp} className="w-full space-y-3">
      <label htmlFor="code" className="block text-[12px] uppercase tracking-[0.18em] text-faint">
        Telegram'dan kelgan kod
      </label>
      <input
        ref={codeInputRef}
        id="code"
        type="text"
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(digitsOnly(e.target.value).slice(0, 6))}
        required
        className="w-full rounded-md border border-border bg-surface px-3.5 py-3 text-center font-mono text-[22px] tabular-nums tracking-[0.4em] placeholder:text-faint focus:border-foreground focus:outline-none"
      />
      {info && !error && (
        <p className="text-[12.5px] text-muted">{info}</p>
      )}
      {error && (
        <p className="text-[12.5px] text-danger">{error}</p>
      )}
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

      <div className="flex items-center justify-between pt-1 text-[12px]">
        <button
          type="button"
          onClick={resetToPhone}
          className="text-faint hover:text-foreground"
        >
          ← Telefonni o&apos;zgartirish
        </button>
        <button
          type="button"
          onClick={requestOtp}
          disabled={remaining > 0 || submitting}
          className={cn(
            "inline-flex items-center gap-1 transition-colors",
            remaining > 0 || submitting
              ? "cursor-not-allowed text-faint/60"
              : "text-muted hover:text-foreground"
          )}
        >
          <RotateCcw className="size-3" />
          {remaining > 0 ? `Qayta yuborish (${remaining}s)` : "Qayta yuborish"}
        </button>
      </div>
    </form>
  );
}
