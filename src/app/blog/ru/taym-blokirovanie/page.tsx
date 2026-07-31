import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_PATHS, blogAlternates, getBlogPostRu } from "@/lib/blog-posts";
import {
  BlogArticle,
  Section,
  TableWrap,
  type QA,
} from "@/components/blog/article";

const paths = BLOG_PATHS["time-blocking"];
const post = getBlogPostRu("taym-blokirovanie")!;
const UPDATED = "2026-07-31";

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  keywords: [
    "тайм-блокинг",
    "time blocking",
    "блочное планирование",
    "планирование дня по часам",
    "глубокая работа",
    "календарь задач",
  ],
  alternates: blogAlternates(paths, "ru"),
  openGraph: {
    type: "article",
    locale: "ru_RU",
    title: post.title,
    description: post.description,
    url: `https://unumly.uz${paths.ru}`,
    publishedTime: post.publishedAt,
    modifiedTime: UPDATED,
  },
};

const FAQ: QA[] = [
  {
    q: "Тайм-блокинг и Google Календарь — это одно и то же?",
    a: "Нет. Google Календарь — один из инструментов, а тайм-блокинг — методика. В календарь обычно вносят встречи. При тайм-блокинге туда же попадает любая работа: написать отчёт, программировать, читать — как будто это тоже встреча.",
  },
  {
    q: "Какой длины должны быть блоки?",
    a: "Для глубокой работы 90-120 минут, для встреч 30-60, для мелких дел 15-30. Самая частая ошибка — планировать глубокую работу получасовыми блоками: за это время внимание только начинает собираться.",
  },
  {
    q: "Кому тайм-блокинг не подходит?",
    a: "Тем, чей день состоит из непредсказуемых обращений: оператор поддержки, дежурный врач. Там лучше работает формат «защищённых блоков» — размечаются только паузы и отдых, остальное время реактивное.",
  },
  {
    q: "Что делать, если встреча возникла внезапно?",
    a: "Переставьте блоки, но не отменяйте план целиком. Если один блок сдвинулся, остальные сдвигаются следом — календарь это показывает. Если за день сдвинулось два-три блока, вечером выпишите причины: это лучший материал для настройки системы.",
  },
  {
    q: "Можно ли совмещать тайм-блокинг и Помодоро?",
    a: "Да, пара работает хорошо. Тайм-блокинг выделяет 90-минутный блок глубокой работы, а внутри проходят три помодоро-сессии (25 + 5 + 25 + 5 + 25). Такая связка особенно удобна для письма, программирования и учёбы.",
  },
  {
    q: "Не утомляет ли ежедневная перестройка блоков?",
    a: "Первые две недели — да. Потом появляются шаблоны: спорт утром, глубокая работа с 9:00, встречи по средам. Когда шаблон устоялся, планирование дня занимает 5-7 минут.",
  },
];

const A = "text-foreground underline-offset-4 hover:underline";

