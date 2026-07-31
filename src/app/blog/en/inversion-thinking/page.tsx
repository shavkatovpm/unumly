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

const paths = BLOG_PATHS["teskari-fikrlash"];
const post = getBlogPostEn("inversion-thinking")!;
const UPDATED = "2026-07-31";

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  keywords: [
    "inversion thinking",
    "inversion mental model",
    "thinking backwards",
    "premortem",
    "avoid failure",
    "goal setting",
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
    name: "Write the goal in one sentence",
    text: "Inversion does not work on vague goals. Not \"get healthy\" but \"train three times a week until autumn\". To know what could break something, you first need to know exactly what you are building.",
  },
  {
    name: "List everything that would ruin it",
    text: "Give yourself five to ten minutes and write without filtering. External causes count (work schedule, family, money) and so do internal ones (procrastination, forgetting, over-promising). Do not cross anything out yet.",
  },
  {
    name: "Sort the list by likelihood and damage",
    text: "Two questions per item: how likely is this, and how badly would it hurt? The items that score high on both are your real opponents. There are usually no more than three to five of them.",
  },
  {
    name: "Write one concrete action against each cause",
    text: "\"I will forget\" becomes a reminder. \"No energy in the evening\" becomes a morning session. \"My training partner drops out\" becomes a solo version of the workout. Removing the list is the first part of the plan, not an add-on.",
  },
  {
    name: "Reread the list once a week",
    text: "New obstacles show up along the way and old ones get closed. During your weekly review, walk the list: which items are still alive? Five minutes of this keeps a goal from quietly dying halfway.",
  },
];

