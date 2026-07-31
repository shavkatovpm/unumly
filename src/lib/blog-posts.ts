export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date
  readingMinutes: number;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "teskari-fikrlash",
    title: "Teskari fikrlash: inversion usuli va 4 qadamli amaliyot",
    description:
      "Teskari fikrlash (inversion) — maqsadga erishish yo'lini emas, unga xalaqit beradigan sabablarni topish usuli. Ta'rif, misollar va rejaga qo'shish tartibi.",
    publishedAt: "2026-07-31",
    readingMinutes: 7,
  },
  {
    slug: "vaqtni-boshqarish",
    title: "Vaqtni boshqarish: boshlovchilar uchun to'liq qo'llanma",
    description:
      "Vaqtni boshqarish nima va undan qanday boshlash kerak? Boshlovchilar uchun 7 qadamli o'zbekcha qo'llanma: mashhur usullar, asosiy xatolar va amaliy maslahatlar.",
    publishedAt: "2026-06-17",
    readingMinutes: 9,
  },
  {
    slug: "kunlik-rejalashtirish",
    title: "Kunlik rejalashtirish: 5 qadamda samarali kun",
    description:
      "Kunni qanday rejalashtirish kerak? 5 qadamli o'zbekcha qo'llanma: maqsad qo'yishdan tortib kun nihoyasida sharhlashgacha.",
    publishedAt: "2026-05-21",
    readingMinutes: 5,
  },
  {
    slug: "time-blocking",
    title: "Time blocking: vaqt blok usuli nima va qanday ishlatiladi",
    description:
      "Kunni soat bloklariga bo'lib rejalashtirish texnikasi. Time blocking nima, qaysi vazifalar uchun mos va Unumly Kalendarida qanday qo'llanadi.",
    publishedAt: "2026-05-21",
    readingMinutes: 6,
  },
  {
    slug: "pomodoro-texnikasi",
    title: "Pomodoro texnikasi: 25 daqiqalik fokus sessiyasi",
    description:
      "Pomodoro nima, qachon foydali va vazifalarni Pomodoro bloklariga qanday bo'lish kerak. O'zbekcha to'liq qo'llanma.",
    publishedAt: "2026-05-21",
    readingMinutes: 4,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

/** Ruscha versiyalari mavjud maqolalar (`/blog/ru/<slug>`). */
export const BLOG_POSTS_RU: BlogPost[] = [
  {
    slug: "obratnoe-myshlenie",
    title: "Обратное мышление (инверсия): как думать от провала",
    description:
      "Обратное мышление — метод, при котором вы ищете не путь к цели, а причины провала. Определение, примеры, 4 шага и как встроить это в план.",
    publishedAt: "2026-07-31",
    readingMinutes: 7,
  },
];

export function getBlogPostRu(slug: string): BlogPost | undefined {
  return BLOG_POSTS_RU.find((p) => p.slug === slug);
}

/** uz slug → ru slug (til almashtirgich va hreflang uchun). */
export const BLOG_TRANSLATIONS: Record<string, string> = {
  "teskari-fikrlash": "obratnoe-myshlenie",
};
