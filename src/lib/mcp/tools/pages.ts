import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { mcpListPages, mcpGetPage, mcpCreatePage, mcpUpdatePage, mcpDeletePage } from "@/lib/mcp/pages";
import { textResult } from "./shared";

export function registerPageTools(server: McpServer, ownerUserId: string) {
  server.registerTool(
    "list_pages",
    {
      title: "Loyiha Hujjatlarini ro'yxatlash",
      description:
        "Bitta loyihaning Hujjatlar (Page, BlockNote) daraxtidagi barcha sahifalarni TEKIS ro'yxat sifatida " +
        "qaytaradi — faqat metadata (id, parentId, title, icon), content KIRMAYDI (hajmi katta bo'lishi " +
        "mumkin). Daraxtni parentId orqali o'zingiz qurasiz. Bitta sahifa matnini o'qish uchun get_page " +
        "ishlatiladi.",
      inputSchema: { projectId: z.string() },
    },
    async ({ projectId }) => textResult(await mcpListPages(ownerUserId, projectId))
  );

  server.registerTool(
    "get_page",
    {
      title: "Bitta Hujjat matnini o'qish",
      description:
        "Bitta sahifaning to'liq matnini qaytaradi — BlockNote JSON emas, LLM o'qishi uchun qulay MARKDOWN " +
        "ko'rinishida ('lossy' konvertatsiya — asosiy formatlash saqlanadi, ba'zi murakkab BlockNote-maxsus " +
        "elementlar soddalashtirilishi mumkin).",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => textResult(await mcpGetPage(ownerUserId, id))
  );

  server.registerTool(
    "create_page",
    {
      title: "Yangi Hujjat yaratish",
      description:
        "Loyihaning Hujjatlar bo'limiga yangi sahifa qo'shadi. parentId berilsa uning ostiga ichma-ich " +
        "joylashadi (shu loyihaga tegishli bo'lishi tekshiriladi). contentMarkdown ixtiyoriy — berilmasa bo'sh " +
        "sahifa yaratiladi (keyin UI'da to'ldiriladi). DIQQAT (v1 cheklovi): markdown → BlockNote konvertatsiyasi " +
        "'lossy' — oddiy paragraph/heading/ro'yxat bloklarini to'g'ri o'giradi, lekin murakkab formatlash " +
        "(jadval, ichma-ich maxsus bloklar) to'liq saqlanmasligi mumkin.",
      inputSchema: {
        projectId: z.string(),
        parentId: z.string().nullable().optional(),
        title: z.string().optional().describe("Berilmasa 'Nomsiz'"),
        contentMarkdown: z.string().optional(),
      },
    },
    async (args) => textResult(await mcpCreatePage(ownerUserId, args))
  );

  server.registerTool(
    "update_page",
    {
      title: "Hujjatni yangilash",
      description:
        "Mavjud sahifani id bo'yicha yangilaydi — faqat OWNER_USER_ID'ga tegishli loyihada bo'lsa. " +
        "contentMarkdown berilsa BUTUN hujjat matni shu bilan ALMASHTIRILADI (qo'shimcha emas, to'liq " +
        "qayta yozish) — xuddi shu 'lossy' konvertatsiya cheklovi bilan (create_page'ga qarang).",
      inputSchema: {
        id: z.string(),
        title: z.string().optional(),
        icon: z.string().nullable().optional().describe("lucide icon nomi"),
        contentMarkdown: z.string().optional(),
        parentId: z.string().nullable().optional(),
      },
    },
    async ({ id, ...patch }) => textResult(await mcpUpdatePage(ownerUserId, id, patch))
  );

  server.registerTool(
    "delete_page",
    {
      title: "Hujjatni o'chirish",
      description:
        "Sahifani butunlay o'chiradi (hard delete, arxiv yo'q). Agar bu sahifaning bola (nested) sahifalari " +
        "bo'lsa, ULAR HAM birga o'chadi (DB darajasidagi ON DELETE CASCADE) — javobda 'deletedDescendants' " +
        "necha ta qo'shimcha sahifa o'chganini ko'rsatadi.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => textResult(await mcpDeletePage(ownerUserId, id))
  );
}
