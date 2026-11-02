import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  mcpListGoals,
  mcpCreateGoal,
  mcpCreateStep,
  mcpUpdateGoal,
  mcpUpdateStep,
  mcpDeleteGoal,
  mcpDeleteStep,
} from "@/lib/mcp/goals";
import { dateStr, goalHorizonEnum, textResult } from "./shared";

/** Maqsad: 4 davr (WEEK, MONTH, QUARTER, YEAR). Har bir maqsad bitta davrga
 *  tegishli, bir pog'ona yuqoridagi maqsadga bog'lanadi va ichida qadamlar bor. */
export function registerGoalTools(server: McpServer, ownerUserId: string) {
  server.registerTool(
    "list_goals",
    {
      title: "Maqsadlarni ro'yxatlash",
      description:
        "Davriy maqsadlarni qadamlari bilan qaytaradi. horizon berilsa — shu daraja; horizon va date birga " +
        "berilsa — o'sha sana tushadigan davr. Daraja zanjiri: YEAR → QUARTER → MONTH → WEEK.",
      inputSchema: { horizon: goalHorizonEnum.optional(), date: dateStr.optional() },
    },
    async (filter) => textResult(await mcpListGoals(ownerUserId, filter))
  );

  server.registerTool(
    "create_goal",
    {
      title: "Yangi maqsad yaratish",
      description:
        "Berilgan davrga maqsad qo'shadi. date ixtiyoriy (standart — bugun): shu sana tushadigan hafta, oy, " +
        "chorak yoki yil olinadi. parentId — shu maqsad qaysi yuqori darajadagi maqsaddan kelgani " +
        "(YEAR → QUARTER → MONTH → WEEK). steps — ixtiyoriy qadamlar, bir chaqiruvda birga yaratiladi.",
      inputSchema: {
        horizon: goalHorizonEnum,
        title: z.string().min(1),
        date: dateStr.optional(),
        parentId: z.string().optional(),
        steps: z.array(z.string().min(1)).optional(),
      },
    },
    async (input) => textResult(await mcpCreateGoal(ownerUserId, input))
  );

  server.registerTool(
    "create_step",
    {
      title: "Maqsadga qadam qo'shish",
      description: "Mavjud maqsadga 'nima qilish kerak' qadamini qo'shadi.",
      inputSchema: { goalId: z.string(), title: z.string().min(1) },
    },
    async ({ goalId, title }) => textResult(await mcpCreateStep(ownerUserId, goalId, title))
  );

  server.registerTool(
    "update_goal",
    {
      title: "Maqsadni yangilash",
      description:
        "Matn, bajarilgan holat yoki yuqori maqsad bog'lanishini (parentId, null — uzish) yangilaydi. done " +
        "o'zgarsa, barcha qadamlar va ularga bog'langan tasklar ham birga o'zgaradi.",
      inputSchema: {
        id: z.string(),
        title: z.string().min(1).optional(),
        done: z.boolean().optional(),
        parentId: z.string().nullable().optional(),
      },
    },
    async ({ id, ...patch }) => textResult(await mcpUpdateGoal(ownerUserId, id, patch))
  );

  server.registerTool(
    "update_step",
    {
      title: "Qadamni yangilash (matn/bajarilgan holat)",
      description:
        "Qadam matni yoki holatini yangilaydi. Qadam Bugunga qo'shilgan bo'lsa, bog'langan task ham " +
        "sinxronlanadi. Hamma qadam bajarilsa, maqsad ham bajarilgan bo'ladi.",
      inputSchema: { id: z.string(), title: z.string().min(1).optional(), done: z.boolean().optional() },
    },
    async ({ id, ...patch }) => textResult(await mcpUpdateStep(ownerUserId, id, patch))
  );

  server.registerTool(
    "delete_step",
    {
      title: "Qadamni o'chirish",
      description: "Qadamni butunlay o'chiradi. Bog'langan task o'chmaydi, faqat bog'lanish uziladi.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => textResult(await mcpDeleteStep(ownerUserId, id))
  );

  server.registerTool(
    "delete_goal",
    {
      title: "Maqsadni o'chirish",
      description: "Maqsadni qadamlari bilan butunlay o'chiradi. Bog'langan tasklar o'chmaydi.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => textResult(await mcpDeleteGoal(ownerUserId, id))
  );
}
