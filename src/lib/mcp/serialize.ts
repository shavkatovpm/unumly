import "server-only";

/** Markazlashgan JSON serializer — BigInt maydonlar (masalan User.telegramId,
 *  BotMessage.chatId) to'g'ridan-to'g'ri JSON.stringify qilinsa xato beradi.
 *  MCP tool javoblarida ishlatiladigan barcha JSON shu orqali chiqariladi. */
export function mcpJsonStringify(data: unknown): string {
  return JSON.stringify(
    data,
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
    2
  );
}
