import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getOwnerUserId } from "@/lib/mcp/auth";
import { registerCoreTools } from "./core";
import { registerIdeaTools } from "./ideas";
import { registerProjectTaskTools } from "./project-tasks";
import { registerPageTools } from "./pages";
import { registerHabitTools } from "./habits";
import { registerGoalTools } from "./goals";
import { registerTezkorTools } from "./tezkor";

/**
 * Barcha MCP tool'larni ro'yxatdan o'tkazadi — Moliya (Debt/Transaction/
 * FinanceCategory/Budget/FinancialGoal/GoalContribution) modellariga bu
 * yerdan yoki chaqirilgan hech qanday sub-modulda hech qanday import yoki
 * so'rov yo'q. Barcha yozish/o'qish faqat getOwnerUserId()ga qattiq
 * bog'langan. Multi-user OAuth kelajakda alohida qatlam sifatida
 * qo'shilishi mumkin — hozir qurilmagan.
 */
export function registerMcpTools(server: McpServer) {
  const ownerUserId = getOwnerUserId();

  registerCoreTools(server, ownerUserId); // Plan: get_structure/list_tasks/get_agenda/get_plans/create_task/update_task
  registerIdeaTools(server, ownerUserId); // Reja: Idea (+ Category — get_structure orqali)
  registerProjectTaskTools(server, ownerUserId); // Jadval: ProjectTask
  registerPageTools(server, ownerUserId); // Hujjatlar: Page (BlockNote ↔ markdown)
  registerHabitTools(server, ownerUserId); // Odat: Habit (+ HabitCategory — get_structure orqali)
  registerGoalTools(server, ownerUserId); // Maqsad: Goal/SubGoal/GoalStep
  registerTezkorTools(server, ownerUserId); // Tezkor: QuickList
}
