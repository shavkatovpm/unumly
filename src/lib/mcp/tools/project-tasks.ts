import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  mcpListProjectTasks,
  mcpCreateProjectTask,
  mcpUpdateProjectTask,
  mcpDeleteProjectTask,
} from "@/lib/mcp/project-tasks";
import { priorityEnum, dateStr, textResult } from "./shared";

export function registerProjectTaskTools(server: McpServer, ownerUserId: string) {
  server.registerTool(
    "list_project_tasks",
    {
      title: "Loyiha Jadval vazifalarini ro'yxatlash",
      description:
        "Bitta loyihaning Jadval (ProjectTask) bo'limidagi vazifalarini ro'yxatlaydi. projectId MAJBURIY. " +
        "DIQQAT: bu list_tasks (Plan) dan alohida model — ProjectTask'da scope/notifyLeadMin yo'q, dueDate " +
        "ixtiyoriy (Plan.scheduledFor kabi majburiy emas).",
      inputSchema: {
        projectId: z.string(),
        done: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    async (args) => textResult(await mcpListProjectTasks(ownerUserId, args))
  );

  server.registerTool(
    "create_project_task",
    {
      title: "Loyiha Jadvaliga yangi vazifa qo'shish",
      description:
        "Loyihaning Jadval bo'limiga yangi vazifa qo'shadi. dueDate ixtiyoriy — berilsa, vazifa avtomatik " +
        "ravishda Bugun/Agenda'da ham ko'rinadigan bog'langan Plan bilan sinxronlanadi (app'dagi xatti-harakat " +
        "bilan bir xil).",
      inputSchema: {
        projectId: z.string(),
        title: z.string().min(1),
        priority: priorityEnum.optional(),
        dueDate: dateStr.optional(),
      },
    },
    async (args) => textResult(await mcpCreateProjectTask(ownerUserId, args))
  );

  server.registerTool(
    "update_project_task",
    {
      title: "Loyiha Jadval vazifasini yangilash",
      description:
        "Mavjud Jadval vazifasini id bo'yicha yangilaydi — faqat OWNER_USER_ID'ga tegishli loyihada bo'lsa. " +
        "title/done/priority/dueDate o'zgarishlari bog'langan Plan'ga (mavjud bo'lsa) avtomatik ko'chiriladi; " +
        "dueDate birinchi marta berilsa yangi bog'langan Plan yaratiladi, null qilinsa bog'langan Plan " +
        "o'chiriladi.",
      inputSchema: {
        id: z.string(),
        title: z.string().min(1).optional(),
        done: z.boolean().optional(),
        priority: priorityEnum.nullable().optional(),
        dueDate: dateStr.nullable().optional(),
      },
    },
    async ({ id, ...patch }) => textResult(await mcpUpdateProjectTask(ownerUserId, id, patch))
  );

  server.registerTool(
    "delete_project_task",
    {
      title: "Loyiha Jadval vazifasini o'chirish",
      description:
        "Jadval vazifasini butunlay o'chiradi (hard delete, arxiv yo'q). Agar bu vazifaga bog'langan Plan " +
        "(Bugun/Agenda'dagi ko'rinishi) mavjud bo'lsa, u ham DB darajasidagi ON DELETE CASCADE orqali " +
        "avtomatik o'chadi — javobda 'linkedPlanDeleted' shuni ko'rsatadi.",
      inputSchema: { id: z.string() },
    },
    async ({ id }) => textResult(await mcpDeleteProjectTask(ownerUserId, id))
  );
}
