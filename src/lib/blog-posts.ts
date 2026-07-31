export type BlogLang = "uz" | "ru" | "en";

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

/** Ruscha versiyalar (`/blog/ru/<slug>`). */
export const BLOG_POSTS_RU: BlogPost[] = [
  {
    slug: "obratnoe-myshlenie",
    title: "Обратное мышление (инверсия): как думать от провала",
    description:
      "Обратное мышление — метод, при котором вы ищете не путь к цели, а причины провала. Определение, примеры, 4 шага и как встроить это в план.",
    publishedAt: "2026-07-31",
    readingMinutes: 7,
  },
  {
    slug: "upravlenie-vremenem",
    title: "Управление временем: полное руководство для начинающих",
    description:
      "Что такое управление временем и с чего начать? Руководство из 7 шагов: популярные методы, типичные ошибки и как выбрать подходящий подход.",
    publishedAt: "2026-07-31",
    readingMinutes: 9,
  },
  {
    slug: "planirovanie-dnya",
    title: "Планирование дня: 5 шагов к продуктивному дню",
    description:
      "Как спланировать день за 15 минут: пять шагов от постановки цели до вечернего разбора. Сколько задач ставить и когда лучше составлять план.",
    publishedAt: "2026-07-31",
    readingMinutes: 5,
  },
  {
    slug: "taym-blokirovanie",
    title: "Тайм-блокинг: что это и как планировать день блоками",
    description:
      "Тайм-блокинг — техника, когда каждый час дня заранее отдан конкретной задаче. Длина блоков, типичные ошибки и связка с Помодоро.",
    publishedAt: "2026-07-31",
    readingMinutes: 6,
  },
  {
    slug: "tehnika-pomodoro",
    title: "Техника Помодоро: 25 минут фокуса без выгорания",
    description:
      "Что такое Помодоро, кому подходит и как разбить задачи на 25-минутные сессии. Пять шагов, ограничения метода и ответы на частые вопросы.",
    publishedAt: "2026-07-31",
    readingMinutes: 5,
  },
];

/** Inglizcha versiyalar (`/blog/en/<slug>`). */
export const BLOG_POSTS_EN: BlogPost[] = [
  {
    slug: "inversion-thinking",
    title: "Inversion thinking: solve problems backwards",
    description:
      "Inversion means asking what will make you fail instead of how to succeed. Definition, examples, a 5-step routine and how to turn the list into a plan.",
    publishedAt: "2026-07-31",
    readingMinutes: 7,
  },
  {
    slug: "time-management",
    title: "Time management: a practical guide for beginners",
    description:
      "What time management is and how to start: a 7-step guide with the best-known methods, the mistakes beginners make and how to pick an approach.",
    publishedAt: "2026-07-31",
    readingMinutes: 9,
  },
  {
    slug: "daily-planning",
    title: "Daily planning: 5 steps to a productive day",
    description:
      "How to plan a day in 15 minutes: five steps from picking the outcome to the evening review, how many tasks to add and when to plan.",
    publishedAt: "2026-07-31",
    readingMinutes: 5,
  },
  {
    slug: "time-blocking",
    title: "Time blocking: how to plan a day in blocks",
    description:
      "Time blocking gives every hour of the day a job. Block lengths, the mistakes that break the method and how it pairs with Pomodoro.",
    publishedAt: "2026-07-31",
    readingMinutes: 6,
  },
  {
    slug: "pomodoro-technique",
    title: "The Pomodoro Technique: 25 minutes of real focus",
    description:
      "What the Pomodoro Technique is, when it works, when it does not, and how to run your first session in five steps. With FAQ.",
    publishedAt: "2026-07-31",
    readingMinutes: 5,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getBlogPostRu(slug: string): BlogPost | undefined {
  return BLOG_POSTS_RU.find((p) => p.slug === slug);
}

export function getBlogPostEn(slug: string): BlogPost | undefined {
  return BLOG_POSTS_EN.find((p) => p.slug === slug);
}

/**
 * Bitta maqolaning uch tildagi yo'llari. Kalit — o'zbekcha slug.
 * hreflang, til almashtirgich va sitemap shu manbadan foydalanadi.
 */
export const BLOG_PATHS: Record<string, Record<BlogLang, string>> = {
  "teskari-fikrlash": {
    uz: "/blog/teskari-fikrlash",
    ru: "/blog/ru/obratnoe-myshlenie",
    en: "/blog/en/inversion-thinking",
  },
  "vaqtni-boshqarish": {
    uz: "/blog/vaqtni-boshqarish",
    ru: "/blog/ru/upravlenie-vremenem",
    en: "/blog/en/time-management",
  },
  "kunlik-rejalashtirish": {
    uz: "/blog/kunlik-rejalashtirish",
    ru: "/blog/ru/planirovanie-dnya",
    en: "/blog/en/daily-planning",
  },
  "time-blocking": {
    uz: "/blog/time-blocking",
    ru: "/blog/ru/taym-blokirovanie",
    en: "/blog/en/time-blocking",
  },
  "pomodoro-texnikasi": {
    uz: "/blog/pomodoro-texnikasi",
    ru: "/blog/ru/tehnika-pomodoro",
    en: "/blog/en/pomodoro-technique",
  },
};

/** Blog indeks sahifalarining tillar bo'yicha yo'llari. */
export const BLOG_INDEX_PATHS: Record<BlogLang, string> = {
  uz: "/blog",
  ru: "/blog/ru",
  en: "/blog/en",
};

const HREFLANG: Record<BlogLang, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};

/**
 * Next `metadata.alternates` uchun canonical + hreflang to'plami.
 * x-default har doim o'zbekcha versiyaga ishora qiladi (sayt asosiy tili).
 */
export function blogAlternates(paths: Record<BlogLang, string>, lang: BlogLang) {
  return {
    canonical: paths[lang],
    languages: {
      [HREFLANG.uz]: paths.uz,
      [HREFLANG.ru]: paths.ru,
      [HREFLANG.en]: paths.en,
      "x-default": paths.uz,
    },
  };
}
