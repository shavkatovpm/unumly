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

async function loadAppData() {
  const [plans, ideas, categories, habits, habitCategories, horizonGoals, finance, debts, projects, quickLists, taqsimot] =
    await Promise.all([
      optional(listPlans()),
      optional(listIdeas()),
      optional(listCategories()),
      optional(listHabits()),
      optional(listHabitCategories()),
      optional(listHorizonGoals()),
      optional(
        Promise.all([
          listTransactions(),
          listFinanceCategories(),
          listBudgets(),
          listFinancialGoals(),
        ]).then(([txns, cats, budgets, goals]) => ({ txns, cats, budgets, goals }))
      ),
      optional(listDebts()),
      optional(listProjects()),
      optional(listLists()),
      optional(Promise.all([getTaqsimotSettings(), getFocusCounts()])),
    ]);
  return { plans, ideas, categories, habits, habitCategories, horizonGoals, finance, debts, projects, quickLists, taqsimot };
}

export type AppData = Awaited<ReturnType<typeof loadAppData>>;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  return NextResponse.json(await loadAppData(), {
    headers: { "Cache-Control": "no-store" },
  });
}
