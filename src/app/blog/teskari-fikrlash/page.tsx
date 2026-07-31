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

const paths = BLOG_PATHS["teskari-fikrlash"];
const post = getBlogPost("teskari-fikrlash")!;
const UPDATED = "2026-07-31";

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  keywords: [
    "teskari fikrlash",
    "inversion",
    "teskari fikrlash usuli",
    "premortem",
    "maqsad qo'yish",
    "rejalashtirish",
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
    name: "Maqsadni bitta jumlada yozing",
    text: "Teskari fikrlash noaniq maqsad bilan ishlamaydi. «Sog'lom bo'lish» emas — «kuzgacha haftasiga 3 marta mashq qilish». Nimani buzish mumkinligini bilish uchun avval nima qurayotganingiz aniq bo'lishi kerak.",
  },
  {
    name: "«Buni nima buzadi?» ro'yxatini yozing",
    text: "5-10 daqiqa vaqt oling va filtrsiz yozing. Tashqi sabablar ham (ish grafigi, oila, pul), o'zingizdan keladiganlari ham (dangasalik, unutish, ortiqcha va'da). Bu bosqichda hech narsani «bu bo'lmaydi» deb tashlab yubormang.",
  },
  {
    name: "Ro'yxatni ehtimol va zarar bo'yicha saralang",
    text: "Har bir sabab yoniga ikki savol: bu qanchalik ehtimol? bo'lsa, qanchalik zarar qiladi? Yuqori ehtimol va yuqori zarar bo'lganlari — sizning haqiqiy dushmaningiz. Odatda ular 3-5 tadan oshmaydi.",
  },
  {
    name: "Har bir sababga bitta aniq harakat yozing",
    text: "«Unutaman» — eslatma qo'yaman. «Kechqurun holdan toyaman» — mashqni ertalabga ko'chiraman. «Sherigim tashlab ketadi» — yolg'iz ham bajariladigan variant tayyorlayman. Ro'yxatni yo'q qilish — rejaning birinchi qismi, qo'shimchasi emas.",
  },
  {
    name: "Ro'yxatni haftada bir marta qayta o'qing",
    text: "Yangi to'siqlar yo'lda paydo bo'ladi, eskilari esa yopiladi. Haftalik sharh paytida ro'yxatni ochib chiqing: qaysi biri hali ham tirik? Bu 5 daqiqalik odat maqsadning yarim yo'lda qolishining oldini oladi.",
  },
];

