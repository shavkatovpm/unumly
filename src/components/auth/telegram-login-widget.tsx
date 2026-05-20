"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type WidgetUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    __unumlyTgAuth?: (u: WidgetUser) => void;
  }
}

/**
 * Renders the official Telegram Login Widget.
 *
 * Requires the bot's username and that the bot domain is set to the current
 * origin in BotFather (`/setdomain`).
 */
export function TelegramLoginWidget({
  botUsername,
  redirectTo = "/bugun",
  size = "large",
}: {
  botUsername: string;
  redirectTo?: string;
  size?: "small" | "medium" | "large";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    c.innerHTML = "";

    // Global callback that Telegram's widget calls on successful auth
    window.__unumlyTgAuth = async (u: WidgetUser) => {
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ widget: u }),
        });
        if (res.ok) {
          router.replace(redirectTo);
        }
      } catch {
        /* surface inline error in a future iteration */
      }
    };

    const s = document.createElement("script");
    s.async = true;
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.setAttribute("data-telegram-login", botUsername);
    s.setAttribute("data-size", size);
    s.setAttribute("data-onauth", "__unumlyTgAuth(user)");
    s.setAttribute("data-request-access", "write");
    s.setAttribute("data-radius", "8");
    c.appendChild(s);

    return () => {
      window.__unumlyTgAuth = undefined;
      c.innerHTML = "";
    };
  }, [botUsername, redirectTo, router, size]);

  return <div ref={containerRef} />;
}
