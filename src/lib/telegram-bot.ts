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
      `Kodni unumly.uz/kirish sahifasiga kiriting. 10 daqiqa amal qiladi.\n` +
      `Agar bu siz emassiz — e'tiborsiz qoldiring.`,
    parse_mode: "Markdown",
  });
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
