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

const paths = BLOG_PATHS["vaqtni-boshqarish"];
const post = getBlogPost("vaqtni-boshqarish")!;
const UPDATED = "2026-07-31";

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  keywords: [
    "vaqtni boshqarish",
    "vaqt boshqarish usullari",
    "time management o'zbekcha",
    "rejalashtirish",
    "samaradorlik",
    "eisenhower matritsasi",
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
];

const FAQ: QA[] = [
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

const A = "text-foreground underline-offset-4 hover:underline";

export default function Page() {
  return (
    <BlogArticle
      lang="uz"
      post={post}
      paths={paths}
      updated={UPDATED}
      h1="Vaqtni boshqarish: boshlovchilar uchun to'liq qo'llanma"
      answer={
        <>
          <strong className="text-foreground">Qisqa javob:</strong> Vaqtni
          boshqarish — vaqtingizni qaysi ishlarga sarflashni ongli rejalashtirish
          ko&apos;nikmasi. Boshlash uchun barcha vazifalarni bitta ro&apos;yxatga
          yozing, kuniga 3 ta eng muhimini tanlang va har biriga kalendarda aniq
          vaqt ajrating. Maqsad ko&apos;proq ishlash emas — muhim ishlarni
          o&apos;z vaqtida bajarish.
        </>
      }
      faq={FAQ}
      schema={[
        howToSchema(
          "uz",
          "Vaqtni boshqarishni qanday boshlash kerak",
          "Boshlovchilar uchun vaqtni boshqarishni boshlash bo'yicha 7 qadamli qo'llanma.",
          STEPS,
        ),
      ]}
      cta={{
        eyebrow: "Boshlash",
        title: "Vaqtingizni bugundan boshqaring",
        text: "Birinchi qadam oddiy: bugungi 3 ta asosiy vazifani yozing. Buni bot yoki saytda boshlang — qaysi biri qulay bo'lsa.",
        botLabel: "Telegram botda boshlash",
        siteLabel: "Saytda Bugunni ochish",
        siteHref: "/bugun",
      }}
    >
      <Section title="Vaqtni boshqarish nima?">
        <p className="text-muted">
          Vaqtni boshqarish — bu vaqtingizni qaysi ishlarga sarflashni
          rejalashtirish, tartibga solish va nazorat qilish ko&apos;nikmasi.
          Oddiy qilib aytganda: kun cheklangan, ishlar esa ko&apos;p — shuning
          uchun qaysi biriga, qachon va qancha vaqt berishni siz tanlaysiz.
        </p>
        <p className="mt-3 text-muted">
          Muhim nuqta: vaqtni boshqarish vaqtni «ko&apos;paytirish» emas.
          Hammaning kuni 24 soat. Farq shundaki, bu 24 soatni ongli
          taqsimlaysizmi yoki kun sizni o&apos;zi bilan olib ketadimi. Birinchi
          holatda muhim ishlar bajariladi, ikkinchisida esa kun oxirida «nima
          qildim?» degan savol qoladi.
        </p>
      </Section>

      <Section title="Vaqtni boshqarish nega muhim?">
        <p className="text-muted">
          Men o&apos;zim ko&apos;p yillar «xotiramga ishonib» yashadim — hamma
          ish boshda edi. Natija: tunda yodga tushgan vazifalar, esdan chiqqan
          va&apos;dalar, doimiy ichki bezovtalik. Ishlarni yozib borishni
          boshlaganimda eng katta o&apos;zgarish samaradorlikda emas, tinchlikda
          bo&apos;ldi — bosh bo&apos;shadi.
        </p>
        <p className="mt-3 text-muted">
          Yaxshi vaqtni boshqarish uchta narsani beradi:{" "}
          <strong className="text-foreground">aniqlik</strong> (nima qilishni
          bilasiz), <strong className="text-foreground">xotirjamlik</strong> (hech
          narsa unutilmaydi degan ishonch) va{" "}
          <strong className="text-foreground">erkinlik</strong> (dam olishga ham
          vaqt qoladi, chunki ish nazoratda).
        </p>
      </Section>

      <Section title="7 qadamda vaqtni boshqarishni boshlash">
        <Steps steps={STEPS} />
      </Section>

      <Section title="Mashhur vaqtni boshqarish usullari">
        <p className="text-muted">
          Usul — bu yuqoridagi qadamlarni amalga oshirishning aniq shakli. Boshda
          bittasini tanlab, sinab ko&apos;ring; keyin o&apos;zingizga mosini
          aralashtirasiz.
        </p>
        <ul className="mt-3 space-y-3 text-muted">
          <li>
            <strong className="text-foreground">Time blocking</strong> — kun soat
            bloklariga bo&apos;linadi, har blok bitta ishga ajratiladi. Batafsil:{" "}
            <Link href="/blog/time-blocking" className={A}>
              time blocking — vaqt blok usuli
            </Link>
            .
          </li>
          <li>
            <strong className="text-foreground">Pomodoro</strong> — ish 25
            daqiqalik fokus sessiyalariga bo&apos;linadi. Batafsil:{" "}
            <Link href="/blog/pomodoro-texnikasi" className={A}>
              Pomodoro texnikasi
            </Link>
            .
          </li>
          <li>
            <strong className="text-foreground">Eisenhower matritsasi</strong> —
            ishlar «muhim/shoshilinch» bo&apos;yicha to&apos;rt katakka
            ajratiladi (manba:{" "}
            <a
              href="https://en.wikipedia.org/wiki/Time_management#The_Eisenhower_Method"
              rel="noopener nofollow"
              target="_blank"
              className={A}
            >
              Wikipedia
            </a>
            ).
          </li>
          <li>
            <strong className="text-foreground">Kunlik reja</strong> — eng oddiy
            va asosiy usul: kunni 3–5 vazifaga bo&apos;lib boshlash. Batafsil:{" "}
            <Link href="/blog/kunlik-rejalashtirish" className={A}>
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
            className={A}
          >
            Pareto tamoyili
          </a>{" "}
          — natijalarning katta qismi ozchilik ishlardan keladi. Vaqtni
          boshqarishning mohiyati ham shu ozchilik muhim ishni topib, ularga
          ustunlik berishdir.
        </p>
      </Section>

      <Section title="Boshlovchilar qiladigan asosiy xatolar">
        <ul className="space-y-3 text-muted">
          {MISTAKES.map((m) => (
            <li key={m.title}>
              <strong className="text-foreground">{m.title}</strong> — {m.text}
            </li>
          ))}
          <li>
            <strong className="text-foreground">
              Vazifa hajmini noto&apos;g&apos;ri baholash
            </strong>{" "}
            — ish ajratilgan vaqtni to&apos;ldirib kengayadi. Shuning uchun har
            ishga aniq, biroz kamroq vaqt belgilang — bu{" "}
            <a
              href="https://en.wikipedia.org/wiki/Parkinson%27s_law"
              rel="noopener nofollow"
              target="_blank"
              className={A}
            >
              Parkinson qonuni
            </a>{" "}
            deb ataladi.
          </li>
        </ul>
      </Section>

      <Section title="Qaysi usulni tanlash kerak?">
        <TableWrap>
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
              <td className="py-2.5">
                «Atigi 25 daqiqa» to&apos;siqni kamaytiradi
              </td>
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
        </TableWrap>
      </Section>

      <Section title="Unumly bilan vaqtni boshqarish">
        <p className="text-muted">
          Yuqoridagi qadamlarni qog&apos;ozda ham qilsa bo&apos;ladi, lekin
          ro&apos;yxat va eslatmalarni bir joyda tutish osonroq.{" "}
          <Link href="/bugun" className={A}>
            Unumly Bugun
          </Link>{" "}
          bo&apos;limida kuningizni 3 ta asosiy vazifadan boshlaysiz,{" "}
          <Link href="/kalendar" className={A}>
            Kalendarda
          </Link>{" "}
          esa ularga vaqt bloklarini ajratasiz. Vazifa vaqti kelganda Telegram
          bot eslatma yuboradi va siz &quot;Bajardim&quot; tugmasi bilan
          yopasiz.
        </p>
        <p className="mt-3 text-muted">
          Unumly shuningdek kunlik vazifalarni haftalik, oylik va yillik rejalar
          bilan bog&apos;laydi — ya&apos;ni bugungi ish katta maqsadning bir
          bo&apos;lagi ekanini ko&apos;rasiz. Mahsulot haqida batafsil:{" "}
          <Link href="/haqida" className={A}>
            Unumly haqida
          </Link>
          . Reja yarim yo&apos;lda qolmasligi uchun{" "}
          <Link href="/blog/teskari-fikrlash" className={A}>
            teskari fikrlash
          </Link>{" "}
          usulini ham ko&apos;rib chiqing.
        </p>
      </Section>
    </BlogArticle>
  );
}
