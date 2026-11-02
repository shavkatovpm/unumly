import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { listPlans } from "@/lib/plans-actions";
import { listIdeas } from "@/lib/ideas-actions";
import { listCategories } from "@/lib/categories-actions";
import { listHabits } from "@/lib/habits-actions";
import { listHabitCategories } from "@/lib/habit-categories-actions";
import { listHorizonGoals } from "@/lib/horizon-goals-actions";
import { listTransactions } from "@/lib/finance-actions";
import { listFinanceCategories } from "@/lib/finance-categories-actions";
import { listBudgets } from "@/lib/finance-budgets-actions";
import { listFinancialGoals } from "@/lib/finance-goals-actions";
import { listDebts } from "@/lib/finance-debts-actions";
import { listProjects } from "@/lib/projects-actions";
import { listLists } from "@/lib/tezkor-actions";
import { getTaqsimotSettings } from "@/lib/user-settings-actions";
import { getFocusCounts } from "@/lib/taqsimot-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bitta qism xato bersa qolganlari yo'qolmasin — o'sha store o'zi yuklaydi. */
function optional<T>(p: Promise<T>): Promise<T | null> {
  return p.catch(() => null);
}

async function loadTasks() {
  const [plans, categories, ideas, quickLists, projects] = await Promise.all([
    optional(listPlans()),
    optional(listCategories()),
    optional(listIdeas()),
    optional(listLists()),
    optional(listProjects()),
  ]);
  return { plans, categories, ideas, quickLists, projects };
}

async function loadFinance() {
  const [finance, debts] = await Promise.all([
    optional(
      Promise.all([
        listTransactions(),
        listFinanceCategories(),
        listBudgets(),
        listFinancialGoals(),
      ]).then(([txns, cats, budgets, goals]) => ({ txns, cats, budgets, goals }))
    ),
    optional(listDebts()),
  ]);
  return { finance, debts };
}

async function loadRest() {
  const [habits, habitCategories, horizonGoals, taqsimot] = await Promise.all([
    optional(listHabits()),
    optional(listHabitCategories()),
    optional(listHorizonGoals()),
    optional(Promise.all([getTaqsimotSettings(), getFocusCounts()])),
  ]);
  return { habits, habitCategories, horizonGoals, taqsimot };
}

const LOADERS = { tasks: loadTasks, finance: loadFinance, rest: loadRest };

export type AppData = {
  [P in keyof typeof LOADERS]: Awaited<ReturnType<(typeof LOADERS)[P]>>;
};

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const part = new URL(req.url).searchParams.get("part");
  if (part !== "tasks" && part !== "finance" && part !== "rest") {
    return NextResponse.json({ error: "BAD_PART" }, { status: 400 });
  }
  return NextResponse.json(await LOADERS[part](), {
    headers: { "Cache-Control": "no-store" },
  });
}
