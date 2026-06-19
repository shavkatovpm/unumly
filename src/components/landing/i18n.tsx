"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "uz" | "en" | "ru";

export const LANGS: { id: Lang; label: string }[] = [
  { id: "uz", label: "UZ" },
  { id: "en", label: "EN" },
  { id: "ru", label: "RU" },
];

const STORAGE_KEY = "unumly-lang";

/* ───────────────────────── UZ ───────────────────────── */
const uz = {
  metaTitle: "Unumly: Rejalashtirish va boshqarish ilovasi",
  nav: { features: "Imkoniyatlar", price: "Narx", blog: "Blog", about: "Haqida", login: "Kirish" },
  modal: {
    title: "Qanday boshlaymiz?",
    telegramTitle: "Telegram bot orqali",
    telegramDesc: "Eng qulay yoʻl — eslatmalar va tezkor kirish bot orqali.",
    recommended: "Tavsiya",
    webTitle: "Saytda davom etish",
    webDesc: "Toʻgʻridan-toʻgʻri brauzerda ilovaga oʻting.",
  },
  hero: {
    line1: "Kunlik ishlarni rejalashtirish",
    line2a: "Shaxsiy moliyani",
    line2b: "boshqarish",
    sub: "unumly bilan vazifa, odat va maqsadlaringizni yuriting hamda daromad, xarajat va byudjetingizni bir joyda kuzating — sodda, tez va chiroyli.",
    subShort: "Reja, odat, maqsad va shaxsiy moliya — hammasi bitta ilovada.",
    ctaStart: "Boshlash",
    ctaFeatures: "Imkoniyatlar",
  },
  showcase1: { eyebrow: "Kunlik rejalar", title: "Buguningiz bir qarashda" },
  showcase2: {
    eyebrow: "Shaxsiy moliya",
    title: "Pulingizni boshqaring",
  },
  features: { eyebrow: "Modullar", title: "Imkoniyatlar bilan tanishing" },
  modules: {
    bugun: { title: "Bugun", short: "Kunlik vazifalar" },
    agenda: { title: "Agenda", short: "Keyingi 7 kun" },
    tezkor: { title: "Tezkor", short: "Belgilash roʻyxatlari" },
    kalendar: { title: "Kalendar", short: "Kun · hafta · oy · yil" },
    reja: { title: "Reja", short: "Uzoq muddatli rejalar" },
    odat: { title: "Odat", short: "Takrorlanuvchi odatlar" },
    maqsad: { title: "Maqsad", short: "OKR maqsadlari" },
    moliya: { title: "Moliya", short: "Byudjet va xarajat" },
  },
  pricing: {
    eyebrow: "Narx",
    title: "Bugundan boshlang",
    promoBanner: "1-iyulgacha Pro ham mutlaqo bepul",
    unit: "soʻm",
    periodForever: "doimiy",
    periodMonthly: "oyiga",
    priceFree: "0",
    proPrice: "27 000",
    recommended: "Tavsiya",
    free: {
      name: "Bepul",
      tagline: "Boshlash uchun",
      cta: "Boshlash",
      features: [
        "Bugun, Agenda, Reja va Kalendar",
        "Cheksiz vazifa va reja",
        "Maʼlumotlar qurilmangizda saqlanadi",
        "Karta yoki roʻyxatdan oʻtish shart emas",
      ],
    },
    pro: {
      name: "Pro",
      tagline: "Toʻliq imkoniyatlar",
      cta: "Aksiyani olish",
      promoLabel: "1-iyulgacha bepul",
      promoPrice: "Bepul",
      note: "1-iyuldan keyin 27 000 soʻm / oy",
      features: [
        "Bepuldagi barcha imkoniyatlar",
        "Telegram eslatmalari (@unumlybot)",
        "Bulutli sinxronizatsiya — barcha qurilmalar",
        "Odat va Maqsad (OKR) modullari",
        "Barcha rang temalari",
        "Ustuvor qoʻllab-quvvatlash",
      ],
    },
  },
  bugun: {
    header: "Bugun",
    date: "18-iyun, chorshanba",
    greeting: "Bugungi rejalar",
    addPlaceholder: "Bugun nima qilmoqchisiz?",
    timeLabel: "vaqt",
    sections: [
      {
        label: "Ertalab",
        tasks: [
          { time: "07:00", priority: "low", title: "Ertalabki mashq" },
          { time: "09:00", priority: "high", title: "Jamoaviy yigʻilish" },
          { time: "10:30", priority: "high", title: "Loyiha taqdimoti" },
          { time: "11:30", priority: "medium", title: "Maqolani yakunlash", done: true },
        ],
      },
      {
        label: "Kunduzi",
        tasks: [
          { time: "13:00", priority: "medium", title: "Mijoz bilan qoʻngʻiroq" },
          { time: "14:30", priority: "low", title: "Hujjatlarni tekshirish" },
          { time: "15:00", priority: "low", title: "Sport zali" },
          { time: "16:30", priority: "medium", title: "Hisobotni topshirish", done: true },
        ],
      },
      {
        label: "Kechqurun",
        tasks: [
          { time: "18:00", priority: "medium", title: "Bozorlik" },
          { time: "19:00", priority: "low", title: "Oilaviy kechki ovqat" },
          { time: "21:30", priority: "medium", title: "Kunni yakunlash", done: true },
        ],
      },
      {
        label: "Vaqtsiz",
        tasks: [
          { priority: "medium", title: "Kitob oʻqish — 30 daqiqa" },
          { priority: "low", title: "Haftalik rejani koʻrib chiqish" },
          { priority: "none", title: "Doʻstga qoʻngʻiroq qilish" },
          { priority: "low", title: "Xaridlar roʻyxatini tuzish" },
          { priority: "medium", title: "Byudjetni yangilash" },
          { priority: "none", title: "Rasmlarni saralash" },
          { priority: "low", title: "Eski fayllarni tozalash" },
          { priority: "none", title: "Suv ichishni unutmaslik", done: true },
        ],
      },
    ],
  },
  finance: {
    header: "Moliya",
    month: "Iyun 2026",
    currency: "soʻm",
    balanceLabel: "Joriy balans",
    balance: "4 250 000",
    incomeLabel: "Kirim",
    income: "+6,8M",
    expenseLabel: "Chiqim",
    expense: "−2,55M",
    budgetLabel: "Oylik byudjet",
    budgetValue: "2,55M / 4M",
    catsLabel: "Toifalar boʻyicha",
    txLabel: "Soʻnggi amallar",
    cats: [
      { name: "Uy-joy", amount: "1 440 000", pct: "47%" },
      { name: "Oziq-ovqat va kafe", amount: "735 000", pct: "24%" },
      { name: "Transport", amount: "218 000", pct: "12%" },
      { name: "Boshqa", amount: "195 000", pct: "17%" },
    ],
    tx: [
      { title: "Oylik maosh", cat: "Daromad", amount: "+6 800 000", positive: true },
      { title: "Ijara", cat: "Uy-joy", amount: "−1 200 000" },
      { title: "Bozorlik", cat: "Oziq-ovqat", amount: "−420 000" },
      { title: "Frilans loyiha", cat: "Daromad", amount: "+1 500 000", positive: true },
      { title: "Yoqilgʻi", cat: "Transport", amount: "−180 000" },
      { title: "Kiyim", cat: "Xarid", amount: "−260 000" },
      { title: "Tushlik", cat: "Kafe", amount: "−75 000" },
      { title: "Mobil aloqa", cat: "Aloqa", amount: "−45 000" },
      { title: "Internet", cat: "Obuna", amount: "−55 000" },
      { title: "Taksi", cat: "Transport", amount: "−38 000" },
      { title: "Kechki ovqat", cat: "Kafe", amount: "−120 000" },
      { title: "Dorixona", cat: "Sogʻliq", amount: "−95 000" },
      { title: "Bonus", cat: "Daromad", amount: "+800 000", positive: true },
      { title: "Kommunal", cat: "Uy-joy", amount: "−240 000" },
    ],
  },
};

