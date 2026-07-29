import "server-only";

import { z } from "zod";

import { mcpJsonStringify } from "@/lib/mcp/serialize";

export const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const scopeEnum = z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
export const statusEnum = z.enum([
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "MISSED",
  "CANCELLED",
  "ARCHIVED",
]);
export const goalStatusEnum = z.enum(["ACTIVE", "DONE", "ARCHIVED"]);
export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD bo'lishi kerak");
export const timeStr = z.string().regex(/^\d{2}:\d{2}$/, "HH:MM bo'lishi kerak");
export const leadMin = z.union([z.literal(0), z.literal(5), z.literal(15), z.literal(30)]);
export const weekday = z.number().int().min(0).max(6);

export function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: mcpJsonStringify(data) }] };
}
