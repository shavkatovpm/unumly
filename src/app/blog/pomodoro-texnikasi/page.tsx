import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_PATHS, blogAlternates, getBlogPost } from "@/lib/blog-posts";
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
const post = getBlogPost("pomodoro-texnikasi")!;
const UPDATED = "2026-07-31";

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  keywords: [
    "pomodoro texnikasi",
    "pomodoro",
    "25 daqiqa fokus",
    "diqqatni jamlash",
    "o'qishga fokus",
    "taymer usuli",
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

const STEPS: Step[] = [
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
    text: "Email kelmasin, telefon ovozsiz, ijtimoiy tarmoqlar yopiq. Kimdir gaplashmoqchi bo'lsa: «25 daqiqadan keyin» deb javob bering.",
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

const FAQ: QA[] = [
  {
    q: "Pomodoro nima uchun aynan 25 daqiqa?",
    a: "Francesco Cirillo bu vaqtni o'z tajribasi orqali tanlagan — yetarli darajada uzun bo'lib, jiddiy ishga ulgursin, lekin shunchalik qisqaki, e'tibor susaymasin. Ba'zilarga 25 kam, ba'zilarga ko'p tuyuladi: 20 yoki 45 daqiqali variantlar ham bor.",
  },
  {
    q: "Ish vaqtida boshqalar gaplashsa nima qilish kerak?",
    a: "Eng samarali javob: «25 daqiqadan keyin to'liq diqqat bilan tinglayman». Aksariyat hollarda odam kuta oladi. Shoshilinch bo'lsa — pomodoroni to'xtating va keyin yangidan boshlang (yarmidan davom etmang).",
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
    a: "Ha, ayniqsa boshlash qiyin bo'lganda. «4 soat o'tirib o'qiyman» o'rniga «bitta pomodoro o'qib ko'raman» deyish ancha yengilroq tuyuladi. Bir necha pomodorodan keyin esa odat shakllanadi.",
  },
  {
    q: "Pomodoro ilova kerakmi yoki telefon taymeri yetarli?",
    a: "Boshlovchi uchun oddiy telefon taymeri yetadi. Ilova faqat shunda kerak: pomodorolar tarixi, vazifa bilan bog'lanish va statistikani ko'rmoqchi bo'lsangiz. Ilovaga pul to'lashdan oldin kamida 2 hafta oddiy taymer bilan sinab ko'ring.",
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
      h1="Pomodoro texnikasi: 25 daqiqalik fokus sessiyasi"
      answer={
        <>
          <strong className="text-foreground">Qisqa javob:</strong> Pomodoro —
          ish 25 daqiqalik fokus sessiyalariga (har biri &quot;pomodoro&quot;)
          bo&apos;linadigan vaqt boshqarish usuli. Har sessiya orasida 5 daqiqa
          dam beriladi, 4 ta pomodorodan keyin 15–30 daqiqalik uzun dam. Texnika
          1980-yillar oxirida Francesco Cirillo tomonidan ishlab chiqilgan.
        </>
      }
      faq={FAQ}
      schema={[
        howToSchema(
          "uz",
          "Pomodoro texnikasini qanday qo'llash kerak",
          "25 daqiqalik fokus sessiyalari yordamida vazifalarni bajarish bo'yicha 5 qadamli qo'llanma.",
          STEPS,
          "PT25M",
        ),
      ]}
      cta={{
        eyebrow: "Boshlash",
        title: "Birinchi Pomodoroni hozir boshlang",
        text: "Bitta vazifani tanlang, 25 daqiqalik taymerni qo'ying va faqat shu vazifa bilan ishlang. Vazifani esa Unumly Bugun bo'limida belgilab qo'ying.",
        botLabel: "Telegram botda boshlash",
        siteLabel: "Saytda Bugunni ochish",
        siteHref: "/bugun",
      }}
    >
      <Section title="Pomodoro nima?">
        <p className="text-muted">
          Pomodoro texnikasi — 1980-yillar oxirida italiyalik tadqiqotchi
          Francesco Cirillo tomonidan ishlab chiqilgan oddiy fokus usuli. Asosi:
          ish 25 daqiqalik kichik bloklarga bo&apos;linadi (har biri
          &quot;pomodoro&quot; deyiladi), bloklar orasida 5 daqiqalik dam
          beriladi (manba:{" "}
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
          &quot;Pomodoro&quot; italyancha &quot;pomidor&quot; degani —
          Cirillo&apos;ning oshxonadagi pomidor shaklidagi taymeridan kelib
          chiqqan. Texnikaning nomi shundan.
        </p>
      </Section>

      <Section title="5 qadamda Pomodoro">
        <Steps steps={STEPS} />
      </Section>

      <Section title="Qachon foydali?">
        <ul className="space-y-2 text-muted">
          <li>
            <strong className="text-foreground">Murakkab vazifalar</strong> —
            boshlash qiyin bo&apos;lganda, &quot;atigi 25 daqiqa&quot; deyish
            psixologik to&apos;siqni kamaytiradi.
          </li>
          <li>
            <strong className="text-foreground">E&apos;tibor tarqalganda</strong>{" "}
            — taymer cheklov beradi, miya boshqa narsalarga ko&apos;chmaydi.
          </li>
          <li>
            <strong className="text-foreground">Tezda charchaganda</strong> —
            qisqa bloklar va majburiy damlar charchoq kelishini kechiktiradi.
          </li>
          <li>
            <strong className="text-foreground">
              Imtihonga tayyorlanayotganda
            </strong>{" "}
            — uzun o&apos;qish sessiyalariga kichik qadamlardan kirish osonroq.
          </li>
        </ul>
      </Section>

      <Section title="Qachon ishlatmaslik kerak?">
        <p className="text-muted">
          Pomodoro hamma vazifaga mos emas. Ijodiy ishlar (yozish, dizayn,
          musiqa) ko&apos;pincha 90–120 daqiqalik chuqur fokus talab qiladi — 25
          daqiqada endigina &quot;flow&quot; holatiga kirayotganingizda taymer
          chalinadi. Bunday vazifalar uchun{" "}
          <Link href="/blog/time-blocking" className={A}>
            time blocking
          </Link>{" "}
          ko&apos;proq mos.
        </p>
      </Section>

      <Section title="Pomodoro va Time blocking farqi">
        <TableWrap>
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
        </TableWrap>
        <p className="mt-3 text-muted">
          Ikkalasi bir-biriga zid emas — odatda{" "}
          <Link href="/blog/kunlik-rejalashtirish" className={A}>
            kunlik rejada
          </Link>{" "}
          time blocking bilan 90 daqiqalik bloklar belgilanadi, ichida esa
          Pomodoro sessiyalari ishlatiladi.
        </p>
      </Section>

      <Section title="Unumly bilan birga">
        <p className="text-muted">
          Hozircha Unumly&apos;da ichki Pomodoro taymeri yo&apos;q (rejada bor).
          Lekin texnikani qo&apos;llash uchun:{" "}
          <Link href="/bugun" className={A}>
            Bugun
          </Link>{" "}
          bo&apos;limidagi vazifani 25 daqiqalik &quot;pomodoro&quot; deb
          hisoblang, telefon taymerini ishga tushiring va vazifa bajarilganda
          Unumly Telegram bot orqali kelgan eslatmadagi &quot;Bajardim&quot;
          tugmasi bilan yopib qo&apos;ying.
        </p>
      </Section>
    </BlogArticle>
  );
}
