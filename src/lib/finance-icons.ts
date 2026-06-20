"use client";

import {
  Banknote,
  Briefcase,
  Bus,
  Car,
  CircleDashed,
  Coins,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Plane,
  Receipt,
  Shirt,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  Utensils,
  Vault,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Moliya kategoriyalari uchun ikona kaliti (kebab) → lucide komponent. */
export const FINANCE_ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  coins: Coins,
  banknote: Banknote,
  "trending-up": TrendingUp,
  briefcase: Briefcase,
  vault: Vault,
  landmark: Landmark,
  gift: Gift,
  utensils: Utensils,
  "shopping-bag": ShoppingBag,
  shirt: Shirt,
  car: Car,
  bus: Bus,
  fuel: Fuel,
  plane: Plane,
  home: Home,
  receipt: Receipt,
  smartphone: Smartphone,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  "graduation-cap": GraduationCap,
  "gamepad-2": Gamepad2,
  "circle-dashed": CircleDashed,
};

/** Kategoriya tanlovida ko'rsatiladigan ikonalar ro'yxati. */
export const FINANCE_ICON_KEYS = Object.keys(FINANCE_ICONS);

/** Kalitni komponentga aylantiradi (noma'lum bo'lsa — CircleDashed). */
export function financeIcon(key: string | null | undefined): LucideIcon {
  return (key && FINANCE_ICONS[key]) || CircleDashed;
}