type Translation = typeof uz;

/* ───────────────────────── EN ───────────────────────── */
const en: Translation = {
  metaTitle: "Unumly: Plan it, manage it, master it",
  nav: { features: "Features", price: "Pricing", blog: "Blog", about: "About", login: "Sign in" },
  modal: {
    title: "How would you like to start?",
    telegramTitle: "Via Telegram bot",
    telegramDesc: "The easiest way — reminders and quick access through the bot.",
    recommended: "Recommended",
    webTitle: "Continue on the website",
    webDesc: "Go straight to the app in your browser.",
  },
  hero: {
    line1: "Plan your daily tasks,",
    line2a: "manage personal finance",
    line2b: "",
    sub: "With unumly, run your tasks, habits and goals while tracking income, expenses and budget — all in one place. Simple, fast and beautiful.",
    subShort: "Plans, habits, goals and personal finance — all in one app.",
    ctaStart: "Get started",
    ctaFeatures: "Features",
  },
  showcase1: { eyebrow: "Daily plans", title: "Your day at a glance" },
  showcase2: {
    eyebrow: "Personal finance",
    title: "Manage your money",
  },
  features: { eyebrow: "Modules", title: "Explore the features" },
  modules: {
    bugun: { title: "Today", short: "Daily tasks" },
    agenda: { title: "Agenda", short: "Next 7 days" },
    tezkor: { title: "Quick", short: "Checklists" },
    kalendar: { title: "Calendar", short: "Day · week · month · year" },
    reja: { title: "Plans", short: "Long-term plans" },
    odat: { title: "Habits", short: "Recurring habits" },
    maqsad: { title: "Goals", short: "OKR goals" },
    moliya: { title: "Finance", short: "Budget & expenses" },
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Start today",
    promoBanner: "Pro is completely free until July 1",
    unit: "UZS",
    periodForever: "forever",
    periodMonthly: "per month",
    priceFree: "0",
    proPrice: "27 000",
    recommended: "Recommended",
    free: {
      name: "Free",
      tagline: "To get started",
      cta: "Get started",
      features: [
        "Today, Agenda, Plans and Calendar",
        "Unlimited tasks and plans",
        "Data stored on your device",
        "No card or sign-up required",
      ],
    },
    pro: {
      name: "Pro",
      tagline: "Everything included",
      cta: "Claim the offer",
      promoLabel: "Free until July 1",
      promoPrice: "Free",
      note: "27 000 UZS / month after July 1",
      features: [
        "Everything in Free",
        "Telegram reminders (@unumlybot)",
        "Cloud sync across all devices",
        "Habits and Goals (OKR) modules",
        "All color themes",
        "Priority support",
      ],
    },
  },
  bugun: {
    header: "Today",
    date: "June 18, Wed",
    greeting: "Today's plans",
    addPlaceholder: "What will you do today?",
    timeLabel: "time",
    sections: [
      {
        label: "Morning",
        tasks: [
          { time: "07:00", priority: "low", title: "Morning workout" },
          { time: "09:00", priority: "high", title: "Team meeting" },
          { time: "10:30", priority: "high", title: "Project presentation" },
          { time: "11:30", priority: "medium", title: "Finish the article", done: true },
        ],
      },
      {
        label: "Afternoon",
        tasks: [
          { time: "13:00", priority: "medium", title: "Client call" },
          { time: "14:30", priority: "low", title: "Review documents" },
          { time: "15:00", priority: "low", title: "Gym" },
          { time: "16:30", priority: "medium", title: "Submit the report", done: true },
        ],
      },
      {
        label: "Evening",
        tasks: [
          { time: "18:00", priority: "medium", title: "Groceries" },
          { time: "19:00", priority: "low", title: "Family dinner" },
          { time: "21:30", priority: "medium", title: "Wrap up the day", done: true },
        ],
      },
      {
        label: "Anytime",
        tasks: [
          { priority: "medium", title: "Read — 30 minutes" },
          { priority: "low", title: "Review weekly plan" },
          { priority: "none", title: "Call a friend" },
          { priority: "low", title: "Make a shopping list" },
          { priority: "medium", title: "Update the budget" },
          { priority: "none", title: "Sort photos" },
          { priority: "low", title: "Clean up old files" },
          { priority: "none", title: "Don't forget water", done: true },
        ],
      },
    ],
  },
  finance: {
    header: "Finance",
    month: "June 2026",
    currency: "UZS",
    balanceLabel: "Current balance",
    balance: "4 250 000",
    incomeLabel: "Income",
    income: "+6.8M",
    expenseLabel: "Expenses",
    expense: "−2.55M",
    budgetLabel: "Monthly budget",
    budgetValue: "2.55M / 4M",
    catsLabel: "By category",
    txLabel: "Recent transactions",
    cats: [
      { name: "Housing", amount: "1 440 000", pct: "47%" },
      { name: "Food & cafes", amount: "735 000", pct: "24%" },
      { name: "Transport", amount: "218 000", pct: "12%" },
      { name: "Other", amount: "195 000", pct: "17%" },
    ],
    tx: [
      { title: "Salary", cat: "Income", amount: "+6 800 000", positive: true },
      { title: "Rent", cat: "Housing", amount: "−1 200 000" },
      { title: "Groceries", cat: "Food", amount: "−420 000" },
      { title: "Freelance project", cat: "Income", amount: "+1 500 000", positive: true },
      { title: "Fuel", cat: "Transport", amount: "−180 000" },
      { title: "Clothing", cat: "Shopping", amount: "−260 000" },
      { title: "Lunch", cat: "Cafe", amount: "−75 000" },
      { title: "Mobile", cat: "Telecom", amount: "−45 000" },
      { title: "Internet", cat: "Subscription", amount: "−55 000" },
      { title: "Taxi", cat: "Transport", amount: "−38 000" },
      { title: "Dinner", cat: "Cafe", amount: "−120 000" },
      { title: "Pharmacy", cat: "Health", amount: "−95 000" },
      { title: "Bonus", cat: "Income", amount: "+800 000", positive: true },
      { title: "Utilities", cat: "Housing", amount: "−240 000" },
    ],
  },
};

