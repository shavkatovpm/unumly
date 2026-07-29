import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  mcpListGoals,
  mcpCreateGoal,
  mcpCreateSubgoal,
  mcpCreateStep,
  mcpUpdateGoal,
  mcpUpdateStep,
  mcpDeleteGoal,
  mcpDeleteSubgoal,
  mcpDeleteStep,
} from "@/lib/mcp/goals";
import { goalStatusEnum, textResult } from "./shared";

/** Maqsad (OKR): Goal → SubGoal → GoalStep, 3 pog'ona. v1'da UI-granular
 *  amallar (qayta tartiblash, qadamni kalendarga bog'lash/uzish) chiqarilmagan
 *  — faqat daraxt yaratish/o'qish va qadam matni/holatini yangilash bor. */
export function registerGoalTools(server: McpServer, ownerUserId: string) {
  server.registerTool(
    "list_goals",
    {
      title: "Maqsadlarni (OKR) ro'yxatlash",
      description:
        "Barcha maqsadlarni to'liq daraxt bilan qaytaradi: Goal → SubGoal (kichik maqsad) → GoalStep " +
        "(qadam). Har qadamda done holati va (bog'langan bo'lsa) kalendardagi sanasi ko'rinadi.",
      inputSchema: {},
    },
    async () => textResult(await mcpListGoals(ownerUserId))
  );

  server.registerTool(
    "create_goal",
    {
      title: "Yangi maqsad (OKR) yaratish",
      description:
        "Yangi Goal yaratadi. subGoals ixtiyoriy — berilsa, kichik maqsadlar va ularning qadamlari ham " +
        "BITTA chaqiruvda birga yaratiladi (to'liq daraxtni bir yo'la qurish uchun qulay).",
      inputSchema: {
        title: z.string().min(1),
        icon: z.string().optional().describe("lucide icon nomi"),
        deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        subGoals: z
          .array(
            z.object({
              title: z.string().min(1),
              steps: z.array(z.object({ title: z.string().min(1) })).optional(),
            })
          )
          .optional(),
      },
    },
    async (args) => textResult(await mcpCreateGoal(ownerUserId, args))
  );

  server.registerTool(
    "create_subgoal",
    {
      title: "Mavjud maqsadga kichik maqsad qo'shish",
      description: "Berilgan Goal ostiga yangi SubGoal (kichik maqsad) qo'shadi.",
      inputSchema: { goalId: z.string(), title: z.string().min(1) },
    },
    async ({ goalId, title }) => textResult(await mcpCreateSubgoal(ownerUserId, goalId, title))
  );

  server.registerTool(
    "create_step",
    {
      title: "Mavjud kichik maqsadga qadam qo'shish",
      description: "Berilgan SubGoal ostiga yangi GoalStep (qadam) qo'shadi.",
      inputSchema: { subGoalId: z.string(), title: z.string().min(1) },
    },
    async ({ subGoalId, title }) => textResult(await mcpCreateStep(ownerUserId, subGoalId, title))
  );

  server.registerTool(
    "update_goal",
    {
      title: "Maqsadni yangilash",
      description:
        "Goal darajasidagi maydonlarni yangilaydi (title/icon/deadline/status). status=ARCHIVED qilinsa " +
        "arxivlanadi.",
      inputSchema: {
        id: z.string(),
        title: z.string().min(1).optional(),
        icon: z.string().nullable().optional(),
        deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        status: goalStatusEnum.optional(),
      },
    },
    async ({ id, ...patch }) => textResult(await mcpUpdateGoal(ownerUserId, id, patch))
  );

  server.registerTool(
    "update_step",
    {
      title: "Qadamni yangilash (matn/bajarilgan holat)",
      description:
        "GoalStep'ning title/done maydonlarini yangilaydi. Agar qadam kalendarga bog'langan bo'lsa (biror " +
        "sanaga belgilangan), title va done o'zgarishlari bog'langan Plan'ga (Bugun/Agenda'dagi ko'rinishi) " +
        "ham avtomatik sinxronlanadi.",
      inputSchema: { id: z.string(), title: z.string().min(1).optional(), done: z.boolean().optional() },
    },
    async ({ id, ...patch }) => textResult(await mcpUpdateStep(ownerUserId, id, patch))
  );

  server.registerTool(
    "delete_subgoal",
    {
      title: "Kichik maqsadni o'chirish",
      description:
        "SubGoal'ni butunlay o'chiradi (hard delete). Ostidagi barcha GoalStep'lar va ularning kalendarga " +
        "bog'langan Plan'lari DB darajasidagi ON DELETE CASCADE orqali birga o'chadi. Goal'ning o'zi " +
        "o'chmaydi.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => textResult(await mcpDeleteSubgoal(ownerUserId, id))
  );

  server.registerTool(
    "delete_step",
    {
      title: "Qadamni o'chirish",
      description:
        "GoalStep'ni butunlay o'chiradi (hard delete). Agar kalendarga bog'langan bo'lsa (biror sanaga " +
        "belgilangan), bog'langan Plan ham DB darajasidagi ON DELETE CASCADE orqali birga o'chadi.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => textResult(await mcpDeleteStep(ownerUserId, id))
  );

  server.registerTool(
    "delete_goal",
    {
      title: "Maqsadni o'chirish",
      description:
        "Goal'ni butunlay o'chiradi (hard delete). Barcha SubGoal'lar, GoalStep'lar va ularning kalendarga " +
        "bog'langan Plan'lari DB darajasidagi ON DELETE CASCADE orqali birga o'chadi.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => textResult(await mcpDeleteGoal(ownerUserId, id))
  );
}
