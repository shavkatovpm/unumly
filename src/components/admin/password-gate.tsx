"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// UI-only parol gate. Keyin Auth.js / proper backend bilan almashtiriladi.
// localStorage'da saqlanadi shu sababli sahifa yangilanganda ham eslab qoladi.
const STORAGE_KEY = "unumly:admin:auth";
const ADMIN_PASSWORD = "unumlyad321";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      setAuthed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setAuthed(false);
    }
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /**/ }
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
      setInput("");
    }
  }

  if (authed === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-6 animate-pulse rounded-full bg-subtle" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <form
          onSubmit={submit}
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
            type="password"
            autoFocus
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError(false);
            }}
            placeholder="Parol"
            className={cn(
              "w-full rounded-md border bg-background px-3 py-2 text-[14px] placeholder:text-faint focus:outline-none",
              error
                ? "border-danger"
                : "border-border focus:border-border-strong"
            )}
          />
          {error && (
            <p className="mt-1.5 text-[11px] text-danger">Parol noto&apos;g&apos;ri</p>
          )}

          <button
            type="submit"
            disabled={!input}
            className={cn(
              "mt-4 w-full rounded-md px-3 py-2 text-[13px] font-medium transition-opacity",
              !input
                ? "cursor-not-allowed bg-foreground/40 text-background"
                : "bg-foreground text-background hover:opacity-90"
            )}
          >
            Kirish
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}

export function adminLogout() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /**/ }
  window.location.href = "/admode";
}
