import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { getBlogPost } from "@/lib/blog-posts";

const SLUG = "vaqtni-boshqarish";
const post = getBlogPost(SLUG)!;
const URL = `https://unumly.uz/blog/${SLUG}`;
const UPDATED = "2026-06-17";
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
    name: "Hamma ishni bitta joyga yozib oling",
    text: "Boshda rejalashtirish emas — bo'shatish. Miyangizdagi barcha vazifalarni, «keyin qilaman» deganlaringizni bitta ro'yxatga tushiring. Yodda saqlash kuch talab qiladi; qog'ozga yoki ilovaga chiqargan vazifa boshni bo'shatadi.",
  },
  {
    name: "Har bir vazifaga «nima natija?» degan savolni bering",
    text: "«Loyiha ustida ishlash» — bu vazifa emas, mavzu. «Taqdimotning birinchi 3 slaydini yozish» — mana bu vazifa. Aniq, tugaydigan va belgilash mumkin bo'lgan ishlarga bo'ling.",
  },
  {
    name: "Muhimni shoshilinchdan ajrating",
    text: "Hamma ish bir xil emas. Qaysi biri sizni maqsadga yaqinlashtiradi (muhim), qaysi biri shunchaki «hozir» talab qiladi (shoshilinch)? Ko'pchilik kun bo'yi shoshilinch ishlar ortidan yuguradi, muhimlari esa qoladi.",
  },
  {
    name: "Kuniga 3 ta asosiy vazifa tanlang",
    text: "Uzun ro'yxat ruhni tushiradi. Ertalab faqat 3 ta eng muhim ishni belgilang — kun shulardan iborat. Qolgani bajarilsa — bonus. Bu kichik chegara aslida ko'proq ish bitirishga olib keladi.",
  },
  {
    name: "Vazifalarga kun davomida vaqt ajrating",
    text: "«Bugun qachondir qilaman» degan ish ko'pincha qilinmaydi. Har vazifaga kalendarda aniq vaqt bo'ling — masalan, 10:00–11:00 hisobot. Bu usul time blocking deyiladi va e'tiborni bitta ishga qaratadi.",
  },
  {
    name: "Bitta ish bilan ishlang, telefonni uzoqlashtiring",
    text: "Bir vaqtda bir necha ishni qilish (multitasking) samaradorlikni oshirmaydi, balki har safar diqqatni qaytadan yig'ishga vaqt ketadi. Bildirishnomalarni o'chiring, telefonni boshqa xonaga qo'ying.",
  },
  {
    name: "Kun oxirida 5 daqiqa sharhlang",
    text: "Nima bitdi, nima qoldi, nega qoldi? Bu qisqa sharh ertangi kunni rejalashtirishni osonlashtiradi va vaqtingiz qayerga ketayotganini ko'rsatadi. Vaqtni boshqarish — bir martalik harakat emas, takrorlanadigan odat.",
  },
];

const MISTAKES = [
  {
    title: "Hammasini bir kunga tiqish",
    text: "10 soatlik ishni 8 soatlik kunga rejalashtirish — kechikishning kafolati. Kam rejalang, bajaring, keyin qo'shing.",
  },
  {
    title: "Dam olishni rejaga kiritmaslik",
    text: "Tanaffussiz kun samaradorlikni oshirmaydi. Damni ham vazifa kabi belgilang — aks holda u baribir o'g'rincha vaqt sifatida keladi.",
  },
  {
    title: "Mukammal tizim qidirish",
    text: "Eng to'g'ri ilova yoki uslubni izlab haftalar ketadi. Oddiy ro'yxatdan boshlang; tizim ishlatgan sari shakllanadi.",
  },
  {
    title: "Vazifa hajmini noto'g'ri baholash",
    text: "Ish ajratilgan vaqtni to'ldirib kengayadi. Shuning uchun har ishga aniq, biroz kamroq vaqt belgilang — bu Parkinson qonuni deb ataladi.",
  },
];

