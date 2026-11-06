"use client";

/* Odat toifalari uchun ikonalar — desktop va mobil ko'rinishda umumiy. */

import {
  Activity, Apple, Bath, Bed, Bike, BookOpen, Brain, Briefcase, Cake, Camera, Car, Cat, Code, Coffee, Dog, DollarSign, Droplet, Dumbbell, Feather, Flame, Folder, Footprints, Gamepad2, Gift, Glasses, GraduationCap, Guitar, Hammer, Headphones, Heart, Home, Languages, Laptop, Leaf, MapPin, Medal, Moon, Mountain, Music, Notebook, Paintbrush, Palette, PawPrint, Pencil, Phone, Vault, Pill, Plane, Puzzle, Rocket, Salad, ShoppingCart, ShowerHead, Smile, Sparkles, Sprout, Star, Sun, Target, TreePine, Umbrella, Users, Utensils, Wallet, Wind, Wrench, Zap,
} from "lucide-react";

export const ICONS = {
  heart: Heart, dumbbell: Dumbbell, book: BookOpen, sparkles: Sparkles, brain: Brain, coffee: Coffee,
  moon: Moon, sun: Sun, target: Target, droplet: Droplet, leaf: Leaf, activity: Activity, folder: Folder,
  bike: Bike, footprints: Footprints, apple: Apple, salad: Salad, pill: Pill, bed: Bed, music: Music,
  headphones: Headphones, palette: Palette, pencil: Pencil, code: Code, languages: Languages,
  grad: GraduationCap, briefcase: Briefcase, dollar: DollarSign, rocket: Rocket, wallet: Wallet,
  cart: ShoppingCart, home: Home, users: Users, smile: Smile, flame: Flame, mountain: Mountain,
  star: Star, zap: Zap, sprout: Sprout, hammer: Hammer,
  bath: Bath, cake: Cake, camera: Camera, car: Car, cat: Cat, dog: Dog, feather: Feather,
  gamepad: Gamepad2, gift: Gift, glasses: Glasses, guitar: Guitar, laptop: Laptop, mappin: MapPin,
  medal: Medal, notebook: Notebook, paintbrush: Paintbrush, pawprint: PawPrint, phone: Phone,
  piggybank: Vault, plane: Plane, puzzle: Puzzle, shower: ShowerHead, tree: TreePine,
  umbrella: Umbrella, utensils: Utensils, wind: Wind, wrench: Wrench,
} as const;
export type IconKey = keyof typeof ICONS;
export const ICON_CHOICES = Object.keys(ICONS) as IconKey[];
export function randomIcon(): IconKey { return ICON_CHOICES[Math.floor(Math.random() * ICON_CHOICES.length)]; }
export function CategoryIcon({ k, className }: { k: string; className?: string }) { const Ic = ICONS[k as IconKey] ?? Folder; return <Ic className={className} strokeWidth={1.75} />; }

