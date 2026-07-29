import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { mcpGetStructure } from "@/lib/mcp/structure";
import {
  mcpListTasks,
  mcpGetAgenda,
  mcpGetPlansSummary,
  mcpCreateTask,
  mcpUpdateTask,
  mcpDeleteTask,
} from "@/lib/mcp/plans";
import { priorityEnum, scopeEnum, statusEnum, dateStr, timeStr, leadMin, textResult } from "./shared";

/** 7 ta asosiy tool: get_structure/list_tasks/get_agenda/get_plans (o'qish),
 *  create_task/update_task/delete_task (Plan darajasida yozish). */
export function registerCoreTools(server: McpServer, ownerUserId: string) {
  server.registerTool(
    "get_structure",
    {
      title: "Umumiy xarita — loyihalar, kategoriyalar, enum qiymatlari",
      description:
        "Foydalanuvchining barcha faol (arxivlanmagan) loyihalarini — har biri uchun category (A/B/C/D), " +
        "targetHours, ochiq Plan/Idea/ProjectTask/Goal soni va Hujjat (Page) soni bilan — hamda shaxsiy va " +
        "loyiha-ichi Reja kategoriyalarini, Odat kategoriyalarini va barcha enum qiymatlarini (PlanPriority/" +
        "PlanScope/PlanStatus/GoalStatus) qaytaradi. Boshqa deyarli barcha tool'larni chaqirishdan oldin — " +
        "mavjud projectId/categoryId'larni bilish uchun ishlatiladi. Moliya modellariga umuman kirmaydi.",
      inputSchema: {},
    },
    async () => textResult(await mcpGetStructure(ownerUserId))
  );

  server.registerTool(
    "list_tasks",
    {
      title: "Task'larni (Plan) ro'yxatlash",
      description:
        "Plan (vaqt/sana asosidagi task, Bugun/Agenda/Kalendarda ko'rinadi) yozuvlarini filtrlar bilan " +
        "ro'yxatlaydi: loyiha, holat, muhimlik, davr, sana oralig'i. status aniq berilmasa ARCHIVED holatidagi " +
        "yozuvlar DEFAULT'da chiqmaydi (app'dagi Bugun/Agenda ko'rinishi bilan bir xil) — ularni ko'rish uchun " +
        "status='ARCHIVED' aniq berilishi kerak. Default limit 50 (max 200), offset bilan pagination. DIQQAT: " +
        "bu Reja bo'limidagi g'oyalar (Idea, list_ideas'da) yoki loyihaning Jadval bo'limidagi vazifalar " +
        "(ProjectTask, list_project_tasks'da) emas — alohida model.",
      inputSchema: {
        projectId: z
          .string()
          .nullable()
          .optional()
          .describe("Loyiha id. null = faqat shaxsiy (loyihasiz) task'lar. Berilmasa — hammasi."),
        status: statusEnum.optional(),
        priority: priorityEnum.optional(),
        scope: scopeEnum.optional(),
        from: dateStr.optional().describe("scheduledFor >= from (YYYY-MM-DD)"),
        to: dateStr.optional().describe("scheduledFor <= to (YYYY-MM-DD)"),
        limit: z.number().int().min(1).max(200).optional().describe("Default 50, max 200"),
        offset: z.number().int().min(0).optional(),
      },
    },
    async (args) => textResult(await mcpListTasks(ownerUserId, args))
  );

  server.registerTool(
    "get_agenda",
    {
      title: "Agenda (kalendar) ko'rinishi",
      description:
        "Berilgan sana oralig'idagi (default: bugun + 7 kun, Asia/Tashkent) Plan'larni scheduledFor+time " +
        "bo'yicha vaqt tartibida qaytaradi. Odat occurrence'lari va Maqsad qadam occurrence'lari ham shu " +
        "yerda ko'rinadi (ular ham Plan sifatida materializatsiya bo'ladi). status aniq berilmasa ARCHIVED " +
        "holatidagi yozuvlar DEFAULT'da chiqmaydi (app'dagi Agenda ko'rinishi bilan bir xil).",
      inputSchema: {
        from: dateStr.optional().describe("Default: bugun (Asia/Tashkent)"),
        to: dateStr.optional().describe("Default: from + 7 kun"),
        status: statusEnum.optional().describe("Berilmasa ARCHIVED chiqmaydi. ARCHIVED'larni ko'rish uchun aniq berish kerak."),
      },
    },
    async (args) => textResult(await mcpGetAgenda(ownerUserId, args))
  );

  server.registerTool(
    "get_plans",
    {
      title: "Rejalar (Plan) xulosasi",
      description:
        "Shaxsiy va har bir loyiha ichidagi Plan'larning status bo'yicha soni (to'liq matnlar emas, faqat " +
        "summary raqamlar). Moliya bo'limi (Debt/Transaction) bu tool'ga umuman kirmaydi.",
      inputSchema: {},
    },
    async () => textResult(await mcpGetPlansSummary(ownerUserId))
  );

  server.registerTool(
    "create_task",
    {
      title: "Yangi task (Plan) yaratish",
      description:
        "Yangi Plan yaratadi — shaxsiy (projectId berilmasa) yoki loyihaning Reja bo'limiga bog'langan " +
        "(projectId berilsa). DIQQAT: bu faqat Plan yaratadi — loyihaning Jadval bo'limiga (ProjectTask) " +
        "yozish uchun create_project_task ishlatiladi. priority: LOW/MEDIUM/HIGH (ixtiyoriy, bo'sh — " +
        "muhimlik belgilanmagan). scope default DAILY. notifyLeadMin: 0/5/15/30 daqiqa (berilmasa — " +
        "foydalanuvchining hisob darajasidagi default sozlamasi ishlatiladi). duration — davomiylik " +
        "daqiqalarda (ixtiyoriy). Agar scheduledFor+time+notifyLeadMin'dan hisoblangan eslatma vaqti " +
        "(notifyAt) allaqachon o'tmishda bo'lsa, task baribir yaratiladi, lekin javobda 'warning' maydoni " +
        "bilan aniq ogohlantirish qaytadi.",
      inputSchema: {
        title: z.string().min(1),
        scheduledFor: dateStr,
        time: timeStr.optional(),
        duration: z.number().int().positive().optional().describe("Davomiylik, daqiqalarda"),
        notes: z.string().optional(),
        priority: priorityEnum.optional(),
        scope: scopeEnum.optional(),
        notifyLeadMin: leadMin.optional(),
        projectId: z
          .string()
          .optional()
          .describe("Loyiha id — mavjudligi va OWNER_USER_ID'ga tegishliligi tekshiriladi."),
      },
    },
    async (args) => textResult(await mcpCreateTask(ownerUserId, args))
  );

  server.registerTool(
    "update_task",
    {
      title: "Task (Plan) yangilash",
      description:
        "Mavjud Plan'ni id bo'yicha yangilaydi — faqat egasi OWNER_USER_ID bo'lgan yozuvlar (boshqa userga " +
        "tegishli yoki mavjud bo'lmagan id rad etiladi). scheduledFor/time/notifyLeadMin o'zgarsa notifyAt " +
        "qayta hisoblanadi va notifiedAt qayta armlanadi (reminder qayta yuboriladigan bo'ladi). Agar Plan " +
        "loyihaning Jadval (ProjectTask) yozuvidan avtomatik yaratilgan bo'lsa, title/priority/scheduledFor " +
        "o'zgarishlari o'sha Jadval qatoriga ham ko'chiriladi. duration — davomiylik daqiqalarda (ixtiyoriy, " +
        "null berilsa tozalanadi).",
      inputSchema: {
        id: z.string(),
        title: z.string().min(1).optional(),
        notes: z.string().nullable().optional(),
        status: statusEnum.optional(),
        priority: priorityEnum.nullable().optional(),
        scheduledFor: dateStr.optional(),
        time: timeStr.nullable().optional(),
        duration: z.number().int().positive().nullable().optional().describe("Davomiylik, daqiqalarda"),
        notifyLeadMin: leadMin.nullable().optional(),
      },
    },
    async ({ id, ...patch }) => textResult(await mcpUpdateTask(ownerUserId, id, patch))
  );

  server.registerTool(
    "delete_task",
    {
      title: "Task (Plan) o'chirish",
      description:
        "Mavjud Plan'ni id bo'yicha o'chiradi — faqat OWNER_USER_ID'ga tegishli bo'lsa. YUMSHOQ o'chirish " +
        "(deletedAt, 30 kunlik trash — hard delete emas), app'dagi xatti-harakat bilan bir xil. O'chirilgandan " +
        "keyin get_agenda/list_tasks/Bugun/Agenda/Kalendarda ko'rinmaydi. Agar bu Plan loyihaning Jadval " +
        "(ProjectTask) yozuvidan mirror qilingan bo'lsa — o'sha Jadval qatori O'CHIRILMAYDI, faqat uning " +
        "dueDate'i tozalanadi (sanasiz holatga qaytadi); javobda 'unlinkedProjectTaskId' shuni ko'rsatadi. " +
        "Agar bu Plan shaxsiy G'oya (Idea)dan mirror qilingan bo'lsa — G'oyaning o'ziga tegilmaydi (u qayta " +
        "tahrirlansa mirror qayta paydo bo'lishi mumkin, app'dagi xatti-harakat bilan bir xil).",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => textResult(await mcpDeleteTask(ownerUserId, id))
  );
}