export default function Page() {
  return (
    <BlogArticle
      lang="ru"
      post={post}
      paths={paths}
      updated={UPDATED}
      h1="Тайм-блокинг: как планировать день блоками времени"
      answer={
        <>
          <strong className="text-foreground">Коротко:</strong> тайм-блокинг —
          метод, при котором каждый час дня заранее отдан конкретной задаче или
          типу задач. Вместо «сегодня что-нибудь сделаю» вы говорите «с 09:00 до
          10:30 пишу отчёт». Для глубокой работы блоки 90-120 минут; занимать
          стоит 60-70% дня, остальное оставить под непредвиденное.
        </>
      }
      faq={FAQ}
      cta={{
        eyebrow: "Попробуйте",
        title: "Поставьте первый блок в календаре",
        text: "Откройте недельный вид и разложите три завтрашние крупные задачи по 90-минутным блокам.",
        botLabel: "Открыть в Telegram-боте",
        siteLabel: "Открыть календарь",
        siteHref: "/kalendar",
      }}
    >
      <Section title="Что такое тайм-блокинг?">
        <p className="text-muted">
          Тайм-блокинг (блочное планирование) — техника, при которой день делится
          на временные блоки. Каждая задача попадает в календарь как встреча: с
          конкретным началом и концом. Причина проста: у задачи без назначенного
          времени нет защиты — её сдвигают весь день, и часто она так и остаётся
          несделанной.
        </p>
        <p className="mt-3 text-muted">
          Технику широко популяризировал Кэл Ньюпорт, автор книги «Deep Work»: по
          его мысли, дело, не записанное в календарь, часами висит в голове
          «открытой вкладкой» и снижает концентрацию (источник:{" "}
          <a
            href="https://calnewport.com/deep-work-rules-for-focused-success-in-a-distracted-world/"
            rel="noopener nofollow"
            target="_blank"
            className={A}
          >
            calnewport.com / Deep Work
          </a>
          ).
        </p>
      </Section>

      <Section title="Для каких задач подходит">
        <ul className="space-y-2 text-muted">
          <li>
            <strong className="text-foreground">Глубокая работа</strong> —
            программирование, письмо, дизайн, учёба. Идеальны блоки 90-120 минут.
          </li>
          <li>
            <strong className="text-foreground">Встречи</strong> — с чётким
            началом и концом.
          </li>
          <li>
            <strong className="text-foreground">Почта и сообщения</strong> — один
            или два раза в день по 30 минут. Остальное время уведомления
            выключены.
          </li>
          <li>
            <strong className="text-foreground">Спорт, еда, отдых</strong> —
            кажется лишним, но без этих блоков день заполняется чем угодно
            другим.
          </li>
        </ul>
      </Section>

      <Section title="Тайм-блокинг, Помодоро и список дел">
        <TableWrap>
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-3 font-medium">Техника</th>
              <th className="py-2 pr-3 font-medium">Длина блока</th>
              <th className="py-2 font-medium">Для чего лучше</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">
                Тайм-блокинг
              </td>
              <td className="py-2.5 pr-3">60-120 мин</td>
              <td className="py-2.5">Глубокая работа, встречи</td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">
                <Link
                  href="/blog/ru/tehnika-pomodoro"
                  className="underline-offset-4 hover:underline"
                >
                  Помодоро
                </Link>
              </td>
              <td className="py-2.5 pr-3">25 мин</td>
              <td className="py-2.5">Задачи, которые трудно начать</td>
            </tr>
            <tr>
              <td className="py-2.5 pr-3 font-medium text-foreground">
                Список дел
              </td>
              <td className="py-2.5 pr-3">–</td>
              <td className="py-2.5">Мелкие быстрые дела</td>
            </tr>
          </tbody>
        </TableWrap>
        <p className="mt-3 text-muted">
          Смешивать их — обычная практика:{" "}
          <Link href="/blog/ru/planirovanie-dnya" className={A}>
            план дня
          </Link>{" "}
          задаёт общую структуру, крупные дела переносятся в календарь блоками, а
          внутри блока идут помодоро-сессии.
        </p>
      </Section>

      <Section title="Как это работает в календаре Unumly">
        <p className="text-muted">
          Откройте раздел{" "}
          <Link href="/kalendar" className={A}>
            Kalendar
          </Link>{" "}
          в недельном или дневном виде. Нажатием на часовой слот добавляется
          новая задача, а существующую можно перетащить на нужное время. Длина
          слота задаёт продолжительность задачи; бот пришлёт напоминание заранее.
        </p>
        <p className="mt-3 text-muted">
          С чего начать: разложите три завтрашние крупные задачи по
          90-минутным блокам. Остальное время оставьте под мелкие дела, отдых и
          встречи.
        </p>
      </Section>

      <Section title="Главные ошибки">
        <ol className="space-y-3 text-muted">
          <li>
            <strong className="text-foreground">Занять 100% дня.</strong> План,
            где расписана каждая минута, ломается от первой же случайности.
            Занимайте 60-70%, оставляйте 30% свободными.
          </li>
          <li>
            <strong className="text-foreground">Отказаться от буфера.</strong>{" "}
            Между блоками оставляйте 10-15 минут — на переход, паузу и мелкие
            хвосты.
          </li>
          <li>
            <strong className="text-foreground">Оптимистичные оценки.</strong>{" "}
            Закладывайте минимум на 25% больше времени, чем кажется нужным. Первая
            неделя тайм-блокинга обычно и учит именно этому.
          </li>
        </ol>
        <p className="mt-3 text-muted">
          Если блоки срываются регулярно, полезно применить{" "}
          <Link href="/blog/ru/obratnoe-myshlenie" className={A}>
            обратное мышление
          </Link>
          : выписать причины срыва и закрыть каждую отдельным действием.
        </p>
      </Section>
    </BlogArticle>
  );
}