const FAQ: QA[] = [
  {
    q: "What is inversion thinking?",
    a: "Inversion thinking means solving a problem from its end — the failure side. Instead of asking \"how do I achieve this?\", you ask \"what would stop me from achieving this?\", list the answers, and start the plan by removing that list.",
  },
  {
    q: "How is inversion different from pessimism?",
    a: "A pessimist lists the problems and stops there. Someone thinking in inversion writes the same list, then attaches a counter-action to every item. The difference is not the mood, it is what happens to the list.",
  },
  {
    q: "Who popularised the inversion model?",
    a: "The principle \"invert, always invert\" (man muss immer umkehren) is attributed to the German mathematician Carl Jacobi. In business and decision-making it was popularised by Charlie Munger, who advised starting any analysis with the question \"where could I be wrong?\".",
  },
  {
    q: "What is a premortem?",
    a: "A premortem is an exercise where, before a project starts, the team imagines it has failed completely and explains why. It was proposed by psychologist Gary Klein. It is inversion done as a group: mistakes get said out loud before they happen.",
  },
  {
    q: "When should you not use inversion?",
    a: "During idea generation and at the start of creative work — a list of constraints arrives too early and shuts down thinking. Also, once a list grows past fifteen or twenty items it stops being a plan and becomes anxiety. Keep the three to five that matter.",
  },
  {
    q: "What about causes outside my control?",
    a: "Mark them separately. Those get a fallback rather than a counter-action: \"internet goes down — an offline version of the work\", \"client delays — a second source of tasks\". That still closes the item.",
  },
  {
    q: "How do I fit inversion into a daily plan?",
    a: "When you set a new goal, make the failure list your first task. Then turn each counter-action into its own task with a time on it. In Unumly those simply live as tasks inside the goal.",
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
      h1="Inversion thinking: how to solve a problem backwards"
      answer={
        <>
          <strong className="text-foreground">Short answer:</strong> inversion
          thinking looks for the reasons you will miss a goal instead of the path
          to reaching it. Rather than &quot;how do I succeed?&quot;, you ask
          &quot;what will take me down?&quot;. The second question returns a short,
          concrete list — and the first part of your plan is removing it.
        </>
      }
      faq={FAQ}
      schema={[
        howToSchema(
          "en",
          "How to apply inversion thinking",
          "Five steps: find the reasons a goal would fail and close each one with a concrete action.",
          STEPS,
        ),
      ]}
      cta={{
        eyebrow: "Start",
        title: "Write your failure list today",
        text: "Pick one goal, write down three things that would break it, and add one task against each. Start in the bot or on the web — whichever is closer.",
        botLabel: "Open in Telegram bot",
        siteLabel: "Open on the web",
        siteHref: "/bugun",
      }}
    >
      <Section title="What is inversion thinking?">
        <p className="text-muted">
          Inversion is a way of solving a problem from the far end. Normally we
          look at a goal and search for a route to it. With inversion you picture
          the failure first and list the reasons that caused it.
        </p>
        <p className="mt-3 text-muted">
          The logic is simple: a recipe for success is hard to find, while the
          causes of failure are easier and more precise to name. There is never
          one correct road — there are dozens. But the things that knock you off
          the road usually fit on one hand.
        </p>
        <p className="mt-3 text-muted">
          The idea is old. The mathematician{" "}
          <a
            href="https://en.wikipedia.org/wiki/Carl_Gustav_Jacob_Jacobi"
            rel="noopener nofollow"
            target="_blank"
            className={A}
          >
            Carl Jacobi
          </a>{" "}
          advised attacking hard problems by inverting them.{" "}
          <a
            href="https://en.wikipedia.org/wiki/Charlie_Munger"
            rel="noopener nofollow"
            target="_blank"
            className={A}
          >
            Charlie Munger
          </a>{" "}
          carried the habit into investing and management: &quot;All I want to
          know is where I&apos;m going to die, so I&apos;ll never go there.&quot;
        </p>
      </Section>

      <Section title="Why the negative question gives a sharper answer">
        <p className="text-muted">
          A positive question produces many vague answers. The inverted question
          produces a short, specific list. And removing a list is practical work
          — you can start on it today.
        </p>
        <p className="mt-3 text-muted">
          &quot;How do I save money?&quot; leads to hundreds of pieces of advice:
          investing, side income, budgeting apps, personal finance books. All
          true, none of it tells you where to begin.
        </p>
        <p className="mt-3 text-muted">
          &quot;What will leave me broke?&quot; returns about five answers:
        </p>
        <ol className="mt-3 space-y-2 text-muted">
          <li>1. Unplanned purchases</li>
          <li>2. Debt</li>
          <li>3. No emergency buffer</li>
          <li>4. Depending on a single income source</li>
          <li>5. Not tracking expenses</li>
        </ol>
        <p className="mt-3 text-muted">
          Closing those five is already a large result. Notice that every item
          converts straight into a task, while &quot;start investing&quot; is a
          topic, not a task. That is the real power of the inverted question: it
          moves you from topic to action.
        </p>
      </Section>

      <Section title="Inversion is not pessimism">
        <p className="text-muted">
          The two get confused because both name bad outcomes. The difference is
          what follows:{" "}
          <strong className="text-foreground">
            a pessimist lists the problems and stops; someone using inversion
            lists them and then closes each one.
          </strong>
        </p>
        <p className="mt-3 text-muted">
          The list is a starting point, not a conclusion. If nothing on your page
          has a counter-action next to it, you are not inverting — you are
          worrying. The test is easy: after reading the list, do you have a
          specific thing to do tomorrow?
        </p>
      </Section>

      <Section title="How to apply inversion in 5 steps">
        <Steps steps={STEPS} />
      </Section>

      <Section title="Examples: the usual question vs the inverted one">
        <p className="mb-3 text-muted">
          The same goal, asked two ways. The answer in the right column is always
          more concrete and gets done sooner.
        </p>
        <TableWrap>
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-3 font-medium">Goal</th>
              <th className="py-2 pr-3 font-medium">Usual question</th>
              <th className="py-2 font-medium">Inverted question and first step</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">Savings</td>
              <td className="py-2.5 pr-3">How do I save money?</td>
              <td className="py-2.5">
                What leaves me broke? → move the buffer out on payday, before
                spending
              </td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">
                Training
              </td>
              <td className="py-2.5 pr-3">How do I train consistently?</td>
              <td className="py-2.5">
                What stops the training? → evening fatigue → move it to the
                morning
              </td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">Exams</td>
              <td className="py-2.5 pr-3">How do I prepare well?</td>
              <td className="py-2.5">
                What makes me fail? → leaving it to the last day → spread topics
                across dates
              </td>
            </tr>
            <tr>
              <td className="py-2.5 pr-3 font-medium text-foreground">Project</td>
              <td className="py-2.5 pr-3">How do I make this project succeed?</td>
              <td className="py-2.5">
                Why would it fail? → unclear requirements → written agreement in
                week one
              </td>
            </tr>
          </tbody>
        </TableWrap>
        <p className="mt-3 text-muted">
          The last row has a team name:{" "}
          <strong className="text-foreground">the premortem</strong>. Before a
          project starts, the team sits down and answers &quot;imagine this
          failed completely — why?&quot; (method described at{" "}
          <a
            href="https://hbr.org/2007/09/performing-a-project-premortem"
            rel="noopener nofollow"
            target="_blank"
            className={A}
          >
            Harvard Business Review
          </a>
          ). Mistakes spoken out loud in advance mostly stop happening.
        </p>
      </Section>

      <Section title="Where the method breaks down">
        <p className="text-muted">
          I have used it badly more than once: written the list, looked at it, and
          then never started the work at all. Three limits worth keeping in mind:
        </p>
        <ul className="mt-3 space-y-3 text-muted">
          <li>
            <strong className="text-foreground">Early idea stage</strong> — when
            you are still inventing something, a constraint list arrives too soon
            and smothers it. Write the idea down first, invert afterwards.
          </li>
          <li>
            <strong className="text-foreground">Long lists</strong> — twenty
            causes is anxiety, not a plan. Keep the three to five most likely and
            most damaging.
          </li>
          <li>
            <strong className="text-foreground">Lists without actions</strong> — a
            cause with no counter-action just sits there and drains motivation.
            One item, one task — do not break that rule.
          </li>
        </ul>
      </Section>

      <Section title="Running an inverted plan in Unumly">
        <p className="text-muted">
          A notebook works fine for this, with one catch: the failure list gets
          written once and never opened again. Reopening it is where the value
          is.
        </p>
        <p className="mt-3 text-muted">
          Here is how I keep it in{" "}
          <Link href="/haqida" className={A}>
            Unumly
          </Link>
          : the goal goes into{" "}
          <Link href="/maqsad" className={A}>
            Maqsad
          </Link>{" "}
          (goals), and the steps under it are not vague intentions but
          counter-actions — &quot;move the buffer out on payday&quot;, &quot;shift
          training to 07:00&quot;. They appear in{" "}
          <Link href="/bugun" className={A}>
            Bugun
          </Link>{" "}
          (today) as ordinary tasks, and the Telegram bot pings when one is due.
          The list does not stay on paper; it turns into a day.
        </p>
        <p className="mt-3 text-muted">
          For bigger work, open a document in{" "}
          <Link href="/loyiha" className={A}>
            Loyiha
          </Link>{" "}
          (projects) and keep the premortem there. The interface is in Uzbek for
          now, but the sections are simple: Bugun — today, Maqsad — goals,
          Kalendar — calendar.
        </p>
        <p className="mt-3 text-muted">
          Inversion sits on top of normal planning rather than replacing it. Once
          the list exists, use{" "}
          <Link href="/blog/en/time-blocking" className={A}>
            time blocking
          </Link>{" "}
          or a plain{" "}
          <Link href="/blog/en/daily-planning" className={A}>
            daily plan
          </Link>{" "}
          to give the counter-actions a slot. The general foundations are in the{" "}
          <Link href="/blog/en/time-management" className={A}>
            time management guide
          </Link>
          .
        </p>
      </Section>
    </BlogArticle>
  );
}
