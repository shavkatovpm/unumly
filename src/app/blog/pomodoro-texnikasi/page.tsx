import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { getBlogPost } from "@/lib/blog-posts";

const SLUG = "pomodoro-texnikasi";
const post = getBlogPost(SLUG)!;
const URL = `https://unumly.uz/blog/${SLUG}`;
const UPDATED = "2026-05-21";
const BOT_URL = "https://t.me/unumlybot";

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: post.title,
    description: post.description,
    url: URL,
    publishedTime: post.publishedAt,
    modifiedTime: UPDATED,
  },
};

const STEPS = [
  {
    name: "Vazifani tanlang",
    text: "Faqat bitta vazifani tanlang — fokus shu yerga qaratiladi. Vazifa juda katta bo'lsa, kichikroq qismga bo'lib oling.",
  },
  {
    name: "25 daqiqa taymerini sozlang",
    text: "Telefon yoki kompyuterda taymer qo'ying. 25 daqiqa davomida boshqa hech narsaga bormaslik — bu eng muhim qoida.",
  },
  {
    name: "Faqat shu vazifa bilan ishlang",
    text: "Email kelmasin, telefon ovozsiz, ijtimoiy tarmoqlar yopiq. Kimdir gaplashmoqchi bo'lsa: \"25 daqiqadan keyin\" deb javob bering.",
  },
  {
    name: "5 daqiqa dam",
    text: "Taymer tugagach, o'rningdan turing. Suv iching, oyna oldiga boring, qo'l-oyoqni cho'zing. Ekrandan uzoqlashing.",
  },
  {
    name: "Har 4 pomodorodan keyin uzun dam",
    text: "4 ta sessiyadan keyin 15–30 daqiqa uzun dam oling. Miya bunga muhtoj — samaradorlikni saqlash kaliti shu joyda.",
  },
];

const FAQ = [
  {
    q: "Pomodoro nima uchun aynan 25 daqiqa?",
    a: "Francesco Cirillo bu vaqtni o'z tajribasi orqali tanlagan — yetarli darajada uzun bo'lib, jiddiy ishga ulgursin, lekin shunchalik qisqaki, e'tibor susaymasin. Ba'zilarga 25 kam, ba'zilarga ko'p tuyuladi: 20 yoki 45 daqiqali variantlar ham bor.",
  },
  {
    q: "Ish vaqtida boshqalar gaplashsa nima qilish kerak?",
    a: "Eng samarali javob: \"25 daqiqadan keyin to'liq diqqat bilan tinglayman\". Aksariyat hollarda odam kuta oladi. Shoshilinch bo'lsa — pomodoroni to'xtating va keyin yangidan boshlang (yarmidan davom etmang).",
  },
  {
    q: "Kuniga nechta pomodoro qilish kerak?",
    a: "Boshlovchi uchun 4–6 ta yetadi. Tajribali odamlar 8–12 tagacha chiqaradi, lekin bu chiqarish maqsad emas — bajarilgan ish hajmi. Kuniga 16 ta pomodoro qilish — chidamlilik tajribasi, samaradorlik emas.",
  },
  {
    q: "Pomodoro charchatadimi?",
    a: "Aksincha — to'g'ri qo'llanganda kam charchatadi. Majburiy 5 daqiqalik damlar miyaga toza kislorod beradi. Charchoq sezsangiz, sabab boshqa: ko'p pomodoro orqama-orqa qilingan yoki uzun damlar tushirib qoldirilgan.",
  },
  {
    q: "Pomodoro o'rganish va imtihonga tayyorgarlik uchun ishlaydimi?",
    a: "Ha, ayniqsa boshlash qiyin bo'lganda. \"4 soat o'tirib o'qiyman\" o'rniga \"bitta pomodoro o'qib ko'raman\" deyish ancha yengilroq tuyuladi. Bir necha pomodorodan keyin esa odat shakllanadi.",
  },
  {
    q: "Pomodoro ilova kerakmi yoki telefon taymeri yetarli?",
    a: "Boshlovchi uchun oddiy telefon taymeri yetadi. Ilova faqat shunda kerak: pomodorolar tarixi, vazifa bilan bog'lanish va statistikani ko'rmoqchi bo'lsangiz. Ilovaga pul to'lashdan oldin kamida 2 hafta oddiy taymer bilan sinab ko'ring.",
  },
];

