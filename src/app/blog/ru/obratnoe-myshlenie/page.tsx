import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { getBlogPostRu } from "@/lib/blog-posts";
import { BlogLangSwitch } from "@/components/blog/lang-switch";

const SLUG = "obratnoe-myshlenie";
const post = getBlogPostRu(SLUG)!;
const PATH = `/blog/ru/${SLUG}`;
const URL = `https://unumly.uz${PATH}`;
const UZ_PATH = "/blog/teskari-fikrlash";
const UPDATED = "2026-07-31";
const BOT_URL = "https://t.me/unumlybot";

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  keywords: [
    "обратное мышление",
    "инверсия",
    "метод инверсии",
    "инверсное мышление",
    "премортем",
    "постановка целей",
    "планирование",
  ],
  alternates: {
    canonical: PATH,
    languages: {
      "ru-RU": PATH,
      "uz-UZ": UZ_PATH,
    },
  },
  openGraph: {
    type: "article",
    locale: "ru_RU",
    title: post.title,
    description: post.description,
    url: URL,
    publishedTime: post.publishedAt,
    modifiedTime: UPDATED,
  },
};

const STEPS = [
  {
    name: "Сформулируйте цель одним предложением",
    text: "С размытой целью метод не работает. Не «быть здоровым», а «до осени тренироваться три раза в неделю». Чтобы понять, что может всё сломать, сначала нужно точно знать, что вы строите.",
  },
  {
    name: "Составьте список «что это разрушит»",
    text: "Возьмите 5-10 минут и пишите без фильтра. И внешние причины (график работы, семья, деньги), и внутренние (лень, забывчивость, слишком много обещаний). На этом шаге ничего не вычёркивайте.",
  },
  {
    name: "Отсортируйте список по вероятности и ущербу",
    text: "К каждому пункту два вопроса: насколько это вероятно и насколько сильно ударит, если случится. Пункты с высокой вероятностью и высоким ущербом — ваш настоящий противник. Обычно их не больше трёх-пяти.",
  },
  {
    name: "Напишите одно конкретное действие против каждой причины",
    text: "«Забуду» — ставлю напоминание. «Вечером нет сил» — переношу тренировку на утро. «Партнёр бросит» — готовлю вариант, который выполняется в одиночку. Устранение списка — это первая часть плана, а не дополнение к нему.",
  },
  {
    name: "Перечитывайте список раз в неделю",
    text: "Новые препятствия появляются по ходу, старые закрываются. На еженедельном обзоре пройдитесь по списку: какие пункты всё ещё живы? Эта пятиминутная привычка не даёт цели заглохнуть на середине.",
  },
];

const FAQ = [
  {
    q: "Что такое обратное мышление?",
    a: "Обратное мышление (инверсия) — метод, при котором задачу решают с конца: со стороны провала. Вместо «как мне этого добиться?» вы спрашиваете «что помешает мне этого добиться?», составляете список причин и начинаете план с их устранения.",
  },
  {
    q: "Чем инверсия отличается от пессимизма?",
    a: "Пессимист перечисляет проблемы и на этом останавливается. Человек, мыслящий обратно, пишет тот же список, но к каждому пункту добавляет ответное действие. Разница не в настроении, а в том, что вы делаете со списком.",
  },
  {
    q: "Кто придумал метод инверсии?",
    a: "Принцип «всегда переворачивай» (man muss immer umkehren) приписывают немецкому математику Карлу Якоби. В бизнесе и принятии решений его популяризировал Чарли Мангер: он советовал начинать разбор любой задачи с вопроса «где я могу ошибиться?».",
  },
  {
    q: "Что такое премортем?",
    a: "Премортем — упражнение, в котором команда перед стартом проекта представляет, что проект полностью провалился, и объясняет почему. Его предложил психолог Гэри Кляйн. Это командная форма обратного мышления: ошибки проговариваются до того, как случатся.",
  },
  {
    q: "Когда обратное мышление не подходит?",
    a: "На стадии поиска идеи и в начале творческой работы — там список ограничений приходит слишком рано и глушит мысль. Также если список разросся до 15-20 пунктов, он превращается не в план, а в тревогу. Оставьте три-пять самых весомых.",
  },
  {
    q: "Что делать с причинами, которые от меня не зависят?",
    a: "Отметьте их отдельно. Для них пишут не ответное действие, а запасной вариант: «пропал интернет — офлайн-режим работы», «клиент затянул — второй источник задач». Это тоже способ закрыть пункт списка.",
  },
  {
    q: "Как встроить инверсию в ежедневный план?",
    a: "Когда ставите новую цель, первой задачей сделайте список «что это разрушит». Затем каждое ответное действие превратите в отдельную задачу и назначьте ей время. В Unumly это хранится как обычные задачи внутри цели.",
  },
];

