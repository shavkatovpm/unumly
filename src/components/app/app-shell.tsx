"use client";

import { useMemo } from "react";
import { usePlans } from "@/lib/plans-store";
import { startOfDay, toDateInputValue } from "@/lib/dates";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { plans } = usePlans();
  const todayIso = useMemo(() => toDateInputValue(startOfDay()), []);
  const todayCount = useMemo(
    () =>
      plans.filter(
        (p) => p.scope === "DAILY" && p.scheduledFor === todayIso && p.status !== "DONE"
      ).length,
    [plans, todayIso]
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar todayCount={todayCount} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
