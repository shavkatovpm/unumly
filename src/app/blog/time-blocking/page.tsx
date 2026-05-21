import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { getBlogPost } from "@/lib/blog-posts";

const SLUG = "time-blocking";
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

const FAQ = [
  {
    q: "Time blocking va Google Calendar bir xil narsami?",
    a: "Yo'q. Google Calendar — bu vositadan biri; time blocking esa metodologiya. Calendar'da odatda yig'ilishlar yoziladi. Time blocking'da esa har bir ish (hisobot yozish, dasturlash, o'qish) ham vaqt blokiga ko'chiriladi — go'yo bu ham yig'ilish.",
  },
  {
    q: "Bloklar qancha uzunlikda bo'lishi kerak?",
    a: "Chuqur ish uchun 90–120 daqiqa; yig'ilish uchun 30–60; kichik ishlar uchun 15–30. Eng katta xato — 30 daqiqali bloklar bilan chuqur ish rejalashtirish: shu vaqtda endigina e'tibor jamlana boshlaydi.",
  },
  {
    q: "Time blocking kimga mos kelmaydi?",
    a: "Kuni butunlay kutilmagan ishlardan iborat odamlarga (qo'ng'iroq markazi operatori, navbatchi shifokor). Bunday ishlarda \"qo'riqchi blok\" formati ko'proq ishlaydi — kun bo'ylab faqat tanaffus va dam uchun bloklar belgilanadi, qolgani reaktiv.",
  },
  {
    q: "Yig'ilish kutilmaganda kelsa nima qilish?",
    a: "Bloklarni qayta tartiblang, lekin kun rejasini umuman bekor qilmang. Bir blok kechiksa, qolganlari avtomatik suriladi — kalendar buni ko'rsatib turadi. Agar 2–3 ta blok kechiksa, kun yakunida sabablarni yozib qo'ying: bu odatlanish manbai.",
  },
  {
    q: "Time blocking va Pomodoro birga ishlatib bo'ladimi?",
    a: "Ha, juftlik yaxshi ishlaydi. Time blocking bilan 90 daqiqalik chuqur ish bloki ajratiladi, ichida esa 3 ta Pomodoro sessiyasi o'tkaziladi (25 + 5 + 25 + 5 + 25). Bu kombinatsiya yozish, dasturlash va o'rganishda samarali.",
  },
  {
    q: "Har kuni bloklarni qayta tuzish charchatadimi?",
    a: "Birinchi 2 haftada — ha. Keyin shablonlar paydo bo'ladi: sport — har kuni ertalab, chuqur ish — 9:00 dan, yig'ilishlar — chorshanba. Shablon bo'lgach, kun tuzish 5–7 daqiqaga qisqaradi.",
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
              Time blocking — kun davomidagi har bir soatni oldindan
              ma&apos;lum vazifa yoki vazifa turiga ajratish usuli.
              &quot;Bugun nimadir qilaman&quot; o&apos;rniga &quot;soat 09:00
              dan 10:30 gacha hisobotni yozaman&quot; deyiladi. Chuqur ish
              uchun bloklar 90–120 daqiqa; kunning 60–70%i bloklanadi,
              qolgani kutilmagan ishlar uchun bo&apos;sh qoladi.
            </p>
          </aside>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Time blocking nima?
            </h2>
            <p className="text-muted">
              Time blocking (vaqt bloklash) — kunni soat bloklariga bo&apos;lib
              rejalashtirish texnikasi. Har bir vazifa go&apos;yo
              yig&apos;ilishdek — aniq boshlanish va tugash vaqti bilan
              kalendarga yoziladi. Sababi oddiy: vazifaga aniq vaqt
              belgilanmagan bo&apos;lsa, u kun davomida orqaga suriladi va
              ko&apos;p hollarda bajarilmaydi.
            </p>
            <p className="mt-3 text-muted">
              Texnikani &quot;Deep Work&quot; muallifi Cal Newport keng
              ommalashtirgan — uning fikricha, taqvimga yozilmagan ish soatlar
              davomida miyada &quot;ochiq tab&quot; bo&apos;lib turadi va
              fokusni susaytiradi (manba:{" "}
              <a
                href="https://calnewport.com/deep-work-rules-for-focused-success-in-a-distracted-world/"
                rel="noopener nofollow"
                target="_blank"
                className="text-foreground underline-offset-4 hover:underline"
              >
                calnewport.com / Deep Work
              </a>
              ).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Qaysi vazifalar uchun mos?
            </h2>
            <ul className="space-y-2 text-muted">
              <li>
                <strong className="text-foreground">Chuqur ish</strong> —
                dasturlash, yozish, dizayn, o&apos;qish. 90–120 daqiqalik
                bloklar ideal.
              </li>
              <li>
                <strong className="text-foreground">Yig&apos;ilishlar</strong>{" "}
                — aniq boshlanish va tugash vaqti bilan.
              </li>
              <li>
                <strong className="text-foreground">Email va xabarlar</strong>{" "}
                — kuniga 1–2 marta, 30 daqiqalik blok ichida. Qolgan vaqt
                xabardonlar yopiq.
              </li>
              <li>
                <strong className="text-foreground">Sport, ovqat, dam</strong>{" "}
                — bog&apos;lanmagandek tuyulsa-da, bu bloklar bo&apos;lmasa
                kun reja boshqa narsalar bilan to&apos;ladi.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Time blocking, Pomodoro va to&apos;-do farqi
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[14.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-2 pr-3 font-medium">Texnika</th>
                    <th className="py-2 pr-3 font-medium">Blok uzunligi</th>
                    <th className="py-2 font-medium">Eng mos vazifa</th>
                  </tr>
                </thead>
                <tbody className="text-muted">
                  <tr className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      Time blocking
                    </td>
                    <td className="py-2.5 pr-3">60–120 daq</td>
                    <td className="py-2.5">Chuqur ish, yig&apos;ilishlar</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      <Link
                        href="/blog/pomodoro-texnikasi"
                        className="underline-offset-4 hover:underline"
                      >
                        Pomodoro
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3">25 daq</td>
                    <td className="py-2.5">Boshlashga to&apos;siq vazifalar</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      To&apos;-do ro&apos;yxat
                    </td>
                    <td className="py-2.5 pr-3">–</td>
                    <td className="py-2.5">Kichik, tez ishlar</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-muted">
              Aralash ishlatish odatiy:{" "}
              <Link
                href="/blog/kunlik-rejalashtirish"
                className="text-foreground underline-offset-4 hover:underline"
              >
                kunlik reja
              </Link>{" "}
              bilan umumiy struktura tuziladi, asosiy ishlar time blocking
              bilan kalendarga ko&apos;chiriladi, har blok ichida esa Pomodoro
              sessiyalari o&apos;tkaziladi.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Unumly Kalendarida qanday qo&apos;llaniladi
            </h2>
            <p className="text-muted">
              Unumly&apos;ning Kalendar bo&apos;limini Hafta yoki Kun
              ko&apos;rinishida oching. Har bir soat slotini bosib yangi
              vazifa qo&apos;shasiz yoki mavjud vazifani drag-and-drop bilan
              kerakli vaqtga ko&apos;chirasiz. Slotning uzunligini tortib
              vazifaga sarflanadigan vaqtni belgilaysiz; bot belgilangan
              vaqtdan oldin eslatma yuboradi.
            </p>
            <p className="mt-3 text-muted">
              Boshlash uchun: ertaga 3 ta katta vazifani 90 daqiqalik bloklarga
              joylashtiring. Qolgan vaqt — kichik ishlar, dam va
              yig&apos;ilishlar uchun.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Eng katta xatolar
            </h2>
            <ol className="space-y-3 text-muted">
              <li>
                <strong className="text-foreground">100% bloklash.</strong>{" "}
                Kunning har bir daqiqasini bloklash — buziluvchan reja. 60–70%
                bloklang, 30% bo&apos;sh qoldiring (kutilmagan ishlar uchun).
              </li>
              <li>
                <strong className="text-foreground">
                  Buferdan voz kechish.
                </strong>{" "}
                Har bir blok orasiga 10–15 daqiqa bo&apos;sh joy qo&apos;ying —
                blokdan blokga o&apos;tish vaqti, kichik tanaffuslar uchun.
              </li>
              <li>
                <strong className="text-foreground">
                  Optimistik baholash.
                </strong>{" "}
                Vazifaga sarflanadigan vaqtni kamida 25% ortig&apos;i bilan
                belgilang. Birinchi haftada bu eng katta saboq beradi.
              </li>
            </ol>
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
            Sinab ko&apos;ring
          </p>
          <h2 className="mt-2 text-[18px] font-medium tracking-[-0.01em]">
            Kalendarda birinchi blokni hozir qo&apos;ying
          </h2>
          <p className="mt-2 text-[14px] text-muted">
            Hafta ko&apos;rinishini oching va ertangi 3 ta katta vazifani
            90 daqiqalik bloklarga joylashtiring.
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
              href="/kalendar"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-5 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-subtle"
            >
              Saytda Kalendarni ochish
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