const FAQ: QA[] = [
  {
    q: "Teskari fikrlash nima?",
    a: "Teskari fikrlash (inversion) — muammoni oxiridan, ya'ni muvaffaqiyatsizlik tomonidan boshlab yechish usuli. «Bunga qanday erishaman?» o'rniga «bunga erishishimga nima xalaqit beradi?» deb so'raysiz, javoblar ro'yxatini tuzasiz va rejani shu ro'yxatni yo'q qilishdan boshlaysiz.",
  },
  {
    q: "Teskari fikrlash pessimizmdan nimasi bilan farq qiladi?",
    a: "Pessimist muammolarni sanab to'xtaydi va shu bilan ish tugaydi. Teskari fikrlovchi ham xuddi shu ro'yxatni yozadi, lekin har bir bandning yoniga qarshi harakat qo'yadi. Farq kayfiyatda emas — ro'yxat bilan nima qilinishida.",
  },
  {
    q: "Inversion usulini kim ommalashtirgan?",
    a: "«Har doim teskarisiga aylantir» (man muss immer umkehren) tamoyili nemis matematigi Karl Yakobiga nisbat beriladi. Biznes va qaror qabul qilishda uni Charli Manger keng yoyib yubordi: u har bir masalada avval «qayerda xato qilaman?» degan savoldan boshlashni maslahat bergan.",
  },
  {
    q: "Premortem nima va teskari fikrlashga qanday aloqasi bor?",
    a: "Premortem — jamoa ishni boshlashdan oldin «tasavvur qiling, loyiha butunlay barbod bo'ldi; nega?» deb so'raydigan mashq. Uni psixolog Gari Klayn tavsiya qilgan. Bu teskari fikrlashning jamoaviy shakli: xatolar sodir bo'lgunidan oldin ovoz chiqarib aytiladi.",
  },
  {
    q: "Teskari fikrlashni qachon ishlatmaslik kerak?",
    a: "Yangi g'oya izlayotganda yoki ijodiy ish boshida — u yerda cheklovlar ro'yxati erta to'sqinlik qiladi. Shuningdek ro'yxat 15-20 bandga cho'zilib ketsa, u rejaga emas, xavotirga aylanadi. Eng ta'sirli 3-5 tasini qoldiring, qolganini o'chiring.",
  },
  {
    q: "Ro'yxatdagi hamma sabab ham menga bog'liq bo'lmasa-chi?",
    a: "Nazoratdan tashqaridagi sabablarni alohida belgilang. Ular uchun qarshi harakat emas, zaxira reja yoziladi: «internet uzilsa — oflayn ishlaydigan variant», «mijoz kechiktirsa — ikkinchi manba». Bu ham ro'yxatni yopishning bir usuli.",
  },
  {
    q: "Buni kunlik rejaga qanday qo'shish mumkin?",
    a: "Yangi maqsad qo'yganingizda birinchi vazifa sifatida «Buni nima buzadi?» ro'yxatini yozing. Keyin har bir sababga qarshi harakatni alohida vazifaga aylantiring va vaqt belgilang. Unumly'da bu maqsad ichidagi oddiy vazifalar ko'rinishida saqlanadi.",
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
      h1="Teskari fikrlash: inversion usuli nima va qanday qo'llanadi"
      answer={
        <>
          <strong className="text-foreground">Qisqa javob:</strong> Teskari
          fikrlash — maqsadga qanday erishishni emas, unga erishmaslikning
          sabablarini aniqlash usuli. «Qanday muvaffaqiyat qozonaman?» o&apos;rniga
          «meni nima yiqitadi?» deb so&apos;raysiz. Ikkinchi savol qisqa va aniq
          ro&apos;yxat beradi — rejaning birinchi qismi esa shu ro&apos;yxatni
          yo&apos;q qilish bo&apos;ladi.
        </>
      }
      faq={FAQ}
      schema={[
        howToSchema(
          "uz",
          "Teskari fikrlashni qanday qo'llash kerak",
          "Maqsadga xalaqit beradigan sabablarni topish va ularni yopish bo'yicha 5 qadamli tartib.",
          STEPS,
        ),
      ]}
      cta={{
        eyebrow: "Boshlash",
        title: "«Buni nima buzadi?» ro'yxatini bugun yozing",
        text: "Bitta maqsadni tanlang, uni buzadigan 3 ta sababni yozing va har biriga qarshi bitta vazifa qo'shing. Buni bot yoki saytda boshlang — qaysi biri qulay bo'lsa.",
        botLabel: "Telegram botda boshlash",
        siteLabel: "Saytda Bugunni ochish",
        siteHref: "/bugun",
      }}
    >
      <Section title="Teskari fikrlash nima?">
        <p className="text-muted">
          Teskari fikrlash (ingliz tilida{" "}
          <em className="not-italic text-foreground">inversion</em>) — bu masalani
          oxiridan boshlab yechish usuli. Odatda biz maqsadga qarab yo&apos;l
          izlaymiz. Teskari fikrlashda esa avval muvaffaqiyatsizlikni tasavvur
          qilamiz va uni keltirib chiqargan sabablarni sanaymiz.
        </p>
        <p className="mt-3 text-muted">
          Sabab oddiy: muvaffaqiyat retseptini topish qiyin, muvaffaqiyatsizlik
          sabablarini sanash esa osonroq va aniqroq. To&apos;g&apos;ri yo&apos;l
          bitta emas — o&apos;nlab; ammo yiqitadigan narsalar ko&apos;pincha
          barmoq bilan sanarli.
        </p>
        <p className="mt-3 text-muted">
          Bu yangi fikr emas. Matematik{" "}
          <a
            href="https://en.wikipedia.org/wiki/Carl_Gustav_Jacob_Jacobi"
            rel="noopener nofollow"
            target="_blank"
            className={A}
          >
            Karl Yakobi
          </a>{" "}
          qiyin masalalarni «har doim teskarisiga aylantir» tamoyili bilan
          yechishni maslahat bergan.{" "}
          <a
            href="https://en.wikipedia.org/wiki/Charlie_Munger"
            rel="noopener nofollow"
            target="_blank"
            className={A}
          >
            Charli Manger
          </a>{" "}
          esa buni investitsiya va qaror qabul qilishga olib kirdi: «Men qayerda
          o&apos;lishimni bilsam bo&apos;lgani — o&apos;sha yerga hech qachon
          bormayman».
        </p>
      </Section>

      <Section title="Nega salbiy savol aniqroq javob beradi?">
        <p className="text-muted">
          Ijobiy savol ko&apos;p va noaniq javob beradi. Salbiy savol qisqa va
          aniq ro&apos;yxat beradi. Ro&apos;yxatni yo&apos;q qilish esa — amaliy
          ish, uni bugun boshlash mumkin.
        </p>
        <p className="mt-3 text-muted">
          «Qanday qilib pul yig&apos;aman?» degan savol yuzlab maslahatga olib
          boradi: investitsiya, qo&apos;shimcha daromad, budjet ilovalari,
          moliyaviy kitoblar. Hammasi to&apos;g&apos;ri, lekin qaysi biridan
          boshlash noma&apos;lum.
        </p>
        <p className="mt-3 text-muted">
          «Nima meni pulsiz qoldiradi?» degan savol esa beshtagina javob beradi:
        </p>
        <ol className="mt-3 space-y-2 text-muted">
          <li>1. Rejasiz xarid</li>
          <li>2. Qarz</li>
          <li>3. Zaxira jamg&apos;armaning yo&apos;qligi</li>
          <li>4. Daromadning bitta manbaga bog&apos;liqligi</li>
          <li>5. Xarajatni hisoblamaslik</li>
        </ol>
        <p className="mt-3 text-muted">
          Shu beshtasini yopish — katta natija. E&apos;tibor bering: bu
          ro&apos;yxatning har bir bandi to&apos;g&apos;ridan-to&apos;g&apos;ri
          vazifaga aylanadi. «Investitsiya qilish» esa vazifa emas, mavzu.
          Teskari savolning kuchi ana shunda: u sizni mavzudan harakatga olib
          o&apos;tadi.
        </p>
      </Section>

      <Section title="Teskari fikrlash va pessimizm — farqi nimada?">
        <p className="text-muted">
          Teskari fikrlash ko&apos;pincha pessimizm bilan aralashtiriladi.
          Tashqaridan qaraganda ikkalasi ham yomon narsalarni sanaydi. Farqi esa
          shundaki:{" "}
          <strong className="text-foreground">
            pessimist muammoni sanab to&apos;xtaydi, teskari fikrlovchi esa
            sanab, keyin har birini yopadi.
          </strong>
        </p>
        <p className="mt-3 text-muted">
          Ya&apos;ni ro&apos;yxat — yakun emas, boshlanish. Agar
          yozganlaringizning yoniga bitta ham qarshi harakat qo&apos;ymagan
          bo&apos;lsangiz, siz teskari fikrlamayapsiz — shunchaki
          xavotirlanyapsiz. Bu ikkisini ajratadigan test oddiy: ro&apos;yxatni
          o&apos;qib chiqqach, ertaga qiladigan aniq ishingiz paydo
          bo&apos;ldimi?
        </p>
      </Section>

      <Section title="Teskari fikrlashni 5 qadamda qo'llash">
        <Steps steps={STEPS} />
      </Section>

      <Section title="Amaliy misollar: odatiy savol va teskari savol">
        <p className="mb-3 text-muted">
          Quyidagi jadval bir xil maqsadni ikki savol orqali ko&apos;rsatadi.
          O&apos;ng ustundagi javob har doim aniqroq va tezroq bajariladi.
        </p>
        <TableWrap>
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-3 font-medium">Maqsad</th>
              <th className="py-2 pr-3 font-medium">Odatiy savol</th>
              <th className="py-2 font-medium">Teskari savol va birinchi qadam</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">
                Jamg&apos;arma
              </td>
              <td className="py-2.5 pr-3">Qanday pul yig&apos;aman?</td>
              <td className="py-2.5">
                Nima meni pulsiz qoldiradi? → oyning 1-kunida maosh kelishi bilan
                zaxirani ajratib qo&apos;yish
              </td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">
                Sport odati
              </td>
              <td className="py-2.5 pr-3">Qanday muntazam mashq qilaman?</td>
              <td className="py-2.5">
                Meni mashqdan nima to&apos;xtatadi? → kechki charchoq → mashqni
                ertalabga ko&apos;chirish
              </td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2.5 pr-3 font-medium text-foreground">
                Imtihon
              </td>
              <td className="py-2.5 pr-3">Qanday yaxshi tayyorlanaman?</td>
              <td className="py-2.5">
                Nima meni yiqitadi? → oxirgi kunga qoldirish → mavzularni
                sanalarga bo&apos;lib yozish
              </td>
            </tr>
            <tr>
              <td className="py-2.5 pr-3 font-medium text-foreground">Loyiha</td>
              <td className="py-2.5 pr-3">
                Loyihani qanday muvaffaqiyatli qilaman?
              </td>
              <td className="py-2.5">
                Loyiha nega barbod bo&apos;ladi? → talab noaniqligi → birinchi
                hafta yozma kelishuv
              </td>
            </tr>
          </tbody>
        </TableWrap>
        <p className="mt-3 text-muted">
          Oxirgi qatorda ko&apos;rsatilgan yondashuvning jamoaviy nomi bor —{" "}
          <strong className="text-foreground">premortem</strong>. Loyiha
          boshlanishidan oldin jamoa yig&apos;iladi va «bu ish butunlay barbod
          bo&apos;ldi deb tasavvur qiling; nega?» degan savolga javob yozadi
          (usul tavsifi:{" "}
          <a
            href="https://hbr.org/2007/09/performing-a-project-premortem"
            rel="noopener nofollow"
            target="_blank"
            className={A}
          >
            Harvard Business Review
          </a>
          ). Xatolar sodir bo&apos;lgunidan oldin ovoz chiqarib aytilsa,
          ularning ko&apos;pi umuman sodir bo&apos;lmaydi.
        </p>
      </Section>

      <Section title="Bu usul qayerda ishlamaydi?">
        <p className="text-muted">
          Men o&apos;zim buni bir necha marta noto&apos;g&apos;ri ishlatganman —
          ro&apos;yxat yozganman, keyin shu ro&apos;yxatga qarab ishni butunlay
          boshlamay qo&apos;yganman. Shuning uchun uch chegarani eslatib
          o&apos;taman:
        </p>
        <ul className="mt-3 space-y-3 text-muted">
          <li>
            <strong className="text-foreground">G&apos;oya bosqichida</strong> —
            yangi narsa o&apos;ylab topayotganda cheklovlar ro&apos;yxati erta
            keladi va fikrni bo&apos;g&apos;adi. Avval g&apos;oyani yozing,
            teskari savolni keyin bering.
          </li>
          <li>
            <strong className="text-foreground">Uzun ro&apos;yxat</strong> — 20 ta
            sabab reja emas, xavotir. Ehtimoli va zarari bo&apos;yicha eng kuchli
            3-5 tasini qoldiring.
          </li>
          <li>
            <strong className="text-foreground">
              Harakatsiz ro&apos;yxat
            </strong>{" "}
            — qarshi harakati yozilmagan sabab shunchaki ro&apos;yxatda yotadi va
            kayfiyatni tushiradi. Har bandga bitta vazifa — qoidani buzmang.
          </li>
        </ul>
      </Section>

      <Section title="Teskari rejani Unumly'da qanday yozish mumkin">
        <p className="text-muted">
          Buni daftarda ham qilsa bo&apos;ladi. Faqat bitta muammo bor: «Buni
          nima buzadi?» ro&apos;yxati daftarda bir marta yoziladi-yu, qayta
          ochilmaydi. Ish esa aynan qayta ochishda.
        </p>
        <p className="mt-3 text-muted">
          Unumly&apos;da men buni shunday yuritaman: maqsadni{" "}
          <Link href="/maqsad" className={A}>
            Maqsad
          </Link>{" "}
          bo&apos;limiga yozaman, ostiga esa qadamlar sifatida oddiy maqsadlarni
          emas, qarshi harakatlarni qo&apos;yaman — «oyning 1-kuni zaxirani
          ajratish», «mashqni 07:00 ga ko&apos;chirish». Ular{" "}
          <Link href="/bugun" className={A}>
            Bugun
          </Link>{" "}
          ro&apos;yxatida kunlik vazifa bo&apos;lib chiqadi, vaqti kelganda
          Telegram bot eslatma yuboradi. Ya&apos;ni ro&apos;yxat qog&apos;ozda
          qolib ketmaydi — u kunga tushadi.
        </p>
        <p className="mt-3 text-muted">
          Katta ish bo&apos;lsa,{" "}
          <Link href="/loyiha" className={A}>
            Loyiha
          </Link>{" "}
          bo&apos;limida alohida hujjat ochib, premortem ro&apos;yxatini
          o&apos;sha yerda yuritish qulay. Unumly qanday ishlashi haqida
          batafsil:{" "}
          <Link href="/haqida" className={A}>
            Unumly haqida
          </Link>
          .
        </p>
        <p className="mt-3 text-muted">
          Teskari fikrlash rejalashtirish usullariga qarshi emas — ular bilan
          birga ishlaydi. Ro&apos;yxatni tuzib bo&apos;lgach, qarshi harakatlarga
          vaqt ajratish uchun{" "}
          <Link href="/blog/time-blocking" className={A}>
            time blocking
          </Link>{" "}
          yoki oddiy{" "}
          <Link href="/blog/kunlik-rejalashtirish" className={A}>
            kunlik reja
          </Link>{" "}
          yetadi. Umumiy asoslar esa{" "}
          <Link href="/blog/vaqtni-boshqarish" className={A}>
            vaqtni boshqarish qo&apos;llanmasida
          </Link>
          .
        </p>
      </Section>
    </BlogArticle>
  );
}
