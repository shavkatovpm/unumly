import "server-only";

/* Klient o'qiydigan ma'lumot funksiyalari ro'yxati — /api/read orqali GET bilan
   chaqiriladi. Faqat o'qish (list/get); o'zgartirishlar server action'da qoladi. */

import { listPlans } from "@/lib/plans-actions";
import { listIdeas } from "@/lib/ideas-actions";
import { listCategories } from "@/lib/categories-actions";
import { listLists } from "@/lib/tezkor-actions";
import { listProjects } from "@/lib/projects-actions";
import { listProjectTasks } from "@/lib/project-tasks-actions";
import { listPages } from "@/lib/pages-actions";
import { listHabits } from "@/lib/habits-actions";
import { listHabitCategories } from "@/lib/habit-categories-actions";
import { listHorizonGoals } from "@/lib/horizon-goals-actions";
import { listTransactions } from "@/lib/finance-actions";
import { listFinanceCategories } from "@/lib/finance-categories-actions";
import { listBudgets } from "@/lib/finance-budgets-actions";
import { listFinancialGoals } from "@/lib/finance-goals-actions";
import { listDebts } from "@/lib/finance-debts-actions";
import { getFocusCounts, getFocusHistory } from "@/lib/taqsimot-actions";
import { getMyProfile, getNotificationPrefs, getTaqsimotSettings } from "@/lib/user-settings-actions";

export const READERS = {
  listPlans,
  listIdeas,
  listCategories,
  listLists,
  listProjects,
  listProjectTasks,
  listPages,
  listHabits,
  listHabitCategories,
  listHorizonGoals,
  listTransactions,
  listFinanceCategories,
  listBudgets,
  listFinancialGoals,
  listDebts,
  getFocusCounts,
  getFocusHistory,
  getMyProfile,
  getNotificationPrefs,
  getTaqsimotSettings,
};

export type Readers = typeof READERS;
