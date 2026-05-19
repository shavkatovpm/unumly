import type { CategoryColor } from "@/lib/types";

export const CATEGORY_PALETTE: Record<
  CategoryColor,
  { label: string; oklch: string }
> = {
  red:    { label: "Qizil",    oklch: "oklch(0.58 0.13 25)"  },
  amber:  { label: "Sariq",    oklch: "oklch(0.68 0.11 70)"  },
  green:  { label: "Yashil",   oklch: "oklch(0.6  0.12 145)" },
  blue:   { label: "Ko'k",     oklch: "oklch(0.62 0.10 240)" },
  purple: { label: "Binafsha", oklch: "oklch(0.6  0.14 295)" },
  pink:   { label: "Pushti",   oklch: "oklch(0.65 0.13 0)"   },
  teal:   { label: "Yashilko'k", oklch: "oklch(0.62 0.09 195)" },
  gray:   { label: "Kulrang",  oklch: "oklch(0.55 0   0)"    },
};

export const CATEGORY_COLOR_KEYS = Object.keys(CATEGORY_PALETTE) as CategoryColor[];

export function colorWithAlpha(c: CategoryColor, alpha: number): string {
  const base = CATEGORY_PALETTE[c].oklch;
  return base.replace(")", ` / ${alpha})`);
}
