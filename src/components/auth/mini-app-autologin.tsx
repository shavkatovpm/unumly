"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type TgWebApp = {
  ready: () => void;
  initData?: string;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

/**
 * If the app is opened inside Telegram (Mini App), automatically exchange
 * `initData` for a session cookie and navigate to `redirectTo` on success.
 *
 * No-op outside Telegram (when initData is missing).
 */
export function MiniAppAutoLogin({
  redirectTo = "/bugun",
}: {
  redirectTo?: string;
}) {
  const tried = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;

    // Telegram WebApp script is loaded async in <head>; poll briefly.
    let attempts = 0;
    function tryLogin() {
      const tg = window.Telegram?.WebApp;
      if (!tg || !tg.initData) {
        if (attempts++ < 20) window.setTimeout(tryLogin, 100);
        return;
      }
      tg.ready();
      void (async () => {
        try {
          const res = await fetch("/api/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData }),
          });
          if (res.ok) router.replace(redirectTo);
        } catch {
          /* surface inline error in a future iteration */
        }
      })();
    }
    tryLogin();
  }, [redirectTo, router]);

  return null;
}
