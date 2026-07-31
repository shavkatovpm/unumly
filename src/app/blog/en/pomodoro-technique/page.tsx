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

const paths = BLOG_PATHS["pomodoro-texnikasi"];
const post = getBlogPostEn("pomodoro-technique")!;
const UPDATED = "2026-07-31";

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  keywords: [
    "pomodoro technique",
    "pomodoro method",
    "25 minute focus",
    "focus timer",
    "how to stop getting distracted",
    "study technique",
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
    name: "Pick one task",
    text: "Exactly one — that is where the focus goes. If the task is too big, cut off a piece you can genuinely close in a single session.",
  },
  {
    name: "Set a 25-minute timer",
    text: "Phone or computer, it does not matter. The one rule that counts: for those 25 minutes you do not switch to anything else.",
  },
  {
    name: "Work only on that task",
    text: "Email closed, phone silent, social apps shut. If someone needs you, the answer is \"in 25 minutes\".",
  },
  {
    name: "Take a five-minute break",
    text: "When the timer rings, stand up. Drink water, walk to the window, stretch your shoulders. The point is to get away from the screen.",
  },
  {
    name: "After four sessions, take a long break",
    text: "Following four pomodoros, rest for 15-30 minutes. Your brain needs it — the long breaks are what keep output steady until the end of the day.",
  },
];

const FAQ: QA[] = [
  {
    q: "Why 25 minutes specifically?",
    a: "Francesco Cirillo settled on that length through practice: long enough to get real work done, short enough that attention does not drift. Some people prefer 20 minutes, others 45 — both variants are fine.",
  },
  {
    q: "What if someone interrupts mid-session?",
    a: "The most effective reply is \"in 25 minutes I'll give you my full attention\". Most of the time people can wait. If it is genuinely urgent, stop the pomodoro and start a fresh one later rather than resuming from the middle.",
  },
  {
    q: "How many pomodoros should I do per day?",
    a: "Four to six is plenty when starting out. Experienced users reach 8-12, but the count is not the goal — the work finished is. Sixteen pomodoros in a row is an endurance test, not productivity.",
  },
  {
    q: "Is the Pomodoro Technique tiring?",
    a: "Used properly it is less tiring, not more. The mandatory five-minute breaks give real recovery. If fatigue still builds, the cause is usually sessions run back to back with the long breaks skipped.",
  },
  {
    q: "Does Pomodoro work for studying and exam prep?",
    a: "Yes, particularly when sitting down is the hard part. \"I'll study for four hours\" feels heavy; \"I'll do one pomodoro\" does not. After a few sessions the habit takes over and continuing gets easier.",
  },
  {
    q: "Do I need an app or is a phone timer enough?",
    a: "A plain timer is enough to start. An app is only worth it if you want session history, links to tasks and statistics. Before paying for one, run the method for at least two weeks with a simple timer.",
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
      h1="The Pomodoro Technique: 25 minutes of focus at a time"
      answer={
        <>
          <strong className="text-foreground">Short answer:</strong> the Pomodoro
          Technique splits work into 25-minute focus sessions, each one called a
          &quot;pomodoro&quot;. Sessions are separated by five-minute breaks, and
          after four of them you take a longer 15-30 minute break. Francesco
          Cirillo developed the method in the late 1980s.
        </>
      }
      faq={FAQ}
      schema={[
        howToSchema(
          "en",
          "How to run a Pomodoro session",
          "Five steps for running your first 25-minute focus session.",
          STEPS,
          "PT25M",
        ),
      ]}
      cta={{
        eyebrow: "Start",
        title: "Run your first pomodoro now",
        text: "Pick one task, set a 25-minute timer and work on nothing else. Keep the task itself in the Bugun list.",
        botLabel: "Open in Telegram bot",
        siteLabel: "Open on the web",
        siteHref: "/bugun",
      }}
    >
      <Section title="What is the Pomodoro Technique?">
        <p className="text-muted">
          The Pomodoro Technique is a simple focus method developed by the Italian
          researcher Francesco Cirillo in the late 1980s. The core: work is broken
          into 25-minute stretches (each called a &quot;pomodoro&quot;) with
          five-minute breaks between them (source:{" "}
          <a
            href="https://en.wikipedia.org/wiki/Pomodoro_Technique"
            rel="noopener nofollow"
            target="_blank"
            className={A}
          >
            Wikipedia
          </a>
          ).
        </p>
        <p className="mt-3 text-muted">
          &quot;Pomodoro&quot; is Italian for tomato — the name comes from the
          tomato-shaped kitchen timer Cirillo used.
        </p>
      </Section>

      <Section title="The five steps">
        <Steps steps={STEPS} />
      </Section>

      <Section title="When it helps most">
        <ul className="space-y-2 text-muted">
          <li>
            <strong className="text-foreground">Difficult tasks</strong> — when
            starting is the obstacle, &quot;only 25 minutes&quot; lowers the
            psychological barrier.
          </li>
          <li>
            <strong className="text-foreground">Scattered attention</strong> — the
            timer sets a boundary, and the mind wanders less inside it.
          </li>
          <li>
            <strong className="text-foreground">Tiring quickly</strong> — short
            stretches and forced breaks push fatigue further out.
          </li>
          <li>
            <strong className="text-foreground">Exam preparation</strong> — long
            study sessions are easier to enter through small steps.
          </li>
        </ul>
      </Section>

      <Section title="When not to use it">
        <p className="text-muted">
          Pomodoro does not fit every kind of work. Creative work — writing,
          design, music — often needs 90-120 minutes of unbroken depth: you are
          just entering flow when the timer goes off. For that,{" "}
          <Link href="/blog/en/time-blocking" className={A}>
            time blocking
          </Link>{" "}
          is the better fit.
        </p>
      </Section>

      <Section title="Pomodoro vs time blocking">
        <TableWrap>
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-3 font-medium">Criterion</th>
              <th className="py-2 pr-3 font-medium">Pomodoro</th>
              <th className="py-2 font-medium">Time blocking</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">Length</td>
              <td className="py-2.5 pr-3">25 min</td>
              <td className="py-2.5">60-120 min</td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">
                Best suited to
              </td>
              <td className="py-2.5 pr-3">Small, repeatable work</td>
              <td className="py-2.5">Deep, long work</td>
            </tr>
            <tr>
              <td className="py-2.5 pr-3 font-medium text-foreground">
                Core idea
              </td>
              <td className="py-2.5 pr-3">Make starting easy</td>
              <td className="py-2.5">Shape the day in advance</td>
            </tr>
          </tbody>
        </TableWrap>
        <p className="mt-3 text-muted">
          They are not rivals. A typical{" "}
          <Link href="/blog/en/daily-planning" className={A}>
            daily plan
          </Link>{" "}
          uses time blocking for 90-minute blocks and Pomodoro sessions inside
          them.
        </p>
      </Section>

      <Section title="Using it alongside Unumly">
        <p className="text-muted">
          Unumly does not have a built-in Pomodoro timer yet (it is on the
          roadmap). That does not stop you using the method: treat a task in{" "}
          <Link href="/bugun" className={A}>
            Bugun
          </Link>{" "}
          (today) as one pomodoro, start the timer on your phone, and close the
          task with the &quot;Bajardim&quot; (done) button in the Telegram bot
          reminder when the session ends.
        </p>
      </Section>
    </BlogArticle>
  );
}
