export type PlanScope = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type PlanStatus = "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
export type PlanPriority = "LOW" | "MEDIUM" | "HIGH";

/** Vazifa ichidagi kichik vazifa (sub-task). */
export type Subtask = {
  id: string;
  title: string;
  done: boolean;
};

export type Plan = {
  id: string;
  title: string;
  notes?: string;
  /** Ichki vazifalar (sub-task'lar). */
  subtasks?: Subtask[];
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
  /** Set when this plan is the scheduled occurrence of a Goal step (OKR qadami). */
  goalStepId?: string;
  /** Set when this plan belongs to a Loyiha (Project) workspace, not the personal space. */
  projectId?: string;
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
  /** Whether occurrences of this habit show up in the Agenda list (still tracked in Bugun/Kalendar either way). */
  showInAgenda: boolean;
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
  | "gray"
  | "red"
  | "orange"
  | "amber"
  | "lime"
  | "cyan"
  | "blue"
  | "violet"
  | "magenta";

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
  completedAt?: string; // ISO datetime — bajarilgan vaqt (Arxiv uchun)
  subtasks?: Subtask[]; // ichki vazifalar
  createdAt: string; // ISO datetime
  order: number;
  // Optional scheduling — when present, the idea is mirrored as a Plan
  // (with the same id) so it appears in Bugun/Agenda/Kalendar too.
  scheduledFor?: string; // YYYY-MM-DD
  time?: string;         // HH:MM
  duration?: number;     // minutes
  priority?: PlanPriority;
};

/* ─── Maqsad (Goals / OKR) ─── */

export type GoalStatus = "ACTIVE" | "DONE" | "ARCHIVED";

/** Qadam — eng kichik birlik. Istalgan kunga (vaqt bilan) belgilanishi mumkin;
 *  belgilangach Plan occurrence sifatida task ko'rinishlarida paydo bo'ladi. */
export type GoalStep = {
  id: string;
  subGoalId: string;
  title: string;
  done: boolean;
  order: number;
  // Belgilangan bo'lsa — bog'langan Plan occurrence ma'lumotlari (mirror).
  scheduledFor?: string; // YYYY-MM-DD
  time?: string;         // HH:MM
  planId?: string;       // bog'langan Plan id
};

/** Kichik maqsad (key result) — qadamlardan tashkil topadi. */
export type SubGoal = {
  id: string;
  goalId: string;
  title: string;
  order: number;
  steps: GoalStep[];
};

/** Maqsad (OKR) — kichik maqsadlar daraxti. */
export type Goal = {
  id: string;
  title: string;
  icon?: string;          // lucide key
  deadline?: string;      // YYYY-MM-DD
  status: GoalStatus;
  order: number;
  archivedAt?: string;    // ISO datetime
  createdAt: string;      // ISO datetime
  subGoals: SubGoal[];
  /** Set when this goal belongs to a Loyiha (Project) workspace, not the personal space. */
  projectId?: string;
};

/* ─── Loyiha (Project workspace) ─── */

/** Loyihalar taqsimoti — A/B/C/D muhimlik toifasi (Reja/Analitika). */
export type LoyihaKategoriya = "A" | "B" | "C" | "D";

export type Project = {
  id: string;
  title: string;
  icon?: string;        // lucide key
  color?: CategoryColor;
  order: number;
  archivedAt?: string;  // ISO datetime
  category?: LoyihaKategoriya;
  targetHours?: number; // haftalik maqsad soat
};

/** Node in a project's page tree (Notion-style nested pages, arbitrary
 *  depth via parentId). `content` is an opaque BlockNote document (array
 *  of blocks) — typed loosely here so this shared file doesn't depend on
 *  the editor library. */
export type Page = {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  icon?: string;
  content: unknown[] | null;
  order: number;
  createdAt: string;    // ISO datetime
  updatedAt: string;    // ISO datetime
};

/** Flat todo row for a Project's "Jadval" (table) view. Deliberately
 *  separate from Plan — no mandatory scheduled date. */
export type ProjectTask = {
  id: string;
  projectId: string;
  title: string;
  done: boolean;
  priority?: PlanPriority;
  dueDate?: string;  // YYYY-MM-DD
  order: number;
  createdAt: string; // ISO datetime
};

/* ─── Moliya (Finance) ─── */

export type TransactionType = "INCOME" | "EXPENSE";

/** Kirim/chiqim kategoriyasi. Har biri bir turga (kirim yoki chiqim) tegishli. */
export type FinanceCategory = {
  id: string;
  type: TransactionType;
  label: string;
  icon: string;           // lucide key
  color: CategoryColor;
  order: number;
};

/** Bitta kirim yoki chiqim yozuvi. `amount` — so'mda butun son (string sifatida
 *  uzatiladi, chunki BigInt JSON'da serialize bo'lmaydi). */
export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;         // so'm (butun son)
  categoryId: string | null;
  note?: string;
  date: string;           // YYYY-MM-DD
  createdAt: string;      // ISO datetime
};

/** Chiqim kategoriyasiga oylik byudjet limiti. */
export type Budget = {
  id: string;
  categoryId: string;
  amount: number;         // oylik limit (so'm)
};

/** Moliyaviy maqsad (yig'im) — targetga yetish uchun savedAmount oshib boradi. */
export type FinancialGoal = {
  id: string;
  title: string;
  icon?: string;
  targetAmount: number;   // maqsad summa (so'm)
  savedAmount: number;    // yig'ilgan summa (so'm)
  deadline?: string;      // YYYY-MM-DD
  order: number;
};

/** Yig'im maqsadiga bitta hissa (qo'shish/yechish) tarix yozuvi. */
export type GoalContribution = {
  id: string;
  goalId: string;
  amount: number;   // musbat = qo'shildi, manfiy = yechildi (so'm)
  date: string;      // YYYY-MM-DD
  note?: string;
};

/* ─── Qarzdorlik (Debts) ─── */

/** BORROWED — men oldim (qarzdorman); LENT — men berdim (menga qarzdor). */
export type DebtType = "BORROWED" | "LENT";

/** Qarz valyutasi. UZS — so'm (asosiy), USD — dollar, EUR — yevro. */
export type Currency = "UZS" | "USD" | "EUR";

export type Debt = {
  id: string;
  type: DebtType;
  counterparty: string;   // kim bilan
  amount: number;         // umumiy summa
  paidAmount: number;     // qaytarilgan qism
  currency: Currency;     // valyuta (UZS default)
  issuedDate: string;     // YYYY-MM-DD — qarz qachon berilgan/olingan
  dueDate?: string;       // YYYY-MM-DD
  note?: string;
  settledAt?: string;     // ISO — to'liq hal qilingan bo'lsa
  order: number;
  /** Muddat kelganda Agenda/Bugun'da eslatma sifatida ko'rsatish (ixtiyoriy). */
  agendaReminder?: boolean;
  /** Muddatdan necha kun oldin ko'rina boshlasin (0 = aynan muddat kuni). */
  reminderLeadDays?: number;
  /** YYYY-MM-DD — kechiktirilgan bo'lsa, shu kungача Agenda'da yashiriladi. */
  snoozedUntil?: string;
};