/* ───────────────────────── RU ───────────────────────── */
const ru: Translation = {
  metaTitle: "Unumly: планируй, управляй, достигай",
  nav: { features: "Возможности", price: "Цены", blog: "Blog", about: "О приложении", login: "Войти" },
  modal: {
    title: "Как начнём?",
    telegramTitle: "Через Telegram-бот",
    telegramDesc: "Самый удобный способ — напоминания и быстрый вход через бота.",
    recommended: "Рекомендуем",
    webTitle: "Продолжить на сайте",
    webDesc: "Перейти в приложение прямо в браузере.",
  },
  hero: {
    line1: "Планируйте дела,",
    line2a: "управляйте финансами",
    line2b: "",
    sub: "С unumly ведите задачи, привычки и цели и отслеживайте доходы, расходы и бюджет — всё в одном месте. Просто, быстро и красиво.",
    subShort: "Планы, привычки, цели и финансы — всё в одном приложении.",
    ctaStart: "Начать",
    ctaFeatures: "Возможности",
  },
  showcase1: { eyebrow: "Планы на день", title: "Ваш день с одного взгляда" },
  showcase2: {
    eyebrow: "Личные финансы",
    title: "Управляйте деньгами",
  },
  features: { eyebrow: "Модули", title: "Познакомьтесь с возможностями" },
  modules: {
    bugun: { title: "Сегодня", short: "Задачи на день" },
    agenda: { title: "Повестка", short: "Ближайшие 7 дней" },
    tezkor: { title: "Быстрые", short: "Чек-листы" },
    kalendar: { title: "Календарь", short: "День · неделя · месяц · год" },
    reja: { title: "Планы", short: "Долгосрочные планы" },
    odat: { title: "Привычки", short: "Повторяющиеся привычки" },
    maqsad: { title: "Цели", short: "OKR-цели" },
    moliya: { title: "Финансы", short: "Бюджет и расходы" },
  },
  pricing: {
    eyebrow: "Цены",
    title: "Начните сегодня",
    promoBanner: "До 1 июля Pro тоже полностью бесплатно",
    unit: "сум",
    periodForever: "навсегда",
    periodMonthly: "в месяц",
    priceFree: "0",
    proPrice: "27 000",
    recommended: "Рекомендуем",
    free: {
      name: "Бесплатно",
      tagline: "Для старта",
      cta: "Начать",
      features: [
        "Сегодня, Повестка, Планы и Календарь",
        "Неограниченно задач и планов",
        "Данные хранятся на устройстве",
        "Без карты и регистрации",
      ],
    },
    pro: {
      name: "Pro",
      tagline: "Все возможности",
      cta: "Получить акцию",
      promoLabel: "Бесплатно до 1 июля",
      promoPrice: "Бесплатно",
      note: "С 1 июля — 27 000 сум / мес",
      features: [
        "Всё из тарифа Бесплатно",
        "Напоминания в Telegram (@unumlybot)",
        "Облачная синхронизация на всех устройствах",
        "Модули Привычки и Цели (OKR)",
        "Все цветовые темы",
        "Приоритетная поддержка",
      ],
    },
  },
  bugun: {
    header: "Сегодня",
    date: "18 июня, ср",
    greeting: "Планы на сегодня",
    addPlaceholder: "Что сделаете сегодня?",
    timeLabel: "время",
    sections: [
      {
        label: "Утро",
        tasks: [
          { time: "07:00", priority: "low", title: "Утренняя зарядка" },
          { time: "09:00", priority: "high", title: "Командная встреча" },
          { time: "10:30", priority: "high", title: "Презентация проекта" },
          { time: "11:30", priority: "medium", title: "Завершить статью", done: true },
        ],
      },
      {
        label: "День",
        tasks: [
          { time: "13:00", priority: "medium", title: "Звонок клиенту" },
          { time: "14:30", priority: "low", title: "Проверить документы" },
          { time: "15:00", priority: "low", title: "Спортзал" },
          { time: "16:30", priority: "medium", title: "Сдать отчёт", done: true },
        ],
      },
      {
        label: "Вечер",
        tasks: [
          { time: "18:00", priority: "medium", title: "Продукты" },
          { time: "19:00", priority: "low", title: "Семейный ужин" },
          { time: "21:30", priority: "medium", title: "Подвести итоги дня", done: true },
        ],
      },
      {
        label: "Без времени",
        tasks: [
          { priority: "medium", title: "Чтение — 30 минут" },
          { priority: "low", title: "Просмотреть план недели" },
          { priority: "none", title: "Позвонить другу" },
          { priority: "low", title: "Составить список покупок" },
          { priority: "medium", title: "Обновить бюджет" },
          { priority: "none", title: "Разобрать фото" },
          { priority: "low", title: "Удалить старые файлы" },
          { priority: "none", title: "Не забыть про воду", done: true },
        ],
      },
    ],
  },
  finance: {
    header: "Финансы",
    month: "Июнь 2026",
    currency: "сум",
    balanceLabel: "Текущий баланс",
    balance: "4 250 000",
    incomeLabel: "Доход",
    income: "+6,8M",
    expenseLabel: "Расход",
    expense: "−2,55M",
    budgetLabel: "Месячный бюджет",
    budgetValue: "2,55M / 4M",
    catsLabel: "По категориям",
    txLabel: "Последние операции",
    cats: [
      { name: "Жильё", amount: "1 440 000", pct: "47%" },
      { name: "Еда и кафе", amount: "735 000", pct: "24%" },
      { name: "Транспорт", amount: "218 000", pct: "12%" },
      { name: "Прочее", amount: "195 000", pct: "17%" },
    ],
    tx: [
      { title: "Зарплата", cat: "Доход", amount: "+6 800 000", positive: true },
      { title: "Аренда", cat: "Жильё", amount: "−1 200 000" },
      { title: "Продукты", cat: "Еда", amount: "−420 000" },
      { title: "Фриланс-проект", cat: "Доход", amount: "+1 500 000", positive: true },
      { title: "Топливо", cat: "Транспорт", amount: "−180 000" },
      { title: "Одежда", cat: "Покупки", amount: "−260 000" },
      { title: "Обед", cat: "Кафе", amount: "−75 000" },
      { title: "Мобильная связь", cat: "Связь", amount: "−45 000" },
      { title: "Интернет", cat: "Подписка", amount: "−55 000" },
      { title: "Такси", cat: "Транспорт", amount: "−38 000" },
      { title: "Ужин", cat: "Кафе", amount: "−120 000" },
      { title: "Аптека", cat: "Здоровье", amount: "−95 000" },
      { title: "Бонус", cat: "Доход", amount: "+800 000", positive: true },
      { title: "Коммуналка", cat: "Жильё", amount: "−240 000" },
    ],
  },
};

const DICT: Record<Lang, Translation> = { uz, en, ru };

type LangCtxValue = { lang: Lang; setLang: (l: Lang) => void };
const LangCtx = createContext<LangCtxValue>({ lang: "uz", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("uz");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "uz" || saved === "en" || saved === "ru") {
      setLangState(saved);
    }
  }, []);

  // Tab/SEO sarlavhasini tanlangan tilga moslash
  useEffect(() => {
    document.title = DICT[lang].metaTitle;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  };

  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}

export function useT() {
  return DICT[useContext(LangCtx).lang];
}
