import {
  Archive, BookOpen, Briefcase, Calendar, Camera, ClipboardList, Code,
  Coffee, DollarSign, FileText, Flag, Folder, GraduationCap, Gift, Globe,
  Heart, Layers, Lightbulb, ListChecks, MapPin, Megaphone, Mic, Music,
  NotebookPen, Palette, PenTool, Rocket, ShoppingBag, Sparkles, Star, Table2,
  Tag, Target, TrendingUp, Users, Video,
} from "lucide-react";
import {
  SiFacebook, SiInstagram, SiPinterest, SiSnapchat, SiTelegram, SiTiktok,
  SiWhatsapp, SiX, SiYoutube,
} from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";
import type { IconType } from "react-icons";

/** Hujjat (sahifa) ikonalari — mavzu/kontent turlariga mos umumiy to'plam. */
export const PAGE_ICONS = {
  filetext: FileText, clipboard: ClipboardList, checklist: ListChecks, table: Table2,
  book: BookOpen, notebook: NotebookPen, pentool: PenTool, bulb: Lightbulb,
  megaphone: Megaphone, camera: Camera, video: Video, mic: Mic, music: Music,
  calendar: Calendar, target: Target, rocket: Rocket, star: Star, sparkles: Sparkles,
  palette: Palette, code: Code, users: Users, dollar: DollarSign, trending: TrendingUp,
  mappin: MapPin, coffee: Coffee, grad: GraduationCap, folder: Folder, archive: Archive,
  tag: Tag, flag: Flag, layers: Layers, globe: Globe, cart: ShoppingBag,
  briefcase: Briefcase, heart: Heart, gift: Gift,
} as const;

/** Ijtimoiy tarmoq ikonalari — kontent-reja loyihalarida mavzuni platformaga
 *  bog'lash uchun (masalan "Instagram Reels g'oyalari"). */
export const SOCIAL_ICONS: Record<string, IconType> = {
  telegram: SiTelegram, instagram: SiInstagram, youtube: SiYoutube,
  tiktok: SiTiktok, facebook: SiFacebook, whatsapp: SiWhatsapp,
  x: SiX, linkedin: FaLinkedinIn, pinterest: SiPinterest, snapchat: SiSnapchat,
};

export type PageIconKey = keyof typeof PAGE_ICONS;
export type SocialIconKey = keyof typeof SOCIAL_ICONS;

export const PAGE_ICON_CHOICES = Object.keys(PAGE_ICONS) as PageIconKey[];
export const SOCIAL_ICON_CHOICES = Object.keys(SOCIAL_ICONS) as SocialIconKey[];

/** Sahifa/karta ustida ko'rsatiladigan ikon — umumiy yoki ijtimoiy tarmoq
 *  to'plamidan, kalit topilmasa FileText'ga tushadi. */
export function PageIcon({ k, className }: { k?: string | null; className?: string }) {
  if (k && k in SOCIAL_ICONS) {
    const Ic = SOCIAL_ICONS[k as SocialIconKey];
    return <Ic className={className} />;
  }
  const Ic = PAGE_ICONS[k as PageIconKey] ?? FileText;
  return <Ic className={className} strokeWidth={1.75} />;
}
