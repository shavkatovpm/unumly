export type PlanScope = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type PlanStatus = "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
export type PlanPriority = "LOW" | "MEDIUM" | "HIGH";

export type Plan = {
  id: string;
  title: string;
  notes?: string;
  scope: PlanScope;
  status: PlanStatus;
  priority?: PlanPriority;
  scheduledFor: string;   // YYYY-MM-DD
  time?: string;          // HH:MM (24h), optional
  duration?: number;      // minutes, optional (defaults to 60 visually)
  completedAt?: string;   // ISO datetime
  createdAt: string;      // ISO datetime
  order: number;
};

export type CategoryColor =
  | "red"
  | "amber"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "teal"
  | "gray";

export type Category = {
  id: string;
  label: string;
  color: CategoryColor;
  order: number;
};

export type Idea = {
  id: string;
  title: string;
  notes?: string;
  categoryId: string;
  done: boolean;
  createdAt: string; // ISO datetime
  order: number;
};
