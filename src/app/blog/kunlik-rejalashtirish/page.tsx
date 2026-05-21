import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { getBlogPost } from "@/lib/blog-posts";

const SLUG = "kunlik-rejalashtirish";
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
    name: "Maqsadni aniqlang",
    text: "Ertaga eng katta uchta natijani yozib qo'ying. Bular kuningiz nima bilan o'lchanishini ko'rsatadi. Boshqa hamma vazifa shu uchta natija atrofida quriladi.",
  },
  {
    name: "Vazifalarni chiqaring",
    text: "Bugun bo'limini oching va xayolingizdagi hamma narsani ro'yxatga kiriting — hatto kichik tuyulganlarini ham. Tartib hozir muhim emas; asosiysi hech narsa miyangizda qolmasligi.",
  },
  {
    name: "Muhimlik darajasini belgilang",
    text: "Har vazifaga ustuvorlik bering. Bir kunda ikki-uchtadan ko'p \"yuqori muhimlikdagi\" vazifa bo'lmasin — aks holda ulardan birortasini ham bajara olmaysiz.",
  },
  {
    name: "Vaqt belgilang",
    text: "Asosiy vazifalarga taxminiy vaqt bering yoki Kalendar ko'rinishida drag-and-drop bilan kun bo'ylab joylashtiring. Vazifaga sarflanadigan vaqtni odamlar odatda 30–50% kam baholashadi — buni hisobga oling.",
  },
  {
    name: "Kun nihoyasida sharhlang",
    text: "Kun yakunida bajarilganlarni belgilang, bajarilmaganlarni ertangi kunga ko'chiring. Bu odat keyingi kunlarni yaxshiroq rejalashtirishga yordam beradi.",
  },
];

const FAQ = [
  {
    q: "Kunlik reja tuzishga qancha vaqt sarflash kerak?",
    a: "10–20 daqiqa yetadi. Kechqurun 10–15 daqiqada ertaga ro'yxat tayyorlanadi; ertalab esa 5 daqiqada qayta ko'rib chiqiladi. Bundan ko'p vaqt sarflasangiz, reja ishingizni boshqaradigan bo'lib qoladi — bu kerak emas.",
  },
  {
    q: "Reja ertalab tuzilsinmi yoki kechqurun?",
    a: "Kechqurun afzalroq. Uyqu davomida miya vazifalarni ongsiz qayta ishlaydi va ertalab darrov ishga kirishasiz. Ertalab tuzish ham yomon emas, lekin \"qaerdan boshlasam\" muammosi yuzaga keladi.",
  },
  {
    q: "Bir kunda nechta vazifa qo'shish maqbul?",
    a: "Odatda 5–7 ta. Bundan ko'pi kun oxirida ko'chiriladi va \"ulgurmadim\" hissini qoldiradi. Ichidan 2–3 tasi yuqori muhimlikda, qolgani ikkilamchi bo'lsin.",
  },
  {
    q: "Reja bajarilmasa nima qilish kerak?",
    a: "Ko'chirish — xato emas, odat. Bajarilmagan vazifani ertangi kunga ko'chiring va sabab haqida bitta jumla yozing: vaqt yetmadimi, energiya yetmadimi yoki vazifa noaniq edimi? Shu joy o'sish manbai.",
  },
  {
    q: "Qog'oz kundalik yaxshimi yoki ilova?",
    a: "Har biri o'z o'rnida. Qog'oz tafakkurni sekinlashtiradi va fikrlashga yordam beradi. Ilova esa eslatma, sinxronizatsiya va ko'chirishni avtomatik bajaradi. Boshlovchi uchun ilova yengilroq — o'zi eslatib turadi.",
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
              Kunlik rejalashtirish — bugungi yoki ertangi 24 soatni aniq
              vazifalarga ajratish jarayoni. Samarali reja 10–20 daqiqada
              tuziladi (kechqurun yoki ertalab) va beshta qadamdan iborat:
              maqsadni aniqlash, vazifalarni chiqarish, muhimlikni belgilash,
              vaqt belgilash, kun yakunida sharhlash. Bir kunga 5–7 tadan ko&apos;p
              vazifa qo&apos;yilmaydi.
            </p>
          </aside>

          <p>
            Ko&apos;pchilik kunni{" "}
            <em>&quot;nima qilsam ekan&quot;</em> savoli bilan boshlaydi va
            kechqurun <em>&quot;nimaga ulgurmadim&quot;</em> savoli bilan
            tugatadi. Yaxshi tuzilgan kun rejasi shu ikki savolni ham hal
            qiladi.
          </p>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Kunlik rejalashtirish nima?
            </h2>
            <p className="text-muted">
              Kunlik rejalashtirish — kunning oldindan tuzilgan vazifa va vaqt
              strukturasi. Maqsadi sodda: e&apos;tiborni muhim ishlarga
              yo&apos;naltirish, kichik narsalarga vaqt yo&apos;qotmaslik va kun
              yakunida natijani aniq o&apos;lchash. Aniq vaqt bilan bog&apos;lash
              uchun{" "}
              <Link
                href="/blog/time-blocking"
                className="text-foreground underline-offset-4 hover:underline"
              >
                time blocking
              </Link>{" "}
              ishlatiladi; bitta vazifaga fokuslanish uchun esa{" "}
              <Link
                href="/blog/pomodoro-texnikasi"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Pomodoro
              </Link>{" "}
              texnikasidan foydalaniladi.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              5 qadamda samarali kun
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
              Eng keng tarqalgan xato
            </h2>
            <p className="text-muted">
              Bir kunga 15–20 ta vazifa yozib qo&apos;yish. Haqiqiy bajariladigan
              vazifalar soni odatda 5–7 ta atrofida. Qolganlari kun oxirida
              ko&apos;chiriladi va sekin-asta &quot;bajarilmadim&quot;
              tuyg&apos;usini hosil qiladi. Vazifalar sonini cheklash —
              rejaning eng muhim qoidasi.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Qachon rejalashtirish kerak?
            </h2>
            <p className="text-muted">
              Eng yaxshi vaqt — oldingi kun kechqurun (10–15 daqiqa) yoki
              ertasi kuni ertalab (15–20 daqiqa). Kechqurun
              rejalashtirsangiz, uyqu davomida miya vazifalarni
              &quot;pishirib&quot; qo&apos;yadi va ertalab darrov ishga
              kirishasiz.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Unumly&apos;da qanday ko&apos;rinadi
            </h2>
            <p className="text-muted">
              Unumly&apos;ning Bugun bo&apos;limida vazifa qo&apos;shganda
              muhimlik darajasi va vaqt birga so&apos;raladi. Belgilangan
              vaqtda Telegram bot eslatma yuboradi — &quot;Bajardim&quot;
              tugmasi orqali vazifani to&apos;g&apos;ridan-to&apos;g&apos;ri bot
              ichida yopib qo&apos;ysangiz bo&apos;ladi. Shunda 5-qadam (kun
              nihoyasida sharhlash) tabiiy ravishda kun davomida bajarilib
              boradi.
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
            Birinchi rejangizni hozir tuzing
          </h2>
          <p className="mt-2 text-[14px] text-muted">
            Bugungi 3 ta katta vazifani yozing va ustuvorlik bering. Telegram
            botda ham, saytda ham bir necha sekundda ochiladi.
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
              Saytda ochish
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
              name: "Kunlik rejani qanday tuzish kerak",
              description: post.description,
              inLanguage: "uz",
              totalTime: "PT15M",
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
