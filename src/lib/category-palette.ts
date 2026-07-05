import type { CategoryColor } from "@/lib/types";

/**
 * Kategoriya palitrasi — muhimlik (priority) hue'laridan farqli ranglar.
 *
 * Priority hue'lari:
 *   high   ≈ 25°  (qizil)
 *   medium ≈ 70°  (sariq/amber)
 *   low    ≈ 240° (ko'k)
 *
 * Palitrada 5 ta yorqin, 3 ta minimalist/neytral va 8 ta yorqinroq/to'yingan
 * rang bor.
 */
export const CATEGORY_PALETTE: Record<
  CategoryColor,
  { label: string; oklch: string }
> = {
  // Boshida — neytral asosiy (theme'ga moslashadi)
  white:   { label: "Asosiy",    oklch: "var(--foreground)"     },
  gray:    { label: "Kulrang",   oklch: "oklch(0.55 0 0)"       },
  // Yorqin
  olive:   { label: "Zaytun",    oklch: "oklch(0.58 0.08 110)"  },
  emerald: { label: "Zumrad",    oklch: "oklch(0.6  0.12 160)"  },
  teal:    { label: "Akvamarin", oklch: "oklch(0.62 0.10 200)"  },
  indigo:  { label: "Indigo",    oklch: "oklch(0.55 0.14 270)"  },
  pink:    { label: "Pushti",    oklch: "oklch(0.72 0.10 350)"  },
  // Minimalist
  slate:   { label: "Toshrang",  oklch: "oklch(0.55 0.03 230)"  },
  stone:   { label: "Qum",       oklch: "oklch(0.62 0.025 60)"  },
  mocha:   { label: "Jigarrang", oklch: "oklch(0.45 0.04 50)"   },
  // Yorqinroq/to'yingan
  red:     { label: "Qizil",     oklch: "oklch(0.6  0.21 25)"   },
  orange:  { label: "Apelsin",   oklch: "oklch(0.68 0.17 55)"   },
  amber:   { label: "Amber",     oklch: "oklch(0.8  0.16 85)"   },
  lime:    { label: "Laym",      oklch: "oklch(0.74 0.19 130)"  },
  cyan:    { label: "Moviy",     oklch: "oklch(0.7  0.13 195)"  },
  blue:    { label: "Ko'k",      oklch: "oklch(0.58 0.19 250)"  },
  violet:  { label: "Binafsha",  oklch: "oklch(0.56 0.22 300)"  },
  magenta: { label: "Fuksiya",   oklch: "oklch(0.62 0.23 335)"  },
};

export const CATEGORY_COLOR_KEYS = Object.keys(CATEGORY_PALETTE) as CategoryColor[];

export function colorWithAlpha(c: CategoryColor, alpha: number): string {
  const base = CATEGORY_PALETTE[c].oklch;
  return base.replace(")", ` / ${alpha})`);
}

/**
 * Eskirgan rang kalitlari → yangi palitraga moslash.
 * localStorage'dagi eski ma'lumotlarni jonli migratsiya qilish uchun.
 * (red/amber/blue/magenta endi haqiqiy kalit — shu sabab bu yerda yo'q;
 * ular CATEGORY_COLOR_KEYS tekshiruvida to'g'ridan-to'g'ri topiladi.)
 */
const LEGACY_COLOR_MAP: Record<string, CategoryColor> = {
  green:  "emerald",
  purple: "mocha",
};

export function migrateCategoryColor(c: unknown): CategoryColor {
  if (typeof c !== "string") return "indigo";
  if ((CATEGORY_COLOR_KEYS as string[]).includes(c)) return c as CategoryColor;
  return LEGACY_COLOR_MAP[c] ?? "indigo";
}
