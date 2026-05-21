export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date
  readingMinutes: number;
};

export const BLOG_POSTS: BlogPost[] = [
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
