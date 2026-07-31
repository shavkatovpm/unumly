import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_PATHS, blogAlternates, getBlogPost } from "@/lib/blog-posts";
import {
  BlogArticle,
  Section,
  TableWrap,
  type QA,
} from "@/components/blog/article";

const paths = BLOG_PATHS["time-blocking"];
const post = getBlogPost("time-blocking")!;
const UPDATED = "2026-07-31";

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  keywords: [
    "time blocking",
    "vaqt blok usuli",
    "kunni bloklarga bo'lish",
    "chuqur ish",
    "kalendar rejalashtirish",
    "deep work",
  ],
  alternates: blogAlternates(paths, "uz"),
  openGraph: {
    type: "article",
    locale: "uz_UZ",
    title: post.title,
    description: post.description,
    url: `https://unumly.uz${paths.uz}`,
    publishedTime: post.publishedAt,
    modifiedTime: UPDATED,
  },
};

const FAQ: QA[] = [
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
    a: "Kuni butunlay kutilmagan ishlardan iborat odamlarga (qo'ng'iroq markazi operatori, navbatchi shifokor). Bunday ishlarda «qo'riqchi blok» formati ko'proq ishlaydi — kun bo'ylab faqat tanaffus va dam uchun bloklar belgilanadi, qolgani reaktiv.",
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

const A = "text-foreground underline-offset-4 hover:underline";

export default function Page() {
  return (
    <BlogArticle
      lang="uz"
      post={post}
      paths={paths}
      updated={UPDATED}
      h1="Time blocking: vaqt blok usuli nima va qanday ishlatiladi"
      answer={
        <>
          <strong className="text-foreground">Qisqa javob:</strong> Time blocking
          — kun davomidagi har bir soatni oldindan ma&apos;lum vazifa yoki vazifa
          turiga ajratish usuli. &quot;Bugun nimadir qilaman&quot; o&apos;rniga
          &quot;soat 09:00 dan 10:30 gacha hisobotni yozaman&quot; deyiladi.
          Chuqur ish uchun bloklar 90–120 daqiqa; kunning 60–70%i bloklanadi,
          qolgani kutilmagan ishlar uchun bo&apos;sh qoladi.
        </>
      }
      faq={FAQ}
      cta={{
        eyebrow: "Sinab ko'ring",
        title: "Kalendarda birinchi blokni hozir qo'ying",
        text: "Hafta ko'rinishini oching va ertangi 3 ta katta vazifani 90 daqiqalik bloklarga joylashtiring.",
        botLabel: "Telegram botda boshlash",
        siteLabel: "Saytda Kalendarni ochish",
        siteHref: "/kalendar",
      }}
    >
      <Section title="Time blocking nima?">
        <p className="text-muted">
          Time blocking (vaqt bloklash) — kunni soat bloklariga bo&apos;lib
          rejalashtirish texnikasi. Har bir vazifa go&apos;yo yig&apos;ilishdek —
          aniq boshlanish va tugash vaqti bilan kalendarga yoziladi. Sababi
          oddiy: vazifaga aniq vaqt belgilanmagan bo&apos;lsa, u kun davomida
          orqaga suriladi va ko&apos;p hollarda bajarilmaydi.
        </p>
        <p className="mt-3 text-muted">
          Texnikani &quot;Deep Work&quot; muallifi Cal Newport keng
          ommalashtirgan — uning fikricha, taqvimga yozilmagan ish soatlar
          davomida miyada &quot;ochiq tab&quot; bo&apos;lib turadi va fokusni
          susaytiradi (manba:{" "}
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

      <Section title="Qaysi vazifalar uchun mos?">
        <ul className="space-y-2 text-muted">
          <li>
            <strong className="text-foreground">Chuqur ish</strong> — dasturlash,
            yozish, dizayn, o&apos;qish. 90–120 daqiqalik bloklar ideal.
          </li>
          <li>
            <strong className="text-foreground">Yig&apos;ilishlar</strong> — aniq
            boshlanish va tugash vaqti bilan.
          </li>
          <li>
            <strong className="text-foreground">Email va xabarlar</strong> —
            kuniga 1–2 marta, 30 daqiqalik blok ichida. Qolgan vaqt xabardonlar
            yopiq.
          </li>
          <li>
            <strong className="text-foreground">Sport, ovqat, dam</strong> —
            bog&apos;lanmagandek tuyulsa-da, bu bloklar bo&apos;lmasa kun reja
            boshqa narsalar bilan to&apos;ladi.
          </li>
        </ul>
      </Section>

      <Section title="Time blocking, Pomodoro va to'-do farqi">
        <TableWrap>
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
        </TableWrap>
        <p className="mt-3 text-muted">
          Aralash ishlatish odatiy:{" "}
          <Link href="/blog/kunlik-rejalashtirish" className={A}>
            kunlik reja
          </Link>{" "}
          bilan umumiy struktura tuziladi, asosiy ishlar time blocking bilan
          kalendarga ko&apos;chiriladi, har blok ichida esa Pomodoro sessiyalari
          o&apos;tkaziladi.
        </p>
      </Section>

      <Section title="Unumly Kalendarida qanday qo'llaniladi">
        <p className="text-muted">
          Unumly&apos;ning{" "}
          <Link href="/kalendar" className={A}>
            Kalendar
          </Link>{" "}
          bo&apos;limini Hafta yoki Kun ko&apos;rinishida oching. Har bir soat
          slotini bosib yangi vazifa qo&apos;shasiz yoki mavjud vazifani
          drag-and-drop bilan kerakli vaqtga ko&apos;chirasiz. Slotning
          uzunligini tortib vazifaga sarflanadigan vaqtni belgilaysiz; bot
          belgilangan vaqtdan oldin eslatma yuboradi.
        </p>
        <p className="mt-3 text-muted">
          Boshlash uchun: ertaga 3 ta katta vazifani 90 daqiqalik bloklarga
          joylashtiring. Qolgan vaqt — kichik ishlar, dam va yig&apos;ilishlar
          uchun.
        </p>
      </Section>

      <Section title="Eng katta xatolar">
        <ol className="space-y-3 text-muted">
          <li>
            <strong className="text-foreground">100% bloklash.</strong> Kunning
            har bir daqiqasini bloklash — buziluvchan reja. 60–70% bloklang, 30%
            bo&apos;sh qoldiring (kutilmagan ishlar uchun).
          </li>
          <li>
            <strong className="text-foreground">Buferdan voz kechish.</strong>{" "}
            Har bir blok orasiga 10–15 daqiqa bo&apos;sh joy qo&apos;ying —
            blokdan blokga o&apos;tish vaqti, kichik tanaffuslar uchun.
          </li>
          <li>
            <strong className="text-foreground">Optimistik baholash.</strong>{" "}
            Vazifaga sarflanadigan vaqtni kamida 25% ortig&apos;i bilan
            belgilang. Birinchi haftada bu eng katta saboq beradi.
          </li>
        </ol>
        <p className="mt-3 text-muted">
          Bloklar muntazam buzilaversa,{" "}
          <Link href="/blog/teskari-fikrlash" className={A}>
            teskari fikrlash
          </Link>{" "}
          usulini qo&apos;llang: nima buzayotganini ro&apos;yxat qilib, har
          biriga bitta qarshi harakat yozing.
        </p>
      </Section>
    </BlogArticle>
  );
}
