export type PlanScope = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type PlanStatus = "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";

export type Plan = {
  id: string;
  title: string;
  notes?: string;
  scope: PlanScope;
  status: PlanStatus;
  scheduledFor: string;   // YYYY-MM-DD
  time?: string;          // HH:MM (24h), optional
  duration?: number;      // minutes, optional (defaults to 60 visually)
  completedAt?: string;   // ISO datetime
  createdAt: string;      // ISO datetime
  order: number;
};
