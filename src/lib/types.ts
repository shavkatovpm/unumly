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
  /** Per-task override: minutes before scheduled time when reminder fires.
   *  When undefined, the user's account default (notifyLeadMin) is used. */
  notifyLeadMin?: number;
  completedAt?: string;   // ISO datetime
  deletedAt?: string;     // ISO datetime — set when soft-deleted; 30 days later auto-purged
  createdAt: string;      // ISO datetime
  order: number;
  /** Set when this plan is a generated occurrence of a recurring Habit. */
  habitId?: string;
};

/* ─── Odat (Habits) ─── */

export type HabitCategory = {
  id: string;
  label: string;
  icon: string;   // lucide key
  order: number;
};

export type Habit = {
  id: string;
  title: string;
  categoryId: string | null;
  days: number[];          // weekdays getDay() 0=Sun..6=Sat
  time?: string;           // HH:MM
  notifyLeadMin?: number;
  order: number;
  archivedAt?: string;     // ISO datetime when archived
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
