import {
  Award, Backpack, BarChart3, BookOpen, Boxes, Bell, Briefcase, Building2,
  Calendar, Camera, Car, Clipboard, Clock, Cloud, Code, Coffee, Compass,
  CreditCard, Crown, Cpu, Database, Feather, FileText, Flag, Flame, Folder,
  Gamepad2, Gem, Gift, GitBranch, Globe, GraduationCap, Heart, Home, Key,
  Layers, LineChart, Library, Lightbulb, MapPin, Medal, Megaphone,
  MessageCircle, MessageSquare, Mic, Moon, Music, Newspaper, Notebook,
  Package, Paintbrush, Palette, PenTool, PieChart, PiggyBank, Plane,
  Presentation, Puzzle, Rocket, School, Send, Server, ShoppingBag, Sparkles,
  Star, Sun, Target, Terminal, ThumbsUp, Timer, TrendingUp, Trophy, Truck,
  Users, Video, Wand2, Wifi, Wrench,
} from "lucide-react";

/** Loyiha (Project) ikonalari — odat/maqsad/moliyadan alohida, kontent va
 *  ish loyihalariga mos keng to'plam. */
export const PROJECT_ICONS = {
  rocket: Rocket, briefcase: Briefcase, bulb: Lightbulb, megaphone: Megaphone,
  pentool: PenTool, filetext: FileText, layers: Layers, folder: Folder,
  target: Target, code: Code, camera: Camera, video: Video, mic: Mic,
  globe: Globe, cart: ShoppingBag, grad: GraduationCap, trending: TrendingUp,
  users: Users, star: Star, send: Send, newspaper: Newspaper, book: BookOpen,
  building: Building2, sparkles: Sparkles, music: Music, gamepad: Gamepad2,
  award: Award, palette: Palette, paintbrush: Paintbrush, feather: Feather,
  wand: Wand2, compass: Compass, mappin: MapPin, flag: Flag, trophy: Trophy,
  medal: Medal, gem: Gem, crown: Crown, gift: Gift, heart: Heart,
  thumbsup: ThumbsUp, msgcircle: MessageCircle, msgsquare: MessageSquare,
  bell: Bell, calendar: Calendar, clock: Clock, timer: Timer, flame: Flame,
  sun: Sun, moon: Moon, wifi: Wifi, cpu: Cpu, database: Database,
  server: Server, cloud: Cloud, terminal: Terminal, gitbranch: GitBranch,
  package: Package, piggybank: PiggyBank, creditcard: CreditCard,
  barchart: BarChart3, piechart: PieChart, linechart: LineChart,
  presentation: Presentation, clipboard: Clipboard, notebook: Notebook,
  library: Library, school: School, backpack: Backpack, puzzle: Puzzle,
  boxes: Boxes, truck: Truck, plane: Plane, car: Car, coffee: Coffee,
  home: Home, wrench: Wrench, key: Key,
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