const FAQ = [
  {
    q: "Vaqtni boshqarish nima?",
    a: "Vaqtni boshqarish — vaqtingizni qaysi ishlarga sarflashni ongli ravishda rejalashtirish va nazorat qilish ko'nikmasi. Maqsad — ko'proq ishlash emas, balki muhim ishlarni o'z vaqtida bajarish va keraksiz shoshilinchlikni kamaytirish.",
  },
  {
    q: "Vaqtni boshqarishni qayerdan boshlash kerak?",
    a: "Eng oddiy qadam — barcha vazifalarni bitta ro'yxatga yozish. Keyin ulardan kuniga 3 ta eng muhimini tanlang va shularga vaqt ajrating. Murakkab tizimlar keyin keladi; boshda muhimi — ishlarni boshdan chiqarib, ko'rinadigan qilish.",
  },
  {
    q: "Eng yaxshi vaqtni boshqarish usuli qaysi?",
    a: "Hamma uchun yagona «eng yaxshi» usul yo'q. Boshlash qiyin bo'lsa — Pomodoro; kun tartibsiz bo'lsa — time blocking; ishlar ko'payib ketsa — Eisenhower matritsasi. Ko'pchilik ularni aralashtirib ishlatadi: kunni bloklarga bo'lib, ichida Pomodoro sessiyalari qiladi.",
  },
  {
    q: "Vaqtni boshqarish bilan ko'proq ishlash kerakmi?",
    a: "Yo'q. Aksincha — yaxshi vaqtni boshqarish keraksiz ishlarni kamaytiradi va dam olishga ham joy qoldiradi. Maqsad band ko'rinish emas, balki muhim natijalarga erishish.",
  },
  {
    q: "To-do ro'yxati nega ishlamaydi?",
    a: "Ko'pincha sabab — ro'yxat juda uzun va vazifalar noaniq («loyiha» kabi mavzular). Yechim: vazifalarni aniq, tugaydigan qadamlarga bo'ling va har biriga kalendarda vaqt ajrating. Vaqtsiz ro'yxat shunchaki istaklar to'plamiga aylanadi.",
  },
  {
    q: "Talaba uchun vaqtni boshqarish boshqacha bo'ladimi?",
    a: "Asoslar bir xil, lekin talabaga imtihon sanalari va dars jadvali bo'yicha rejalash qulayroq. Katta mavzularni kichik o'qish bloklariga bo'lish va Pomodoro bilan boshlash ayniqsa yordam beradi.",
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
              Vaqtni boshqarish — vaqtingizni qaysi ishlarga sarflashni ongli
              rejalashtirish ko&apos;nikmasi. Boshlash uchun barcha
              vazifalarni bitta ro&apos;yxatga yozing, kuniga 3 ta eng muhimini
              tanlang va har biriga kalendarda aniq vaqt ajrating. Maqsad
              ko&apos;proq ishlash emas — muhim ishlarni o&apos;z vaqtida
              bajarish.
            </p>
          </aside>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Vaqtni boshqarish nima?
            </h2>
            <p className="text-muted">
              Vaqtni boshqarish — bu vaqtingizni qaysi ishlarga sarflashni
              rejalashtirish, tartibga solish va nazorat qilish ko&apos;nikmasi.
              Oddiy qilib aytganda: kun cheklangan, ishlar esa ko&apos;p —
              shuning uchun qaysi biriga, qachon va qancha vaqt berishni siz
              tanlaysiz.
            </p>
            <p className="mt-3 text-muted">
              Muhim nuqta: vaqtni boshqarish vaqtni «ko&apos;paytirish» emas.
              Hammaning kuni 24 soat. Farq shundaki, bu 24 soatni ongli
              taqsimlaysizmi yoki kun sizni o&apos;zi bilan olib ketadimi.
              Birinchi holatda muhim ishlar bajariladi, ikkinchisida esa kun
              oxirida «nima qildim?» degan savol qoladi.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Vaqtni boshqarish nega muhim?
            </h2>
            <p className="text-muted">
              Men o&apos;zim ko&apos;p yillar «xotiramga ishonib» yashadim —
              hamma ish boshda edi. Natija: tunda yodga tushgan vazifalar, esdan
              chiqqan va&apos;dalar, doimiy ichki bezovtalik. Ishlarni yozib
              borishni boshlaganimda eng katta o&apos;zgarish samaradorlikda
              emas, tinchlikda bo&apos;ldi — bosh bo&apos;shadi.
            </p>
            <p className="mt-3 text-muted">
              Yaxshi vaqtni boshqarish uchta narsani beradi:{" "}
              <strong className="text-foreground">aniqlik</strong> (nima
              qilishni bilasiz),{" "}
              <strong className="text-foreground">xotirjamlik</strong> (hech
              narsa unutilmaydi degan ishonch) va{" "}
              <strong className="text-foreground">erkinlik</strong> (dam
              olishga ham vaqt qoladi, chunki ish nazoratda). Bu band
              ko&apos;rinish haqida emas — kerakli ishni o&apos;z vaqtida
              qilish haqida.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              7 qadamda vaqtni boshqarishni boshlash
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
              Mashhur vaqtni boshqarish usullari
            </h2>
            <p className="text-muted">
              Usul — bu yuqoridagi qadamlarni amalga oshirishning aniq shakli.
              Boshda bittasini tanlab, sinab ko&apos;ring; keyin
              o&apos;zingizga mosini aralashtirasiz.
            </p>
            <ul className="mt-3 space-y-3 text-muted">
              <li>
                <strong className="text-foreground">Time blocking</strong> —
                kun soat bloklariga bo&apos;linadi, har blok bitta ishga
                ajratiladi. Tartibsiz kunlar uchun ayni muddao. Batafsil:{" "}
                <Link
                  href="/blog/time-blocking"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  time blocking — vaqt blok usuli
                </Link>
                .
              </li>
              <li>
                <strong className="text-foreground">Pomodoro</strong> — ish 25
                daqiqalik fokus sessiyalariga bo&apos;linadi. Boshlash qiyin
                bo&apos;lganda yaxshi ishlaydi. Batafsil:{" "}
                <Link
                  href="/blog/pomodoro-texnikasi"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Pomodoro texnikasi
                </Link>
                .
              </li>
              <li>
                <strong className="text-foreground">
                  Eisenhower matritsasi
                </strong>{" "}
                — ishlar «muhim/shoshilinch» bo&apos;yicha to&apos;rt katakka
                ajratiladi, shunda nimani qilish, nimani keyinga qoldirish
                ko&apos;rinadi (manba:{" "}
                <a
                  href="https://en.wikipedia.org/wiki/Time_management#The_Eisenhower_Method"
                  rel="noopener nofollow"
                  target="_blank"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Wikipedia
                </a>
                ).
              </li>
              <li>
                <strong className="text-foreground">Kunlik reja</strong> — eng
                oddiy va asosiy usul: kunni 3–5 vazifaga bo&apos;lib boshlash.
                Batafsil:{" "}
                <Link
                  href="/blog/kunlik-rejalashtirish"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  kunlik rejalashtirish
                </Link>
                .
              </li>
            </ul>
            <p className="mt-3 text-muted">
              Bularning ostida bitta tamoyil yotadi:{" "}
              <a
                href="https://en.wikipedia.org/wiki/Pareto_principle"
                rel="noopener nofollow"
                target="_blank"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Pareto tamoyili
              </a>{" "}
              — natijalarning katta qismi ozchilik ishlardan keladi. Vaqtni
              boshqarishning mohiyati ham shu ozchilik muhim ishni topib,
              ularga ustunlik berishdir.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Boshlovchilar qiladigan asosiy xatolar
            </h2>
            <ul className="space-y-3 text-muted">
              {MISTAKES.map((m) => (
                <li key={m.title}>
                  <strong className="text-foreground">{m.title}</strong> —{" "}
                  {m.text}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Qaysi usulni tanlash kerak?
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[14.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-2 pr-3 font-medium">Holat</th>
                    <th className="py-2 pr-3 font-medium">Mos usul</th>
                    <th className="py-2 font-medium">Nega</th>
                  </tr>
                </thead>
                <tbody className="text-muted">
                  <tr className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      Boshlash qiyin
                    </td>
                    <td className="py-2.5 pr-3">Pomodoro</td>
                    <td className="py-2.5">«Atigi 25 daqiqa» to&apos;siqni kamaytiradi</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      Kun tartibsiz
                    </td>
                    <td className="py-2.5 pr-3">Time blocking</td>
                    <td className="py-2.5">Har ishga aniq vaqt belgilanadi</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      Ish juda ko&apos;p
                    </td>
                    <td className="py-2.5 pr-3">Eisenhower</td>
                    <td className="py-2.5">Muhimni shoshilinchdan ajratadi</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      Endi boshlayapsiz
                    </td>
                    <td className="py-2.5 pr-3">Kunlik reja</td>
                    <td className="py-2.5">Eng oddiy, kuniga 3 vazifa yetadi</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Unumly bilan vaqtni boshqarish
            </h2>
            <p className="text-muted">
              Yuqoridagi qadamlarni qog&apos;ozda ham qilsa bo&apos;ladi, lekin
              ro&apos;yxat va eslatmalarni bir joyda tutish osonroq.{" "}
              <Link
                href="/bugun"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Unumly Bugun
              </Link>{" "}
              bo&apos;limida kuningizni 3 ta asosiy vazifadan boshlaysiz,
              Kalendarda esa ularga vaqt bloklarini ajratasiz. Vazifa vaqti
              kelganda Telegram bot eslatma yuboradi va siz to&apos;g&apos;ridan-to&apos;g&apos;ri
              &quot;Bajardim&quot; tugmasi bilan yopasiz — telefoningiz baribir
              doim yoningizda.
            </p>
            <p className="mt-3 text-muted">
              Unumly shuningdek kunlik vazifalarni haftalik, oylik va yillik
              rejalar bilan bog&apos;laydi — ya&apos;ni bugungi ish katta
              maqsadning bir bo&apos;lagi ekanini ko&apos;rasiz. Mahsulot
              haqida batafsil:{" "}
              <Link
                href="/haqida"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Unumly haqida
              </Link>
              .
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
            Vaqtingizni bugundan boshqaring
          </h2>
          <p className="mt-2 text-[14px] text-muted">
            Birinchi qadam oddiy: bugungi 3 ta asosiy vazifani yozing.
            Buni bot yoki saytda boshlang — qaysi biri qulay bo&apos;lsa.
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
              name: "Vaqtni boshqarishni qanday boshlash kerak",
              description:
                "Boshlovchilar uchun vaqtni boshqarishni boshlash bo'yicha 7 qadamli qo'llanma.",
              inLanguage: "uz",
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
