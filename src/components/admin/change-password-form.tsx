"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { changeAdminPassword, type ChangePwState } from "@/app/admode/_actions";

const initial: ChangePwState = null;

export function ChangePasswordForm({ usingDefault }: { usingDefault: boolean }) {
  const [state, action, pending] = useActionState(changeAdminPassword, initial);
  const formRef = useRef<HTMLFormElement>(null);

  // Muvaffaqiyatdan keyin formani tozalash
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_0_var(--border)]">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-subtle">
          <KeyRound className="size-4 text-muted" strokeWidth={1.8} />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold tracking-[-0.01em]">
            Admin parol
          </h2>
          <p className="mt-0.5 text-[11.5px] text-faint">
            {usingDefault
              ? "Hozir env'dagi default parol ishlatilmoqda. Birinchi marta o'zgartirsangiz DB'ga yoziladi."
              : "DB'da hash sifatida saqlangan parol bilan kirilyapti."}
          </p>
        </div>
      </div>

      {usingDefault && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-warm/30 bg-warm-soft px-3 py-2 text-[12px] text-warm">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <p>Default parol ishlatilyapti — uni o&apos;zgartirish tavsiya etiladi.</p>
        </div>
      )}

      <form ref={formRef} action={action} className="space-y-3">
        <Field
          name="currentPassword"
          label="Joriy parol"
          placeholder={usingDefault ? "Env default parol" : "Joriy parol"}
          autoComplete="current-password"
        />
        <Field
          name="newPassword"
          label="Yangi parol"
          placeholder="Kamida 6 ta belgi"
          autoComplete="new-password"
        />
        <Field
          name="confirmPassword"
          label="Yangi parol (qaytaring)"
          placeholder="Yangi parolni takrorlang"
          autoComplete="new-password"
        />

        {state?.error && (
          <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[12px] text-danger">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <p>{state.error}</p>
          </div>
        )}
        {state?.success && (
          <div className="flex items-start gap-2 rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-[12px] text-accent">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
            <p>Parol o&apos;zgartirildi. Keyingi kirishda yangisini ishlating.</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className={cn(
              "rounded-md px-4 py-2 text-[12px] font-medium transition-opacity",
              pending
                ? "cursor-wait bg-foreground/60 text-background"
                : "bg-foreground text-background hover:opacity-90",
            )}
          >
            {pending ? "Saqlanmoqda..." : "Parolni o'zgartirish"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  autoComplete,
}: {
  name: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.15em] text-faint">
        {label}
      </label>
      <input
        type="password"
        name={name}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] placeholder:text-faint focus:border-border-strong focus:outline-none"
      />
    </div>
  );
}
