"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { loginAdmin, type LoginState } from "@/app/admode/_actions";

const initial: LoginState = null;

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(loginAdmin, initial);
  const error = state?.error;

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <form
        action={action}
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-lg bg-subtle">
            <Lock className="size-4 text-muted" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-[-0.01em]">
              Admin panel
            </h1>
            <p className="text-[12px] text-faint">Parol kiriting</p>
          </div>
        </div>

        <input
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Parol"
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2 text-[14px] placeholder:text-faint focus:outline-none",
            error ? "border-danger" : "border-border focus:border-border-strong",
          )}
        />
        {error && (
          <p className="mt-1.5 text-[11px] text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className={cn(
            "mt-4 w-full rounded-md px-3 py-2 text-[13px] font-medium transition-opacity",
            pending
              ? "cursor-wait bg-foreground/60 text-background"
              : "bg-foreground text-background hover:opacity-90",
          )}
        >
          {pending ? "Tekshirilmoqda..." : "Kirish"}
        </button>
      </form>
    </div>
  );
}
