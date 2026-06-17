import {
  Sun,
  CalendarDays,
  ListChecks,
  CalendarRange,
  LayoutGrid,
  Repeat,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey =
  | "bugun"
  | "agenda"
  | "tezkor"
  | "kalendar"
  | "reja"
  | "odat"
  | "maqsad"
  | "moliya";

export type ModuleDef = { key: ModuleKey; icon: LucideIcon };

// Tarkibiy ma'lumot — matnlar i18n.tsx dagi `modules` dan olinadi
export const MODULES: ModuleDef[] = [
  { key: "bugun", icon: Sun },
  { key: "agenda", icon: CalendarDays },
  { key: "tezkor", icon: ListChecks },
  { key: "kalendar", icon: CalendarRange },
  { key: "reja", icon: LayoutGrid },
  { key: "odat", icon: Repeat },
  { key: "maqsad", icon: Target },
  { key: "moliya", icon: Wallet },
];

export type PlanKey = "free" | "pro";

export type PlanDef = {
  key: PlanKey;
  featured: boolean;
  promo: boolean;
  href: string;
};

// Narx/matn i18n.tsx dagi `pricing` dan olinadi
export const PLANS: PlanDef[] = [
  { key: "free", featured: false, promo: false, href: "/bugun" },
  { key: "pro", featured: true, promo: true, href: "/bugun" },
];
