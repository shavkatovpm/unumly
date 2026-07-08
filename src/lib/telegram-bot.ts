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
  title: string;
  time?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | null;
  /** Actual minutes between now and the task's scheduled time (for the header).
   *  > 0 → "X daq. qoldi"; <= 0 → "vaqti keldi". */
  minutesLeft?: number;
  appUrl: string;
}): Promise<number> {
  const PRIORITY_ICON: Record<string, string> = {
    HIGH:   "🔴",
    MEDIUM: "🟡",
    LOW:    "🟢",
  };
  const icon = opts.priority ? (PRIORITY_ICON[opts.priority] ?? "") : "";
  const timeText = opts.time ? ` · ${opts.time}` : "";
  const leadText =
    opts.time && typeof opts.minutesLeft === "number"
      ? opts.minutesLeft > 0
        ? ` · ${opts.minutesLeft} daq. qoldi`
        : " · vaqt bo'ldi"
      : "";

  const res = await fetch(`${BASE}/bot${token()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: opts.chatId,
      text: `⏰ *Eslatma*${timeText}${leadText}\n\n${icon ? icon + " " : ""}${escapeMarkdown(opts.title)}`,
      parse_mode: "Markdown",
      reply_markup: {
        // Faqat "Kirish" tugmasi — foydalanuvchi ilova orqali bajarishga
        // undaladi (bot ichidan to'g'ridan-to'g'ri bajarish yo'q).
        inline_keyboard: [[
          { text: "→ Kirish", web_app: { url: opts.appUrl } },
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

/**
 * Qarz muddati eslatmasi. `leadDays` (0 = muddat kunining o'zi) kuni oldin
 * cron tomonidan yuboriladi. BORROWED — foydalanuvchi qaytarishi kerak;
 * LENT — qaytarib olishi kerak.
 */
export async function sendDebtReminder(opts: {
  chatId: number | string;
  type: "BORROWED" | "LENT";
  counterparty: string;
  outstanding: number;
  dueDate?: string | null;
  leadDays?: number;
  appUrl: string;
}): Promise<void> {
  const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const who = escapeMarkdown(opts.counterparty);
  const sum = `*${fmt(opts.outstanding)} so'm*`;
  const lead = opts.leadDays ?? 0;
  const when = lead > 0 ? `muddatiga ${lead} kun qoldi` : "muddati bugun yetdi";
  const body =
    opts.type === "BORROWED"
      ? `${who}dan olgan ${sum} qarz ${when}.\nQaytarishni unutmang.`
      : `${who}ga bergan ${sum} qarzni qaytarib olish ${when}.`;

  const res = await fetch(`${BASE}/bot${token()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: opts.chatId,
      text: `💳 *Qarz muddati*\n\n${body}`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "→ Qarzlar", web_app: { url: opts.appUrl } }]],
      },
    }),
  });
  if (!res.ok) {
    const b = await res.text().catch(() => "");
    throw new Error(`sendDebtReminder failed (${res.status}): ${b}`);
  }
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

/* ─── Tezkor (Quick lists) helpers ────────────────────────── */

const TG_MESSAGE_LIMIT = 4000; // a touch under Telegram's 4096 to leave room

/** Build the summary text + inline keyboard used both for first send and
 *  for in-place edits (after a new item arrives or "Davom etish"). */
function buildQuickListSummary(opts: {
  listId: string;
  name: string;
  items: { text: string }[];
}): { text: string; reply_markup: object } {
  const header = `📝 *${escapeMarkdown(opts.name)}*\n\nSiz Tezkor ro'yhatga quyidagilarni qo'shdingiz:\n`;
  let body = "";
  let truncated = 0;
  for (const it of opts.items) {
    const line = `\n• ${escapeMarkdown(it.text)}`;
    if (header.length + body.length + line.length > TG_MESSAGE_LIMIT) {
      truncated++;
      continue;
    }
    body += line;
  }
  if (truncated > 0) {
    body += `\n\n_…va yana ${truncated} ta (ko'rish uchun ilovani oching)_`;
  }
  return {
    text: header + body,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Tasdiqlash",   callback_data: `qlconfirm:${opts.listId}` },
          { text: "➕ Davom etish",  callback_data: `qlcontinue:${opts.listId}` },
        ],
        [
          { text: "✏️ Nom kiritish", callback_data: `qlname:${opts.listId}` },
          { text: "🗑 O'chirish",    callback_data: `qldelete:${opts.listId}` },
        ],
      ],
    },
  };
}