export default function Page() {
  return (
    <>
      <main
        lang="ru"
        className="mx-auto min-h-screen max-w-2xl px-6 py-12 sm:px-8 sm:py-16"
      >
        <nav
          className="mb-10 flex items-center justify-between gap-4"
          aria-label="Хлебные крошки"
        >
          <Link
            href="/blog/ru"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint hover:text-foreground"
          >
            ← Блог
          </Link>
          <BlogLangSwitch active="ru" uzHref={UZ_PATH} ruHref={PATH} />
        </nav>

        <header className="mb-10">
          <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString("ru-RU", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span aria-hidden>·</span>
            <span>{post.readingMinutes} мин чтения</span>
          </div>
          <h1 className="mt-3 text-balance text-[clamp(1.75rem,4.5vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.02em]">
            Обратное мышление: что такое инверсия и как ей пользоваться
          </h1>
          <p className="mt-5 text-[15.5px] leading-relaxed text-muted">
            {post.description}
          </p>
        </header>

        <article className="space-y-7 text-[15px] leading-[1.7] text-foreground/85">
          <aside className="rounded-md border-l-2 border-foreground/30 bg-subtle/40 py-3 pl-4 pr-3">
            <p className="text-[14.5px] leading-relaxed">
              <strong className="text-foreground">Коротко:</strong> обратное
              мышление — это способ искать не путь к цели, а причины, по которым
              вы её не достигнете. Вместо «как добиться успеха?» вы спрашиваете
              «что меня свалит?». Второй вопрос даёт короткий и конкретный
              список, а первая часть плана — устранение этого списка.
            </p>
          </aside>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Что такое обратное мышление?
            </h2>
            <p className="text-muted">
              Обратное мышление (по-английски{" "}
              <em className="not-italic text-foreground">inversion</em>) — способ
              решать задачу с конца. Обычно мы смотрим на цель и ищем дорогу к
              ней. При инверсии сначала представляют провал и перечисляют
              причины, которые к нему привели.
            </p>
            <p className="mt-3 text-muted">
              Логика простая: рецепт успеха найти трудно, а причины неудачи
              перечислить легче и точнее. Правильных дорог не одна, их десятки. А
              вот того, что сбивает с пути, обычно наберётся на пальцах одной
              руки.
            </p>
            <p className="mt-3 text-muted">
              Идея не новая. Математик{" "}
              <a
                href="https://ru.wikipedia.org/wiki/%D0%AF%D0%BA%D0%BE%D0%B1%D0%B8,_%D0%9A%D0%B0%D1%80%D0%BB_%D0%93%D1%83%D1%81%D1%82%D0%B0%D0%B2_%D0%AF%D0%BA%D0%BE%D0%B1"
                rel="noopener nofollow"
                target="_blank"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Карл Якоби
              </a>{" "}
              советовал решать трудные задачи по принципу «всегда переворачивай».
              А{" "}
              <a
                href="https://ru.wikipedia.org/wiki/%D0%9C%D0%B0%D0%BD%D0%B3%D0%B5%D1%80,_%D0%A7%D0%B0%D1%80%D0%BB%D1%8C%D0%B7"
                rel="noopener nofollow"
                target="_blank"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Чарли Мангер
              </a>{" "}
              перенёс этот принцип в инвестиции и управление: «Мне достаточно
              знать, где я умру, — я просто никогда туда не пойду».
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Почему «негативный» вопрос даёт более точный ответ
            </h2>
            <p className="text-muted">
              Позитивный вопрос порождает много расплывчатых ответов. Обратный
              вопрос даёт короткий и конкретный список. А устранить список — уже
              практическая работа, её можно начать сегодня.
            </p>
            <p className="mt-3 text-muted">
              «Как мне накопить денег?» — этот вопрос ведёт к сотням советов:
              инвестиции, дополнительный доход, приложения для бюджета, книги по
              финансам. Всё верно, но с чего начать — непонятно.
            </p>
            <p className="mt-3 text-muted">
              А вопрос «что оставит меня без денег?» даёт всего пять ответов:
            </p>
            <ol className="mt-3 space-y-2 text-muted">
              <li>1. Незапланированные покупки</li>
              <li>2. Долги</li>
              <li>3. Отсутствие финансовой подушки</li>
              <li>4. Зависимость от одного источника дохода</li>
              <li>5. Непосчитанные расходы</li>
            </ol>
            <p className="mt-3 text-muted">
              Закрыть эти пять — уже большой результат. Обратите внимание:
              каждый пункт списка напрямую превращается в задачу. А «начать
              инвестировать» — это не задача, а тема. В этом и сила обратного
              вопроса: он переводит вас из темы в действие.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Чем инверсия отличается от пессимизма
            </h2>
            <p className="text-muted">
              Обратное мышление часто путают с пессимизмом. Со стороны похоже:
              оба перечисляют плохое. Разница в другом —{" "}
              <strong className="text-foreground">
                пессимист перечисляет проблемы и останавливается, а мыслящий
                обратно перечисляет и затем закрывает каждую.
              </strong>
            </p>
            <p className="mt-3 text-muted">
              То есть список — это не итог, а начало. Если рядом с пунктами не
              появилось ни одного ответного действия, вы не используете инверсию
              — вы просто тревожитесь. Проверка простая: после чтения списка у
              вас появилось конкретное дело на завтра?
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Как применять обратное мышление: 5 шагов
            </h2>
            <ol className="space-y-5">
              {STEPS.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-[16px] font-medium text-foreground">
                      {s.name}
                    </h3>
                    <p className="mt-1 text-[14.5px] leading-relaxed text-muted">
                      {s.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Примеры: обычный вопрос против обратного
            </h2>
            <p className="mb-3 text-muted">
              В таблице одна и та же цель показана через два вопроса. Ответ в
              правом столбце всегда конкретнее и выполняется быстрее.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[14.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-2 pr-3 font-medium">Цель</th>
                    <th className="py-2 pr-3 font-medium">Обычный вопрос</th>
                    <th className="py-2 font-medium">Обратный вопрос и первый шаг</th>
                  </tr>
                </thead>
                <tbody className="text-muted">
                  <tr className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      Накопления
                    </td>
                    <td className="py-2.5 pr-3">Как накопить деньги?</td>
                    <td className="py-2.5">
                      Что оставит меня без денег? → откладывать подушку в день
                      зарплаты, до расходов
                    </td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      Спорт
                    </td>
                    <td className="py-2.5 pr-3">
                      Как тренироваться регулярно?
                    </td>
                    <td className="py-2.5">
                      Что остановит тренировки? → вечерняя усталость → перенести
                      на утро
                    </td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      Экзамен
                    </td>
                    <td className="py-2.5 pr-3">Как хорошо подготовиться?</td>
                    <td className="py-2.5">
                      Что меня завалит? → откладывание на последний день →
                      разнести темы по датам
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      Проект
                    </td>
                    <td className="py-2.5 pr-3">Как сделать проект успешным?</td>
                    <td className="py-2.5">
                      Почему проект провалится? → размытые требования → письменная
                      договорённость в первую неделю
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-muted">
              У подхода из последней строки есть командное имя —{" "}
              <strong className="text-foreground">премортем</strong>. До старта
              проекта команда собирается и отвечает на вопрос: «представьте, что
              всё провалилось; почему?» (описание метода:{" "}
              <a
                href="https://hbr.org/2007/09/performing-a-project-premortem"
                rel="noopener nofollow"
                target="_blank"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Harvard Business Review
              </a>
              ). Если ошибки проговорены заранее, большая их часть просто не
              случается.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Где метод не работает
            </h2>
            <p className="text-muted">
              Я сам несколько раз применял его неправильно: писал список, смотрел
              на него — и вообще не начинал дело. Поэтому три ограничения стоит
              держать в голове:
            </p>
            <ul className="mt-3 space-y-3 text-muted">
              <li>
                <strong className="text-foreground">Стадия идеи</strong> — когда
                вы только придумываете новое, список ограничений приходит рано и
                душит мысль. Сначала запишите идею, обратный вопрос задайте
                после.
              </li>
              <li>
                <strong className="text-foreground">Длинный список</strong> — 20
                причин это не план, а тревога. Оставьте три-пять самых вероятных
                и болезненных.
              </li>
              <li>
                <strong className="text-foreground">Список без действий</strong>{" "}
                — причина, к которой не написано ответное действие, просто лежит
                в списке и портит настроение. Правило «один пункт — одна задача»
                нарушать нельзя.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Как вести обратный план в Unumly
            </h2>
            <p className="text-muted">
              Всё это можно делать и в блокноте. Проблема одна: список «что это
              разрушит» пишется в блокноте один раз и больше не открывается. А
              работа — именно в повторном открытии.
            </p>
            <p className="mt-3 text-muted">
              В{" "}
              <Link
                href="/haqida"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Unumly
              </Link>{" "}
              я веду это так: цель записываю в раздел{" "}
              <Link
                href="/maqsad"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Maqsad
              </Link>{" "}
              (цели), а шагами под ней ставлю не общие намерения, а ответные
              действия — «отложить подушку в день зарплаты», «перенести
              тренировку на 07:00». Они попадают в список{" "}
              <Link
                href="/bugun"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Bugun
              </Link>{" "}
              (сегодня) как обычные задачи, а когда подходит время, Telegram-бот
              присылает напоминание. Список не остаётся на бумаге — он
              превращается в день.
            </p>
            <p className="mt-3 text-muted">
              Для крупной работы удобно завести отдельный документ в разделе{" "}
              <Link
                href="/loyiha"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Loyiha
              </Link>{" "}
              (проекты) и вести премортем-список там. Интерфейс Unumly пока на
              узбекском, но разделы простые: Bugun — сегодня, Maqsad — цели,
              Kalendar — календарь.
            </p>
            <p className="mt-3 text-muted">
              Обратное мышление не противоречит обычному планированию — они
              работают вместе. Когда список готов, для ответных действий хватит
              тайм-блокинга или простого дневного плана. Разборы этих методов
              есть в{" "}
              <Link
                href="/blog/ru"
                className="text-foreground underline-offset-4 hover:underline"
              >
                нашем блоге
              </Link>{" "}
              и в узбекских статьях —{" "}
              <Link
                href="/blog/time-blocking"
                className="text-foreground underline-offset-4 hover:underline"
              >
                time blocking
              </Link>{" "}
              и{" "}
              <Link
                href="/blog/kunlik-rejalashtirish"
                className="text-foreground underline-offset-4 hover:underline"
              >
                дневное планирование
              </Link>
              .
            </p>
          </section>

          <section className="border-t border-border pt-7">
            <h2 className="mb-5 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Частые вопросы
            </h2>
            <dl className="space-y-5">
              {FAQ.map((f) => (
                <div key={f.q}>
                  <dt className="text-[15.5px] font-medium text-foreground">
                    {f.q}
                  </dt>
                  <dd className="mt-1.5 text-[14.5px] leading-relaxed text-muted">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </article>

        <section className="mt-14 rounded-lg border border-border bg-subtle/40 px-6 py-8">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint">
            Начать
          </p>
          <h2 className="mt-2 text-[18px] font-medium tracking-[-0.01em]">
            Напишите список «что это разрушит» сегодня
          </h2>
          <p className="mt-2 text-[14px] text-muted">
            Возьмите одну цель, выпишите три причины, которые её сломают, и
            добавьте по одной задаче против каждой. Начните в боте или на сайте —
            как удобнее.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <a
              href={BOT_URL}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
            >
              <Send className="size-4" />
              Открыть в Telegram-боте
            </a>
            <Link
              href="/bugun"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-5 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-subtle"
            >
              Открыть на сайте
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Главная",
                  item: "https://unumly.uz/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Блог",
                  item: "https://unumly.uz/blog/ru",
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: post.title,
                  item: URL,
                },
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: post.title,
              description: post.description,
              url: URL,
              datePublished: post.publishedAt,
              dateModified: UPDATED,
              inLanguage: "ru",
              author: { "@type": "Organization", name: "Unumly" },
              publisher: {
                "@type": "Organization",
                name: "Unumly",
                logo: {
                  "@type": "ImageObject",
                  url: "https://unumly.uz/logo.png",
                },
              },
              mainEntityOfPage: { "@type": "WebPage", "@id": URL },
              about: {
                "@type": "Thing",
                name: "Обратное мышление (инверсия)",
              },
              translationOfWork: {
                "@type": "BlogPosting",
                url: `https://unumly.uz${UZ_PATH}`,
                inLanguage: "uz",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "HowTo",
              name: "Как применять обратное мышление",
              description:
                "Пять шагов: найти причины провала и закрыть каждую конкретным действием.",
              inLanguage: "ru",
              step: STEPS.map((s, i) => ({
                "@type": "HowToStep",
                position: i + 1,
                name: s.name,
                text: s.text,
              })),
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              inLanguage: "ru",
              mainEntity: FAQ.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: f.a,
                },
              })),
            },
          ]),
        }}
      />
    </>
  );
}
