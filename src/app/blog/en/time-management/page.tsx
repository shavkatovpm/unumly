import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_PATHS, blogAlternates, getBlogPostEn } from "@/lib/blog-posts";
import {
  BlogArticle,
  Section,
  Steps,
  TableWrap,
  howToSchema,
  type QA,
  type Step,
} from "@/components/blog/article";

const paths = BLOG_PATHS["vaqtni-boshqarish"];
const post = getBlogPostEn("time-management")!;
const UPDATED = "2026-07-31";

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  keywords: [
    "time management",
    "time management for beginners",
    "how to manage time",
    "productivity methods",
    "eisenhower matrix",
    "prioritisation",
  ],
  alternates: blogAlternates(paths, "en"),
  openGraph: {
    type: "article",
    locale: "en_US",
    title: post.title,
    description: post.description,
    url: `https://unumly.uz${paths.en}`,
    publishedTime: post.publishedAt,
    modifiedTime: UPDATED,
  },
};

const STEPS: Step[] = [
  {
    name: "Dump every task into one place",
    text: "This starts with unloading, not planning. Write every task and every \"I'll do it later\" into a single list. Holding work in your head is expensive; a written task frees up attention.",
  },
  {
    name: "Ask each item \"what is the outcome?\"",
    text: "\"Work on the project\" is a topic, not a task. \"Write the first three slides of the deck\" is a task. Break work down into concrete, finishable steps you can tick off.",
  },
  {
    name: "Separate important from urgent",
    text: "Not all work is equal. Important moves you toward a goal; urgent simply demands attention right now. Most people spend the day chasing urgent things while the important ones never get touched.",
  },
  {
    name: "Pick three main tasks per day",
    text: "A long list drains motivation. Each morning mark the three tasks that define the day. Anything else you finish is a bonus. That limit counterintuitively increases how much gets done.",
  },
  {
    name: "Give tasks a slot in the calendar",
    text: "\"Sometime today\" usually means never. Give each task a specific window — 10:00-11:00 for the report, say. This is called time blocking and it keeps attention on one thing at a time.",
  },
  {
    name: "Work on one thing, put the phone away",
    text: "Multitasking does not raise output: every switch costs time to rebuild focus. Turn off notifications and leave the phone in another room.",
  },
  {
    name: "Spend five minutes reviewing at the end of the day",
    text: "What got done, what didn't, and why? A short review makes tomorrow's plan easier and shows where your hours actually go. Time management is a repeated habit, not a one-off effort.",
  },
];

const FAQ: QA[] = [
  {
    q: "What is time management?",
    a: "Time management is the skill of consciously deciding, planning and controlling where your hours go. The goal is not to work more but to get important work done on time and to reduce the number of emergencies.",
  },
  {
    q: "How do I start with time management?",
    a: "The simplest first step is writing every task into one list. Then pick three that matter most today and give them a time. Elaborate systems come later; at the start what matters is getting the work out of your head and making it visible.",
  },
  {
    q: "Which time management method is best?",
    a: "There is no single best method. If starting is hard, use Pomodoro. If the day is chaotic, use time blocking. If there is simply too much, use the Eisenhower matrix. Most people mix them: block the day, then run Pomodoro sessions inside a block.",
  },
  {
    q: "Does time management mean working more?",
    a: "No — usually the opposite. Good time management removes unnecessary work and leaves room for rest. The aim is meaningful results, not looking busy.",
  },
  {
    q: "Why doesn't my to-do list work?",
    a: "Usually two reasons: the list is too long and the items are vague (\"project\"). Fix it by breaking tasks into concrete, finishable steps and giving each one a time. A list without time is a wish list.",
  },
  {
    q: "Is time management different for students?",
    a: "The fundamentals are identical, but students plan better around exam dates and class schedules. Splitting big subjects into short study blocks and starting with Pomodoro helps most.",
  },
];

const A = "text-foreground underline-offset-4 hover:underline";

