import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { mcpListIdeas, mcpCreateIdea, mcpUpdateIdea, mcpDeleteIdea, mcpDeleteCategory } from "@/lib/mcp/ideas";
import { priorityEnum, dateStr, timeStr, textResult } from "./shared";

/** Reja bo'limi (Idea + Category). Category'lar uchun alohida list/create/
 *  update tool yo'q — get_structure.personal.categories / projects[].categories
 *  orqali o'qiladi; faqat delete_category (o'chirish) bor. */
export function registerIdeaTools(server: McpServer, ownerUserId: string) {
  server.registerTool(
    "list_ideas",
    {
      title: "G'oyalarni (Reja) ro'yxatlash",
      description:
        "Reja bo'limidagi g'oyalarni ro'yxatlaydi — shaxsiy (projectId berilmasa) yoki loyihaning o'z Reja " +
        "bo'limidan (projectId berilsa). categoryId bilan qo'shimcha filtrlash mumkin. Har yozuvda kategoriya " +
        "nomi va (bo'lsa) loyiha nomi ham qaytadi. Default limit 50 (max 200).",
      inputSchema: {
        projectId: z.string().nullable().optional().describe("null = faqat shaxsiy g'oyalar. Berilmasa — hammasi."),
        categoryId: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    async (args) => textResult(await mcpListIdeas(ownerUserId, args))
  );

  server.registerTool(
    "create_idea",
    {
      title: "Yangi g'oya (Reja) yaratish",
      description:
        "Reja bo'limiga yangi g'oya qo'shadi. categoryId MAJBURIY (Idea modelida bu ustun DB darajasida " +
        "bo'sh bo'lishi mumkin emas — get_structure orqali mavjud kategoriyalardan birini tanlang). projectId " +
        "berilsa loyihaning o'z Reja bo'limiga tegishli bo'ladi. scheduledFor berilsa VA projectId bo'lmasa " +
        "(faqat shaxsiy g'oyalarda) — g'oya Bugun/Agenda/Kalendarda ham avtomatik ko'rinadi (bir xil id'li " +
        "Plan sifatida oynalanadi); loyiha-ichi g'oyalar bunga kirmaydi.",
      inputSchema: {
        title: z.string().min(1),
        categoryId: z.string(),
        notes: z.string().optional(),
        projectId: z.string().optional(),
        scheduledFor: dateStr.optional(),
        time: timeStr.optional(),
        duration: z.number().int().positive().optional().describe("Daqiqada"),
        priority: priorityEnum.optional(),
      },
    },
    async (args) => textResult(await mcpCreateIdea(ownerUserId, args))
  );

  server.registerTool(
    "update_idea",
    {
      title: "G'oyani (Reja) yangilash",
      description:
        "Mavjud g'oyani id bo'yicha yangilaydi — faqat OWNER_USER_ID'ga tegishli bo'lsa. scheduledFor'ni " +
        "null qilib tozalash (shaxsiy g'oyalarda) bog'langan mirror Plan'ni yumshoq o'chiradi; scheduledFor " +
        "berilsa/o'zgarsa mirror Plan qayta hisoblanadi (notifyAt bilan birga).",
      inputSchema: {
        id: z.string(),
        title: z.string().min(1).optional(),
        notes: z.string().nullable().optional(),
        categoryId: z.string().optional(),
        done: z.boolean().optional(),
        scheduledFor: dateStr.nullable().optional(),
        time: timeStr.nullable().optional(),
        duration: z.number().int().positive().nullable().optional(),
        priority: priorityEnum.nullable().optional(),
      },
    },
    async ({ id, ...patch }) => textResult(await mcpUpdateIdea(ownerUserId, id, patch))
  );

  server.registerTool(
    "delete_idea",
    {
      title: "G'oyani (Reja) o'chirish",
      description:
        "G'oyani butunlay o'chiradi (Idea modelida arxiv/soft-delete yo'q — bu qaytarib bo'lmaydigan amal). " +
        "Agar shaxsiy va sanaga bog'langan bo'lsa, Bugun/Agenda'dagi mirror Plan yumshoq o'chiriladi (30 " +
        "kunlik trash orqali tiklanishi mumkin). Javobda o'chirilgan g'oyaning nomi qaytadi.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => textResult(await mcpDeleteIdea(ownerUserId, id))
  );

  server.registerTool(
    "delete_category",
    {
      title: "Reja kategoriyasini o'chirish",
      description:
        "Reja kategoriyasini (shaxsiy yoki loyiha-ichi) o'chiradi. DIQQAT: app'dagi xatti-harakat bilan bir " +
        "xil — kategoriya ichidagi BARCHA g'oyalar ham birga o'chadi (boshqa kategoriyaga ko'chirilmaydi, " +
        "cascade). Javobda 'deletedIdeasCount' — birga nechta g'oya o'chganini aniq ko'rsatadi. Standart " +
        "(tizim) kategoriyalar (id='ish' yoki 'organish', faqat shaxsiy Reja'da) o'chirilmaydi — rad etiladi.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => textResult(await mcpDeleteCategory(ownerUserId, id))
  );
}
