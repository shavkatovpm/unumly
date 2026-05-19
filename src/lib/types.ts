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
  | "olive"
  | "emerald"
  | "teal"
  | "indigo"
  | "pink"
  | "slate"
  | "stone"
  | "mocha"
  | "white"
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
  // Optional scheduling — when present, the idea is mirrored as a Plan
  // (with the same id) so it appears in Bugun/Agenda/Kalendar too.
  scheduledFor?: string; // YYYY-MM-DD
  time?: string;         // HH:MM
  duration?: number;     // minutes
  priority?: PlanPriority;
};
