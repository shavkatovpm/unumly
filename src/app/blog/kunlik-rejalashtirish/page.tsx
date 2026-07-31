import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_PATHS, blogAlternates, getBlogPost } from "@/lib/blog-posts";
import {
  BlogArticle,
  Section,
  Steps,
  howToSchema,
  type QA,
  type Step,
} from "@/components/blog/article";

const paths = BLOG_PATHS["kunlik-rejalashtirish"];
const post = getBlogPost("kunlik-rejalashtirish")!;
const UPDATED = "2026-07-31";

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  keywords: [
    "kunlik rejalashtirish",
    "kunlik reja",
    "kunni rejalashtirish",
    "kun tartibi",
    "vazifalar ro'yxati",
    "samarali kun",
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
    name: "Maqsadni aniqlang",
    text: "Ertaga eng katta uchta natijani yozib qo'ying. Bular kuningiz nima bilan o'lchanishini ko'rsatadi. Boshqa hamma vazifa shu uchta natija atrofida quriladi.",
  },
  {
    name: "Vazifalarni chiqaring",
    text: "Bugun bo'limini oching va xayolingizdagi hamma narsani ro'yxatga kiriting — hatto kichik tuyulganlarini ham. Tartib hozir muhim emas; asosiysi hech narsa miyangizda qolmasligi.",
  },
  {
    name: "Muhimlik darajasini belgilang",
    text: "Har vazifaga ustuvorlik bering. Bir kunda ikki-uchtadan ko'p «yuqori muhimlikdagi» vazifa bo'lmasin — aks holda ulardan birortasini ham bajara olmaysiz.",
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

const FAQ: QA[] = [
  {
    q: "Kunlik reja tuzishga qancha vaqt sarflash kerak?",
    a: "10–20 daqiqa yetadi. Kechqurun 10–15 daqiqada ertaga ro'yxat tayyorlanadi; ertalab esa 5 daqiqada qayta ko'rib chiqiladi. Bundan ko'p vaqt sarflasangiz, reja ishingizni boshqaradigan bo'lib qoladi — bu kerak emas.",
  },
  {
    q: "Reja ertalab tuzilsinmi yoki kechqurun?",
    a: "Kechqurun afzalroq. Uyqu davomida miya vazifalarni ongsiz qayta ishlaydi va ertalab darrov ishga kirishasiz. Ertalab tuzish ham yomon emas, lekin «qaerdan boshlasam» muammosi yuzaga keladi.",
  },
  {
    q: "Bir kunda nechta vazifa qo'shish maqbul?",
    a: "Odatda 5–7 ta. Bundan ko'pi kun oxirida ko'chiriladi va «ulgurmadim» hissini qoldiradi. Ichidan 2–3 tasi yuqori muhimlikda, qolgani ikkilamchi bo'lsin.",
  },
  {
    q: "Reja bajarilmasa nima qilish kerak?",
    a: "Ko'chirish — xato emas, odat. Bajarilmagan vazifani ertangi kunga ko'chiring va sabab haqida bitta jumla yozing: vaqt yetmadimi, energiya yetmadimi yoki vazifa noaniq edimi? Shu joy o'sish manbai.",
  },
  {
    q: "Qog'oz kundalik yaxshimi yoki ilova?",
    a: "Har biri o'z o'rnida. Qog'oz tafakkurni sekinlashtiradi va fikrlashga yordam beradi. Ilova esa eslatma, sinxronizatsiya va ko'chirishni avtomatik bajaradi. Boshlovchi uchun ilova yengilroq — o'zi eslatib turadi.",
  },
  {
    q: "Kun yig'ilishlarga to'la bo'lsa qanday rejalashtirish kerak?",
    a: "Avval yig'ilishlarni qat'iy nuqta sifatida joylashtiring, oralig'iga esa muhim ish uchun bitta-ikkita blok qo'ying. Mayda ishlarni tarqatmasdan, bitta yarim soatlik blokka yig'ib qo'ying.",
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
      h1="Kunlik rejalashtirish: 5 qadamda samarali kun"
      answer={
        <>
          <strong className="text-foreground">Qisqa javob:</strong> Kunlik
          rejalashtirish — bugungi yoki ertangi 24 soatni aniq vazifalarga
          ajratish jarayoni. Samarali reja 10–20 daqiqada tuziladi (kechqurun
          yoki ertalab) va beshta qadamdan iborat: maqsadni aniqlash, vazifalarni
          chiqarish, muhimlikni belgilash, vaqt belgilash, kun yakunida
          sharhlash. Bir kunga 5–7 tadan ko&apos;p vazifa qo&apos;yilmaydi.
        </>
      }
      faq={FAQ}
      schema={[
        howToSchema(
          "uz",
          "Kunlik rejani qanday tuzish kerak",
          post.description,
          STEPS,
          "PT15M",
        ),
      ]}
      cta={{
        eyebrow: "Boshlash",
        title: "Birinchi rejangizni hozir tuzing",
        text: "Bugungi 3 ta katta vazifani yozing va ustuvorlik bering. Telegram botda ham, saytda ham bir necha sekundda ochiladi.",
        botLabel: "Telegram botda boshlash",
        siteLabel: "Saytda ochish",
        siteHref: "/bugun",
      }}
    >
      <p>
        Ko&apos;pchilik kunni <em>&quot;nima qilsam ekan&quot;</em> savoli bilan
        boshlaydi va kechqurun <em>&quot;nimaga ulgurmadim&quot;</em> savoli
        bilan tugatadi. Yaxshi tuzilgan kun rejasi shu ikki savolni ham hal
        qiladi.
      </p>

      <Section title="Kunlik rejalashtirish nima?">
        <p className="text-muted">
          Kunlik rejalashtirish — kunning oldindan tuzilgan vazifa va vaqt
          strukturasi. Maqsadi sodda: e&apos;tiborni muhim ishlarga
          yo&apos;naltirish, kichik narsalarga vaqt yo&apos;qotmaslik va kun
          yakunida natijani aniq o&apos;lchash. Aniq vaqt bilan bog&apos;lash
          uchun{" "}
          <Link href="/blog/time-blocking" className={A}>
            time blocking
          </Link>{" "}
          ishlatiladi; bitta vazifaga fokuslanish uchun esa{" "}
          <Link href="/blog/pomodoro-texnikasi" className={A}>
            Pomodoro
          </Link>{" "}
          texnikasidan foydalaniladi.
        </p>
      </Section>

      <Section title="5 qadamda samarali kun">
        <Steps steps={STEPS} />
      </Section>

      <Section title="Eng keng tarqalgan xato">
        <p className="text-muted">
          Bir kunga 15–20 ta vazifa yozib qo&apos;yish. Haqiqiy bajariladigan
          vazifalar soni odatda 5–7 ta atrofida. Qolganlari kun oxirida
          ko&apos;chiriladi va sekin-asta &quot;bajarilmadim&quot;
          tuyg&apos;usini hosil qiladi. Vazifalar sonini cheklash — rejaning eng
          muhim qoidasi.
        </p>
      </Section>

      <Section title="Qachon rejalashtirish kerak?">
        <p className="text-muted">
          Eng yaxshi vaqt — oldingi kun kechqurun (10–15 daqiqa) yoki ertasi kuni
          ertalab (15–20 daqiqa). Kechqurun rejalashtirsangiz, uyqu davomida miya
          vazifalarni &quot;pishirib&quot; qo&apos;yadi va ertalab darrov ishga
          kirishasiz.
        </p>
      </Section>

      <Section title="Unumly'da qanday ko'rinadi">
        <p className="text-muted">
          Unumly&apos;ning{" "}
          <Link href="/bugun" className={A}>
            Bugun
          </Link>{" "}
          bo&apos;limida vazifa qo&apos;shganda muhimlik darajasi va vaqt birga
          so&apos;raladi. Belgilangan vaqtda Telegram bot eslatma yuboradi —
          &quot;Bajardim&quot; tugmasi orqali vazifani to&apos;g&apos;ridan-to&apos;g&apos;ri
          bot ichida yopib qo&apos;ysangiz bo&apos;ladi. Shunda 5-qadam (kun
          nihoyasida sharhlash) tabiiy ravishda kun davomida bajarilib boradi.
        </p>
        <p className="mt-3 text-muted">
          Reja muntazam buzilaversa, ikki narsani ko&apos;rib chiqing: umumiy
          tizim uchun{" "}
          <Link href="/blog/vaqtni-boshqarish" className={A}>
            vaqtni boshqarish qo&apos;llanmasi
          </Link>{" "}
          va rejani buzadigan sabablarni oldindan topish uchun{" "}
          <Link href="/blog/teskari-fikrlash" className={A}>
            teskari fikrlash
          </Link>
          .
        </p>
      </Section>
    </BlogArticle>
  );
}
