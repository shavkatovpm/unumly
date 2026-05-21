import "server-only";

const BASE = "https://api.telegram.org";

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN env is not set");
  return t;
}

type SendMessageParams = {
  chat_id: number | string;
  text: string;
  parse_mode?: "Markdown" | "MarkdownV2" | "HTML";
  reply_markup?: unknown;
  disable_notification?: boolean;
};

export async function sendMessage(params: SendMessageParams) {
  const res = await fetch(`${BASE}/bot${token()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`sendMessage failed (${res.status}): ${body}`);
  }
  return res.json();
}

/** Ask the user to share their phone number via a one-tap button. */
export async function askForContact(chatId: number | string) {
  return sendMessage({
    chat_id: chatId,
    text:
      "Salom! Unumly'ga kirish uchun telefon raqamingizni ulashing — bu sizga websaytda kod orqali login qilish imkonini beradi.\n\n" +
      "Pastdagi tugmani bosing 👇",
    reply_markup: {
      keyboard: [
        [
          {
            text: "📱 Telefon raqamni ulashish",
            request_contact: true,
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

export async function sendOtpMessage(chatId: number | string, code: string) {
  return sendMessage({
    chat_id: chatId,
    text:
      `🔐 *Unumly kirish kodi*\n\n` +
      `\`${code}\`\n\n` +
      `Kodni unumly.uz/kirish sahifasiga kiriting. 10 daqiqa amal qiladi.`,
    parse_mode: "Markdown",
  });
}

/** Send a confirmation with a Mini App button after a successful web login. */
export async function sendLoginSuccess(chatId: number | string, appUrl: string) {
  return sendMessage({
    chat_id: chatId,
    text:
      `✅ Muvaffaqiyatli kirildi!\n\n` +
      `Unumly ilovasidan foydalanish uchun pastdagi tugmani bosing 👇`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 START", web_app: { url: appUrl } }],
      ],
    },
  });
}

/** Greet a returning registered user — Mini App button, no code. */
export async function sendStartWelcome(chatId: number | string, appUrl: string) {
  return sendMessage({
    chat_id: chatId,
    text:
      `👋 Xush kelibsiz!\n\n` +
      `Pastdagi tugma orqali Unumly ilovasini oching.`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Unumly Mini App", web_app: { url: appUrl } }],
      ],
    },
  });
}

/** Onboarding completion message — Mini App button alongside the OTP. */
export async function sendOnboardingComplete(
  chatId: number | string,
  appUrl: string,
  code: string
) {
  return sendMessage({
    chat_id: chatId,
    text:
      `✅ Ro'yxatdan o'tdingiz!\n\n` +
      `Pastdagi tugma orqali ilovani darxol oching.\n\n` +
      `Saytda kirish kerak bo'lsa — kodingiz:\n\`${code}\` (10 daqiqa amal qiladi)`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Unumly Mini App", web_app: { url: appUrl } }],
      ],
    },
  });
}

/* ─── Reminder helpers ────────────────────────────────────── */

/**
 * Send a task reminder to a user. Returns the Telegram message id so we
 * can edit it later (when the plan status changes from the app).
 */
export async function sendTaskReminder(opts: {
  chatId: number | string;
  planId: string;
  title: string;
  time?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | null;
  appUrl: string;
}): Promise<number> {
  const PRIORITY_ICON: Record<string, string> = {
    HIGH:   "🔴",
    MEDIUM: "🟡",
    LOW:    "🟢",
  };
  const icon = opts.priority ? (PRIORITY_ICON[opts.priority] ?? "") : "";
  const timeText = opts.time ? ` · ${opts.time}` : "";

  const res = await fetch(`${BASE}/bot${token()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: opts.chatId,
      text: `⏰ *Eslatma*${timeText}\n\n${icon ? icon + " " : ""}${escapeMarkdown(opts.title)}`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[
          { text: "✓ Bajardim",  callback_data: `done:${opts.planId}` },
          { text: "→ Kirish",    web_app: { url: opts.appUrl } },
        ]],
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`sendTaskReminder failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { result?: { message_id?: number } };
  const id = data?.result?.message_id;
  if (typeof id !== "number") throw new Error("sendTaskReminder: missing message_id");
  return id;
}

/** Mark a reminder as completed: remove buttons, prepend ✅. Best-effort. */
export async function markReminderDone(opts: {
  chatId: number | string;
  messageId: number;
  title: string;
  time?: string | null;
  via: "bot" | "app";
}) {
  const timeText = opts.time ? ` · ${opts.time}` : "";
  const note = opts.via === "bot" ? "Botdan bajarildi" : "Ilovada bajarildi";
  const res = await fetch(`${BASE}/bot${token()}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: opts.chatId,
      message_id: opts.messageId,
      text: `✅ *Bajarildi*${timeText}\n\n${escapeMarkdown(opts.title)}\n\n_${note}_`,
      parse_mode: "Markdown",
    }),
  });
  // Telegram returns 400 on no-op (same text); ignore those
  if (!res.ok && res.status !== 400) {
    console.error("markReminderDone:", await res.text().catch(() => res.status));
  }
}

export async function answerCallbackQuery(id: string, text?: string) {
  await fetch(`${BASE}/bot${token()}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: id, text }),
  });
}

function escapeMarkdown(s: string): string {
  return s.replace(/([_*[\]()`])/g, "\\$1");
}

/* ─── Webhook setup helper (call once after deploy) ───────── */

export async function setWebhook(url: string, secretToken: string) {
  const res = await fetch(`${BASE}/bot${token()}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: secretToken,
      allowed_updates: ["message"],
    }),
  });
  return res.json();
}

export async function deleteWebhook() {
  const res = await fetch(`${BASE}/bot${token()}/deleteWebhook`, { method: "POST" });
  return res.json();
}