export default function Page() {
  return (
    <BlogArticle
      lang="en"
      post={post}
      paths={paths}
      updated={UPDATED}
      h1="Time management: where to start and what actually works"
      answer={
        <>
          <strong className="text-foreground">Short answer:</strong> time
          management is the skill of consciously deciding where your hours go. To
          start, write every task into one list, choose the three that matter most
          today, and give each of them a slot in the calendar. The goal is not to
          work more — it is to get the important work done on time.
        </>
      }
      faq={FAQ}
      schema={[
        howToSchema(
          "en",
          "How to start managing your time",
          "A seven-step routine for building a personal time management system from scratch.",
          STEPS,
        ),
      ]}
      cta={{
        eyebrow: "Start",
        title: "Take control of your time today",
        text: "The first step is small: write down the three tasks that define today. Do it in the bot or on the web — whichever is closer.",
        botLabel: "Open in Telegram bot",
        siteLabel: "Open on the web",
        siteHref: "/bugun",
      }}
    >
      <Section title="What is time management?">
        <p className="text-muted">
          Time management is the skill of planning, ordering and controlling what
          your hours are spent on. Put plainly: the day is finite and the work is
          not, so you decide what gets time, when, and how much.
        </p>
        <p className="mt-3 text-muted">
          One clarification: time management does not create time. Everyone has
          twenty-four hours. The difference is whether you allocate them
          deliberately or the day carries you along. In the first case important
          work gets done; in the second you end the evening asking what you
          actually did.
        </p>
      </Section>

      <Section title="Why it matters">
        <p className="text-muted">
          For years I ran everything from memory. The result: tasks surfacing at
          night, forgotten promises, a permanent low-level unease. When I started
          writing work down, the biggest change was not output — it was calm. My
          head emptied out.
        </p>
        <p className="mt-3 text-muted">
          Good time management gives you three things:{" "}
          <strong className="text-foreground">clarity</strong> (you know what to
          do), <strong className="text-foreground">calm</strong> (confidence that
          nothing is forgotten) and{" "}
          <strong className="text-foreground">freedom</strong> (rest fits,
          because the work is under control).
        </p>
      </Section>

      <Section title="Seven steps to get started">
        <Steps steps={STEPS} />
      </Section>

      <Section title="The best-known methods">
        <p className="text-muted">
          A method is just a concrete shape for the steps above. Pick one, run it
          for a couple of weeks, then mix what suits you.
        </p>
        <ul className="mt-3 space-y-3 text-muted">
          <li>
            <strong className="text-foreground">Time blocking</strong> — the day
            is split into hour blocks, each dedicated to one thing. Best for
            chaotic schedules. More:{" "}
            <Link href="/blog/en/time-blocking" className={A}>
              time blocking
            </Link>
            .
          </li>
          <li>
            <strong className="text-foreground">Pomodoro</strong> — work is split
            into 25-minute focus sessions. Works well when starting is the hard
            part. More:{" "}
            <Link href="/blog/en/pomodoro-technique" className={A}>
              the Pomodoro Technique
            </Link>
            .
          </li>
          <li>
            <strong className="text-foreground">Eisenhower matrix</strong> — work
            is sorted into four important/urgent quadrants, which makes it obvious
            what to do and what to drop (see{" "}
            <a
              href="https://en.wikipedia.org/wiki/Time_management#The_Eisenhower_Method"
              rel="noopener nofollow"
              target="_blank"
              className={A}
            >
              Wikipedia
            </a>
            ).
          </li>
          <li>
            <strong className="text-foreground">A daily plan</strong> — the
            simplest and most fundamental one: start the day with three to five
            tasks. More:{" "}
            <Link href="/blog/en/daily-planning" className={A}>
              daily planning
            </Link>
            .
          </li>
        </ul>
        <p className="mt-3 text-muted">
          One principle sits under all of them: the{" "}
          <a
            href="https://en.wikipedia.org/wiki/Pareto_principle"
            rel="noopener nofollow"
            target="_blank"
            className={A}
          >
            Pareto principle
          </a>{" "}
          — most of the result comes from a minority of the work. Time management
          is largely about finding that minority and protecting it.
        </p>
      </Section>

      <Section title="Mistakes beginners make">
        <ul className="space-y-3 text-muted">
          <li>
            <strong className="text-foreground">Overloading the day</strong> —
            planning ten hours of work into an eight-hour day guarantees a
            backlog. Plan less, finish it, then add.
          </li>
          <li>
            <strong className="text-foreground">Leaving rest out</strong> — a day
            without breaks is not more productive. Schedule rest like a task, or
            it arrives anyway, disguised as distraction.
          </li>
          <li>
            <strong className="text-foreground">Hunting for a perfect system</strong>{" "}
            — weeks disappear into choosing the right app. Start with a plain
            list; the system forms as you use it.
          </li>
          <li>
            <strong className="text-foreground">Underestimating tasks</strong> —
            work expands to fill the time allotted to it. That is{" "}
            <a
              href="https://en.wikipedia.org/wiki/Parkinson%27s_law"
              rel="noopener nofollow"
              target="_blank"
              className={A}
            >
              Parkinson&apos;s law
            </a>
            : give each task a specific, slightly tight window.
          </li>
        </ul>
      </Section>

      <Section title="Which method should you pick?">
        <TableWrap>
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-3 font-medium">Situation</th>
              <th className="py-2 pr-3 font-medium">Method</th>
              <th className="py-2 font-medium">Why</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">
                Hard to start
              </td>
              <td className="py-2.5 pr-3">Pomodoro</td>
              <td className="py-2.5">&quot;Only 25 minutes&quot; lowers the barrier</td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">
                Chaotic days
              </td>
              <td className="py-2.5 pr-3">Time blocking</td>
              <td className="py-2.5">Every task gets a defined window</td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">
                Too much work
              </td>
              <td className="py-2.5 pr-3">Eisenhower</td>
              <td className="py-2.5">Separates important from urgent</td>
            </tr>
            <tr>
              <td className="py-2.5 pr-3 font-medium text-foreground">
                Just starting out
              </td>
              <td className="py-2.5 pr-3">Daily plan</td>
              <td className="py-2.5">Simplest: three tasks a day is enough</td>
            </tr>
          </tbody>
        </TableWrap>
      </Section>

      <Section title="Time management in Unumly">
        <p className="text-muted">
          You can run all of this on paper, but keeping the list and the reminders
          in one place is easier. In{" "}
          <Link href="/bugun" className={A}>
            Bugun
          </Link>{" "}
          (today) the day starts with three main tasks, and in{" "}
          <Link href="/kalendar" className={A}>
            Kalendar
          </Link>{" "}
          you give them blocks. When a task is due, the Telegram bot sends a
          reminder — the phone is in your hand anyway.
        </p>
        <p className="mt-3 text-muted">
          Unumly also links daily tasks to weekly, monthly and yearly plans, so
          you can see which larger goal today&apos;s work belongs to. More about
          the product:{" "}
          <Link href="/haqida" className={A}>
            about Unumly
          </Link>
          . Worth reading next:{" "}
          <Link href="/blog/en/inversion-thinking" className={A}>
            inversion thinking
          </Link>
          , a habit that keeps plans from dying halfway.
        </p>
      </Section>
    </BlogArticle>
  );
}