/** Send a fresh summary message. Returns the message_id so subsequent
 *  edits / button presses can target it. */
export async function sendQuickListSummary(opts: {
  chatId: number | string;
  listId: string;
  name: string;
  items: { text: string }[];
}): Promise<number> {
  const { text, reply_markup } = buildQuickListSummary(opts);

  const res = await fetch(`${BASE}/bot${token()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: opts.chatId,
      text,
      parse_mode: "Markdown",
      reply_markup,
    }),
  });
  if (!res.ok) {
    const body2 = await res.text().catch(() => "");
    throw new Error(`sendQuickListSummary failed (${res.status}): ${body2}`);
  }
  const data = (await res.json()) as { result?: { message_id?: number } };
  const id = data?.result?.message_id;
  if (typeof id !== "number") throw new Error("sendQuickListSummary: missing message_id");
  return id;
}

/** Edit an existing summary message in place — same buttons, updated body.
 *  Used when more items arrived after a "Davom etish" press, or when the
 *  list was re-closed by the cron after another idle period. */
export async function refreshQuickListSummary(opts: {
  chatId: number | string;
  messageId: number;
  listId: string;
  name: string;
  items: { text: string }[];
}): Promise<void> {
  const { text, reply_markup } = buildQuickListSummary(opts);
  const res = await fetch(`${BASE}/bot${token()}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: opts.chatId,
      message_id: opts.messageId,
      text,
      parse_mode: "Markdown",
      reply_markup,
    }),
  });
  if (!res.ok && res.status !== 400) {
    console.error("refreshQuickListSummary:", await res.text().catch(() => res.status));
  }
}

/** React to a user message with an emoji — silent acknowledgement that
 *  the bot saw and processed the message (no extra chat message needed). */
export async function setMessageReaction(opts: {
  chatId: number | string;
  messageId: number;
  emoji: string;
}) {
  const res = await fetch(`${BASE}/bot${token()}/setMessageReaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: opts.chatId,
      message_id: opts.messageId,
      reaction: [{ type: "emoji", emoji: opts.emoji }],
      is_big: false,
    }),
  });
  // 400 happens for unsupported emoji or older clients — non-fatal.
  if (!res.ok && res.status !== 400) {
    console.error("setMessageReaction:", await res.text().catch(() => res.status));
  }
}

/** Edit a summary message in-place after the user takes a final action. */
export async function editQuickListSummary(opts: {
  chatId: number | string;
  messageId: number;
  text: string;
  parseMode?: "Markdown";
}) {
  const res = await fetch(`${BASE}/bot${token()}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: opts.chatId,
      message_id: opts.messageId,
      text: opts.text,
      parse_mode: opts.parseMode ?? "Markdown",
    }),
  });
  if (!res.ok && res.status !== 400) {
    console.error("editQuickListSummary:", await res.text().catch(() => res.status));
  }
}

/** Plain-text bot message helper for short status replies. */
export async function sendPlain(chatId: number | string, text: string) {
  await fetch(`${BASE}/bot${token()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
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
      // Listen for inline-button callbacks too (Tezkor name/delete buttons).
      allowed_updates: ["message", "callback_query"],
    }),
  });
  return res.json();
}

export async function deleteWebhook() {
  const res = await fetch(`${BASE}/bot${token()}/deleteWebhook`, { method: "POST" });
  return res.json();
}
