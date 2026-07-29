import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { mcpListQuickLists, mcpCreateQuickList, mcpUpdateQuickList, mcpDeleteQuickList } from "@/lib/mcp/tezkor";
import { textResult } from "./shared";

/** Tezkor (QuickList): oddiy ro'yxatlar (xarid, qadoqlash va h.k.). UI'dagi
 *  mayda item-darajali amallar (rename/reorder/toggle alohida-alohida)
 *  bitta update_quicklist'ga birlashtirilgan (tool sonini kamaytirish uchun). */
export function registerTezkorTools(server: McpServer, ownerUserId: string) {
  server.registerTool(
    "list_quicklists",
    {
      title: "Tezkor ro'yxatlarni ro'yxatlash",
      description:
        "Barcha Tezkor ro'yxatlarni (item'lari bilan) qaytaradi. Default faqat hali yakunlanmaganlar — " +
        "includeCompleted=true bilan yakunlanganlarni ham qo'shish mumkin. O'chirilganlar (soft-delete) " +
        "hech qachon qaytmaydi.",
      inputSchema: { includeCompleted: z.boolean().optional() },
    },
    async ({ includeCompleted }) => textResult(await mcpListQuickLists(ownerUserId, includeCompleted))
  );

  server.registerTool(
    "create_quicklist",
    {
      title: "Yangi Tezkor ro'yxat yaratish",
      description: "Yangi ro'yxat yaratadi, items — boshlang'ich elementlar matni (bo'sh massiv bo'lishi mumkin).",
      inputSchema: { name: z.string().optional().describe("Berilmasa avtomatik sana bilan nomlanadi"), items: z.array(z.string()) },
    },
    async (args) => textResult(await mcpCreateQuickList(ownerUserId, args))
  );

  server.registerTool(
    "update_quicklist",
    {
      title: "Tezkor ro'yxatni yangilash",
      description:
        "Bitta chaqiruvda bir nechta amalni bajaradi: name (qayta nomlash), addItems (yangi elementlar " +
        "qo'shish), toggleItemIds (berilgan item'larning bajarilgan/bajarilmagan holatini almashtirish), " +
        "removeItemIds (item'larni o'chirish), completed (butun ro'yxatni yakunlangan deb belgilash yoki " +
        "qaytarish). Hammasi ixtiyoriy — faqat kerakli maydonlarni bering.",
      inputSchema: {
        id: z.string(),
        name: z.string().optional(),
        addItems: z.array(z.string()).optional(),
        toggleItemIds: z.array(z.string()).optional(),
        removeItemIds: z.array(z.string()).optional(),
        completed: z.boolean().optional(),
      },
    },
    async ({ id, ...patch }) => textResult(await mcpUpdateQuickList(ownerUserId, id, patch))
  );

  server.registerTool(
    "delete_quicklist",
    {
      title: "Tezkor ro'yxatni o'chirish",
      description: "Ro'yxatni yumshoq o'chiradi (deletedAt) — 30 kundan keyin butunlay tozalanadi.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => textResult(await mcpDeleteQuickList(ownerUserId, id))
  );
}
