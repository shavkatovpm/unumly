"use client";

import { preloadCategories } from "@/lib/categories-store";
import { preloadDebts } from "@/lib/debts-store";
import { preloadFinance } from "@/lib/finance-store";
import { preloadHabitCategories } from "@/lib/habit-categories-store";
import { preloadHabits } from "@/lib/habits-store";
import { preloadHorizonGoals } from "@/lib/horizon-goals-store";
import { preloadIdeas } from "@/lib/ideas-store";
import { preloadPages } from "@/lib/pages-store";
import { preloadPlans } from "@/lib/plans-store";
import { preloadProjectTasks } from "@/lib/project-tasks-store";
import { preloadProjects } from "@/lib/projects-store";
import { preloadTaqsimot } from "@/lib/taqsimot-store";
import { preloadQuickLists } from "@/lib/tezkor-store";

/** Ilovaga kirganda — keyin bo'limlar orasida o'tishda loading chiqmaydi. */
export function preloadAppData() {
  preloadPlans();
  preloadIdeas();
  preloadCategories();
  preloadHabits();
  preloadHabitCategories();
  preloadHorizonGoals();
  preloadFinance();
  preloadDebts();
  preloadProjects();
  preloadQuickLists();
  preloadTaqsimot();
}

/** Loyiha ichidagi tablar ham darhol ochilishi uchun. */
export function preloadProject(projectId: string) {
  preloadPages(projectId);
  preloadProjectTasks(projectId);
  preloadCategories(projectId);
  preloadIdeas(projectId);
}
