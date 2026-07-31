import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_PATHS, blogAlternates, getBlogPostEn } from "@/lib/blog-posts";
import {
  BlogArticle,
  Section,
  TableWrap,
  type QA,
} from "@/components/blog/article";

const paths = BLOG_PATHS["time-blocking"];
const post = getBlogPostEn("time-blocking")!;
const UPDATED = "2026-07-31";

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  keywords: [
    "time blocking",
    "calendar blocking",
    "deep work",
    "how to plan a day in blocks",
    "focus blocks",
    "time blocking vs pomodoro",
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

const FAQ: QA[] = [
  {
    q: "Is time blocking the same as using Google Calendar?",
    a: "No. Google Calendar is one tool; time blocking is the method. A calendar usually holds meetings. With time blocking every piece of work — writing a report, coding, reading — goes in too, as if it were a meeting.",
  },
  {
    q: "How long should a block be?",
    a: "90-120 minutes for deep work, 30-60 for meetings, 15-30 for small tasks. The common mistake is scheduling deep work in half-hour blocks: attention is only starting to settle by the time the block ends.",
  },
  {
    q: "Who is time blocking wrong for?",
    a: "People whose day is made of unpredictable incoming work — support agents, doctors on call. There a \"protected block\" format works better: only breaks and rest are scheduled, the rest of the day stays reactive.",
  },
  {
    q: "What do I do when a meeting appears out of nowhere?",
    a: "Rearrange the blocks, but do not throw away the plan. If one block slips the others shift after it, and the calendar shows you that. If two or three blocks slip in a day, write down the reasons that evening — that is the raw material for tuning the system.",
  },
  {
    q: "Can I combine time blocking and Pomodoro?",
    a: "Yes, they pair well. Time blocking reserves a 90-minute deep work block; inside it you run three Pomodoro sessions (25 + 5 + 25 + 5 + 25). The combination suits writing, coding and studying.",
  },
  {
    q: "Isn't rebuilding blocks every day exhausting?",
    a: "For the first couple of weeks, yes. Then templates appear: exercise in the morning, deep work from 9:00, meetings on Wednesday. Once the template is stable, planning a day takes five to seven minutes.",
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
      h1="Time blocking: how to give every hour of the day a job"
      answer={
        <>
          <strong className="text-foreground">Short answer:</strong> time blocking
          means assigning each hour of the day to a specific task or type of work
          in advance. Instead of &quot;I&apos;ll get to it today&quot; you say
          &quot;09:00 to 10:30, write the report&quot;. Deep work blocks run
          90-120 minutes; block 60-70% of the day and leave the rest for what you
          cannot predict.
        </>
      }
      faq={FAQ}
      cta={{
        eyebrow: "Try it",
        title: "Put your first block in the calendar",
        text: "Open the week view and place tomorrow's three big tasks into 90-minute blocks.",
        botLabel: "Open in Telegram bot",
        siteLabel: "Open the calendar",
        siteHref: "/kalendar",
      }}
    >
      <Section title="What is time blocking?">
        <p className="text-muted">
          Time blocking is a planning technique that splits the day into time
          blocks. Every task enters the calendar the way a meeting does, with a
          start and an end. The reason is simple: a task with no assigned time has
          no protection — it slides through the day and often never happens.
        </p>
        <p className="mt-3 text-muted">
          The technique was widely popularised by Cal Newport, author of{" "}
          <em className="not-italic text-foreground">Deep Work</em>: work that is
          not written into a calendar sits in your head for hours as an open tab
          and quietly drains focus (source:{" "}
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

      <Section title="Which work suits it">
        <ul className="space-y-2 text-muted">
          <li>
            <strong className="text-foreground">Deep work</strong> — coding,
            writing, design, studying. Blocks of 90-120 minutes are ideal.
          </li>
          <li>
            <strong className="text-foreground">Meetings</strong> — with a clear
            start and end.
          </li>
          <li>
            <strong className="text-foreground">Email and messages</strong> — once
            or twice a day inside a 30-minute block. Notifications stay off the
            rest of the time.
          </li>
          <li>
            <strong className="text-foreground">Exercise, meals, rest</strong> —
            it feels unnecessary to schedule these, but without the blocks the day
            fills with something else.
          </li>
        </ul>
      </Section>

      <Section title="Time blocking, Pomodoro and the to-do list">
        <TableWrap>
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-3 font-medium">Technique</th>
              <th className="py-2 pr-3 font-medium">Block length</th>
              <th className="py-2 font-medium">Best for</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">
                Time blocking
              </td>
              <td className="py-2.5 pr-3">60-120 min</td>
              <td className="py-2.5">Deep work, meetings</td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">
                <Link
                  href="/blog/en/pomodoro-technique"
                  className="underline-offset-4 hover:underline"
                >
                  Pomodoro
                </Link>
              </td>
              <td className="py-2.5 pr-3">25 min</td>
              <td className="py-2.5">Tasks that are hard to start</td>
            </tr>
            <tr>
              <td className="py-2.5 pr-3 font-medium text-foreground">
                To-do list
              </td>
              <td className="py-2.5 pr-3">–</td>
              <td className="py-2.5">Small, quick items</td>
            </tr>
          </tbody>
        </TableWrap>
        <p className="mt-3 text-muted">
          Mixing them is normal: a{" "}
          <Link href="/blog/en/daily-planning" className={A}>
            daily plan
          </Link>{" "}
          sets the overall shape, the big items move into calendar blocks, and
          Pomodoro sessions run inside each block.
        </p>
      </Section>

      <Section title="How it works in the Unumly calendar">
        <p className="text-muted">
          Open{" "}
          <Link href="/kalendar" className={A}>
            Kalendar
          </Link>{" "}
          in week or day view. Click an hour slot to add a task, or drag an
          existing one onto the time you want. Dragging the edge of a slot sets how
          long the task should take, and the bot reminds you before it starts.
        </p>
        <p className="mt-3 text-muted">
          A good first run: place tomorrow&apos;s three biggest tasks into
          90-minute blocks. Leave the remaining hours for small work, rest and
          meetings.
        </p>
      </Section>

      <Section title="The mistakes that break it">
        <ol className="space-y-3 text-muted">
          <li>
            <strong className="text-foreground">Blocking 100% of the day.</strong>{" "}
            A plan with every minute assigned breaks at the first surprise. Block
            60-70% and leave 30% open.
          </li>
          <li>
            <strong className="text-foreground">Skipping buffers.</strong> Leave
            10-15 minutes between blocks for the switch, a pause and the loose
            ends.
          </li>
          <li>
            <strong className="text-foreground">Optimistic estimates.</strong> Add
            at least 25% to whatever length feels right. The first week of time
            blocking mostly teaches you this.
          </li>
        </ol>
        <p className="mt-3 text-muted">
          If blocks collapse regularly, run{" "}
          <Link href="/blog/en/inversion-thinking" className={A}>
            inversion thinking
          </Link>{" "}
          over your schedule: list what breaks the blocks, then close each cause
          with one concrete change.
        </p>
      </Section>
    </BlogArticle>
  );
}
