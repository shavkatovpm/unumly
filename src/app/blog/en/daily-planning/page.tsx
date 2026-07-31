import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_PATHS, blogAlternates, getBlogPostEn } from "@/lib/blog-posts";
import {
  BlogArticle,
  Section,
  Steps,
  howToSchema,
  type QA,
  type Step,
} from "@/components/blog/article";

const paths = BLOG_PATHS["kunlik-rejalashtirish"];
const post = getBlogPostEn("daily-planning")!;
const UPDATED = "2026-07-31";

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  keywords: [
    "daily planning",
    "how to plan your day",
    "daily plan",
    "to-do list",
    "productive day",
    "evening review",
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
    name: "Decide the outcome of the day",
    text: "Write down the three biggest results you want tomorrow. Those are what the day will be measured by; every other task is arranged around them.",
  },
  {
    name: "Get the tasks out of your head",
    text: "Open your list and add everything on your mind, including the small things. Order does not matter yet — what matters is that nothing stays in memory.",
  },
  {
    name: "Set priorities",
    text: "Give each task an importance level. Keep no more than two or three high-priority tasks in a single day, otherwise none of them will get finished.",
  },
  {
    name: "Assign time",
    text: "Give the main tasks a rough duration, or drag them into the calendar. People typically underestimate task length by 30-50 percent, so leave a margin.",
  },
  {
    name: "Review in the evening",
    text: "At the end of the day mark what is done and move the rest to tomorrow. This habit steadily makes your future plans more accurate.",
  },
];

const FAQ: QA[] = [
  {
    q: "How long should planning a day take?",
    a: "Ten to twenty minutes is enough. Spend 10-15 minutes in the evening drafting tomorrow, then 5 minutes in the morning reviewing it. Any longer and the plan starts running you instead of the other way round.",
  },
  {
    q: "Should I plan in the morning or the evening?",
    a: "Evening is usually better. Your brain keeps processing the tasks overnight and you can start immediately in the morning. Morning planning also works, but adds the \"where do I begin\" problem to the start of the day.",
  },
  {
    q: "How many tasks should a day have?",
    a: "Usually five to seven. More than that and part of the list gets carried over, leaving the feeling of falling behind. Two or three of them should be high priority, the rest secondary.",
  },
  {
    q: "What if the plan doesn't get done?",
    a: "Carrying tasks over is normal, not a failure. Move the task to tomorrow and add one line about the cause: not enough time, not enough energy, or the task was too vague. That line is where the improvement comes from.",
  },
  {
    q: "Paper planner or an app?",
    a: "Both have a place. Paper slows you down, which helps thinking. An app reminds, syncs and rolls tasks over automatically. For beginners an app is lighter, because it does the remembering for you.",
  },
  {
    q: "How do I plan a day full of meetings?",
    a: "Put the meetings in first as fixed points, then place one or two blocks for important work in the gaps. Collect the small stuff into a single half-hour block rather than scattering it.",
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
      h1="Daily planning: five steps to a productive day"
      answer={
        <>
          <strong className="text-foreground">Short answer:</strong> daily
          planning means assigning the next 24 hours to specific tasks. A working
          plan takes 10-20 minutes (evening or morning) and has five steps: decide
          the outcome, dump the tasks, set priorities, assign time, review in the
          evening. Keep the day to five to seven tasks.
        </>
      }
      faq={FAQ}
      schema={[
        howToSchema(
          "en",
          "How to plan your day",
          "Five steps, from choosing the outcome of the day to the evening review.",
          STEPS,
          "PT15M",
        ),
      ]}
      cta={{
        eyebrow: "Start",
        title: "Build your first plan now",
        text: "Write down today's three big tasks and set their priority. It takes a couple of minutes, in the bot or on the web.",
        botLabel: "Open in Telegram bot",
        siteLabel: "Open on the web",
        siteHref: "/bugun",
      }}
    >
      <p>
        Plenty of people open the day with &quot;what should I work on?&quot; and
        close it with &quot;why did I get so little done?&quot;. A decent daily
        plan answers both questions at once.
      </p>

      <Section title="What is daily planning?">
        <p className="text-muted">
          Daily planning is a structure of tasks and time decided in advance. The
          purpose is simple: point attention at what matters, stop the hours from
          leaking into small things, and end the day with a measurable result. To
          tie tasks to specific hours, use{" "}
          <Link href="/blog/en/time-blocking" className={A}>
            time blocking
          </Link>
          ; to hold focus inside one task, use the{" "}
          <Link href="/blog/en/pomodoro-technique" className={A}>
            Pomodoro Technique
          </Link>
          .
        </p>
      </Section>

      <Section title="Five steps to a productive day">
        <Steps steps={STEPS} />
      </Section>

      <Section title="The most common mistake">
        <p className="text-muted">
          Writing 15-20 tasks into one day. The realistic number is around five to
          seven. The rest gets pushed to tomorrow every evening and slowly builds
          a sense of never keeping up. Capping the number of tasks is the central
          rule of a daily plan, not an optional tip.
        </p>
      </Section>

      <Section title="When should you plan?">
        <p className="text-muted">
          The best moment is the evening before (10-15 minutes) or early morning
          (15-20 minutes). Plan in the evening and your brain works on the tasks
          overnight, so the morning starts with execution rather than deciding.
        </p>
      </Section>

      <Section title="How this looks in Unumly">
        <p className="text-muted">
          In{" "}
          <Link href="/bugun" className={A}>
            Bugun
          </Link>{" "}
          (today), adding a task asks for its priority and time right away. When
          the time comes, the Telegram bot sends a reminder and you can close the
          task with the &quot;Bajardim&quot; (done) button inside the chat. Step
          five — the evening review — then happens gradually across the day.
        </p>
        <p className="mt-3 text-muted">
          If your days keep falling apart, two more pieces help:{" "}
          <Link href="/blog/en/time-management" className={A}>
            time management
          </Link>{" "}
          for the wider system, and{" "}
          <Link href="/blog/en/inversion-thinking" className={A}>
            inversion thinking
          </Link>{" "}
          for finding, in advance, the reasons a plan breaks.
        </p>
      </Section>
    </BlogArticle>
  );
}