export default function Page() {
  return (
    <>
      <main className="mx-auto min-h-screen max-w-2xl px-6 py-12 sm:px-8 sm:py-16">
        <nav className="mb-10" aria-label="Breadcrumb">
          <Link
            href="/blog"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint hover:text-foreground"
          >
            ← Blog
          </Link>
        </nav>

        <header className="mb-10">
          <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString("uz-UZ", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span aria-hidden>·</span>
            <span>{post.readingMinutes} daqiqa o&apos;qish</span>
          </div>
          <h1 className="mt-3 text-balance text-[clamp(1.75rem,4.5vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.02em]">
            {post.title}
          </h1>
          <p className="mt-5 text-[15.5px] leading-relaxed text-muted">
            {post.description}
          </p>
        </header>

        <article className="space-y-7 text-[15px] leading-[1.7] text-foreground/85">
          <aside className="rounded-md border-l-2 border-foreground/30 bg-subtle/40 py-3 pl-4 pr-3">
            <p className="text-[14.5px] leading-relaxed">
              <strong className="text-foreground">Qisqa javob:</strong>{" "}
              Pomodoro — ish 25 daqiqalik fokus sessiyalariga (har biri
              &quot;pomodoro&quot;) bo&apos;linadigan vaqt boshqarish usuli.
              Har sessiya orasida 5 daqiqa dam beriladi, 4 ta pomodorodan
              keyin 15–30 daqiqalik uzun dam. Texnika 1980-yillar oxirida
              Francesco Cirillo tomonidan ishlab chiqilgan.
            </p>
          </aside>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Pomodoro nima?
            </h2>
            <p className="text-muted">
              Pomodoro texnikasi — 1980-yillar oxirida italiyalik tadqiqotchi
              Francesco Cirillo tomonidan ishlab chiqilgan oddiy fokus usuli.
              Asosi: ish 25 daqiqalik kichik bloklarga bo&apos;linadi (har
              biri &quot;pomodoro&quot; deyiladi), bloklar orasida 5 daqiqalik
              dam beriladi (manba:{" "}
              <a
                href="https://en.wikipedia.org/wiki/Pomodoro_Technique"
                rel="noopener nofollow"
                target="_blank"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Wikipedia
              </a>
              ).
            </p>
            <p className="mt-3 text-muted">
              &quot;Pomodoro&quot; italyancha &quot;pomidor&quot; degani —
              Cirillo&apos;ning oshxonadagi pomidor shaklidagi taymeridan
              kelib chiqqan. Texnikaning nomi shundan.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              5 qadamda Pomodoro
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
              Qachon foydali?
            </h2>
            <ul className="space-y-2 text-muted">
              <li>
                <strong className="text-foreground">Murakkab vazifalar</strong>{" "}
                — boshlash qiyin bo&apos;lganda, &quot;atigi 25 daqiqa&quot;
                deyish psixologik to&apos;siqni kamaytiradi.
              </li>
              <li>
                <strong className="text-foreground">
                  E&apos;tibor tarqalganda
                </strong>{" "}
                — taymer cheklov beradi, miya boshqa narsalarga
                ko&apos;chmaydi.
              </li>
              <li>
                <strong className="text-foreground">Tezda charchaganda</strong>{" "}
                — qisqa bloklar va majburiy damlar charchoq kelishini
                kechiktiradi.
              </li>
              <li>
                <strong className="text-foreground">
                  Imtihonga tayyorlanayotganda
                </strong>{" "}
                — uzun o&apos;qish sessiyalariga kichik qadamlardan kirish
                osonroq.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Qachon ishlatmaslik kerak?
            </h2>
            <p className="text-muted">
              Pomodoro hamma vazifaga mos emas. Ijodiy ishlar (yozish, dizayn,
              musiqa) ko&apos;pincha 90–120 daqiqalik chuqur fokus talab
              qiladi — 25 daqiqada endigina &quot;flow&quot; holatiga
              kirayotganingizda taymer chalinadi. Bunday vazifalar uchun{" "}
              <Link
                href="/blog/time-blocking"
                className="text-foreground underline-offset-4 hover:underline"
              >
                time blocking
              </Link>{" "}
              ko&apos;proq mos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Pomodoro va Time blocking farqi
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[14.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-2 pr-3 font-medium">Mezon</th>
                    <th className="py-2 pr-3 font-medium">Pomodoro</th>
                    <th className="py-2 font-medium">Time blocking</th>
                  </tr>
                </thead>
                <tbody className="text-muted">
                  <tr className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      Davomiyligi
                    </td>
                    <td className="py-2.5 pr-3">25 daq</td>
                    <td className="py-2.5">60–120 daq</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      Mos vazifa
                    </td>
                    <td className="py-2.5 pr-3">Kichik, takroriy</td>
                    <td className="py-2.5">Chuqur, uzoq</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      Asosiy g&apos;oya
                    </td>
                    <td className="py-2.5 pr-3">Boshlashga kuch berish</td>
                    <td className="py-2.5">Kunni oldindan tuzish</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-muted">
              Ikkalasi bir-biriga zid emas — odatda{" "}
              <Link
                href="/blog/kunlik-rejalashtirish"
                className="text-foreground underline-offset-4 hover:underline"
              >
                kunlik rejada
              </Link>{" "}
              time blocking bilan 90 daqiqalik bloklar belgilanadi, ichida
              esa Pomodoro sessiyalari ishlatiladi.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Unumly bilan birga
            </h2>
            <p className="text-muted">
              Hozircha Unumly&apos;da ichki Pomodoro taymeri yo&apos;q
              (rejada bor). Lekin texnikani qo&apos;llash uchun: Bugun
              bo&apos;limidagi vazifani 25 daqiqalik &quot;pomodoro&quot; deb
              hisoblang, telefon taymerini ishga tushiring va vazifa
              bajarilganda Unumly Telegram bot orqali kelgan eslatmadagi
              &quot;Bajardim&quot; tugmasi bilan yopib qo&apos;ying.
            </p>
          </section>

          <section className="border-t border-border pt-7">
            <h2 className="mb-5 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Ko&apos;p so&apos;raladigan savollar
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
            Boshlash
          </p>
          <h2 className="mt-2 text-[18px] font-medium tracking-[-0.01em]">
            Birinchi Pomodoroni hozir boshlang
          </h2>
          <p className="mt-2 text-[14px] text-muted">
            Bitta vazifani tanlang, 25 daqiqalik taymerni qo&apos;ying va
            faqat shu vazifa bilan ishlang. Vazifani esa Unumly Bugun
            bo&apos;limida belgilab qo&apos;ying.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <a
              href={BOT_URL}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
            >
              <Send className="size-4" />
              Telegram botda boshlash
            </a>
            <Link
              href="/bugun"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-5 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-subtle"
            >
              Saytda Bugunni ochish
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
                  name: "Bosh sahifa",
                  item: "https://unumly.uz/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Blog",
                  item: "https://unumly.uz/blog",
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
              inLanguage: "uz",
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
            },
            {
              "@context": "https://schema.org",
              "@type": "HowTo",
              name: "Pomodoro texnikasini qanday qo'llash kerak",
              description:
                "25 daqiqalik fokus sessiyalari yordamida vazifalarni bajarish bo'yicha 5 qadamli qo'llanma.",
              inLanguage: "uz",
              totalTime: "PT25M",
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
              inLanguage: "uz",
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
