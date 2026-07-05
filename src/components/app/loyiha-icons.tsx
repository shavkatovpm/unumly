import {
  BookOpen, Briefcase, Building2, Camera, Code, FileText, Folder, Gamepad2,
  Globe, GraduationCap, Layers, Lightbulb, Megaphone, Mic, Music, Newspaper,
  PenTool, Rocket, Send, ShoppingBag, Sparkles, Star, Target, TrendingUp,
  Users, Video,
} from "lucide-react";

/** Loyiha (Project) ikonalari — odat/maqsad/moliyadan alohida, kontent va
 *  ish loyihalariga mos kichik to'plam. */
export const PROJECT_ICONS = {
  rocket: Rocket, briefcase: Briefcase, bulb: Lightbulb, megaphone: Megaphone,
  pentool: PenTool, filetext: FileText, layers: Layers, folder: Folder,
  target: Target, code: Code, camera: Camera, video: Video, mic: Mic,
  globe: Globe, cart: ShoppingBag, grad: GraduationCap, trending: TrendingUp,
  users: Users, star: Star, send: Send, newspaper: Newspaper, book: BookOpen,
  building: Building2, sparkles: Sparkles, music: Music, gamepad: Gamepad2,
} as const;

export type ProjectIconKey = keyof typeof PROJECT_ICONS;
export const PROJECT_ICON_CHOICES = Object.keys(PROJECT_ICONS) as ProjectIconKey[];

export function randomProjectIcon(): ProjectIconKey {
  return PROJECT_ICON_CHOICES[Math.floor(Math.random() * PROJECT_ICON_CHOICES.length)];
}

export function ProjectIcon({ k, className }: { k?: string; className?: string }) {
  const Ic = PROJECT_ICONS[k as ProjectIconKey] ?? Sparkles;
  return <Ic className={className} strokeWidth={1.75} />;
}
