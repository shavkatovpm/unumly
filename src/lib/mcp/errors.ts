import "server-only";

import { Prisma } from "@prisma/client";

/** id topilmadi yoki OWNER_USER_ID'ga tegishli emas. */
export class McpNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpNotFoundError";
  }
}

/** Prisma constraint xatolarini (unique/foreign key) tushunarli xabarga
 *  o'giradi — MCP SDK har qanday throw qilingan Error'ni CallToolResult
 *  { isError: true, content: [...err.message] } shakliga avtomatik o'raydi,
 *  shuning uchun bu yerda faqat xabarni tozalash kifoya. */
export function toFriendlyErrorMessage(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta!.target as string[]).join(", ")
        : String(err.meta?.target ?? "unique constraint");
      return `Yozuv to'qnashuvi: ${target} allaqachon band.`;
    }
    if (err.code === "P2025") return "Yozuv topilmadi.";
    if (err.code === "P2003") return "Bog'liq yozuv topilmadi (foreign key).";
    return `Baza xatosi: ${err.code}.`;
  }
  if (err instanceof Error) return err.message;
  return "Noma'lum xato.";
}

/** MCP action funksiyalarini xato-tarjima qatlami bilan o'raydi — har bir
 *  handler'da alohida try/catch yozish shart emas. */
export function withMcpErrors<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>
): (...args: Args) => Promise<R> {
  return async (...args: Args): Promise<R> => {
    try {
      return await fn(...args);
    } catch (err) {
      throw new Error(toFriendlyErrorMessage(err));
    }
  };
}
