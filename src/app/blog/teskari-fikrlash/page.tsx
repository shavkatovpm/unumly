import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { getBlogPost } from "@/lib/blog-posts";
import { BlogLangSwitch } from "@/components/blog/lang-switch";

const SLUG = "teskari-fikrlash";
const post = getBlogPost(SLUG)!;
const URL = `https://unumly.uz/blog/${SLUG}`;
const RU_PATH = "/blog/ru/obratnoe-myshlenie";
const UPDATED = "2026-07-31";
const BOT_URL = "https://t.me/unumlybot";

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  alternates: {
    canonical: `/blog/${SLUG}`,
    languages: {
      "uz-UZ": `/blog/${SLUG}`,
      "ru-RU": RU_PATH,
    },
  },
  openGraph: {
    type: "article",
    locale: "uz_UZ",
    title: post.title,
    description: post.description,
    url: URL,
    publishedTime: post.publishedAt,
    modifiedTime: UPDATED,
  },
};

const STEPS = [
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

const FAQ = [
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

export default function Page() {
  return (
    <>
      <main className="mx-auto min-h-screen max-w-2xl px-6 py-12 sm:px-8 sm:py-16">
        <nav
          className="mb-10 flex items-center justify-between gap-4"
          aria-label="Breadcrumb"
        >
          <Link
            href="/blog"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint hover:text-foreground"
          >
            ← Blog
          </Link>
          <BlogLangSwitch
            active="uz"
            uzHref={`/blog/${SLUG}`}
            ruHref={RU_PATH}
          />
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
            Teskari fikrlash: inversion usuli nima va qanday qo&apos;llanadi
          </h1>
          <p className="mt-5 text-[15.5px] leading-relaxed text-muted">
            {post.description}
          </p>
        </header>

        <article className="space-y-7 text-[15px] leading-[1.7] text-foreground/85">
          <aside className="rounded-md border-l-2 border-foreground/30 bg-subtle/40 py-3 pl-4 pr-3">
            <p className="text-[14.5px] leading-relaxed">
              <strong className="text-foreground">Qisqa javob:</strong> Teskari
              fikrlash — maqsadga qanday erishishni emas, unga erishmaslikning
              sabablarini aniqlash usuli. «Qanday muvaffaqiyat qozonaman?»
              o&apos;rniga «meni nima yiqitadi?» deb so&apos;raysiz. Ikkinchi
              savol qisqa va aniq ro&apos;yxat beradi — rejaning birinchi qismi
              esa shu ro&apos;yxatni yo&apos;q qilish bo&apos;ladi.
            </p>
          </aside>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Teskari fikrlash nima?
            </h2>
            <p className="text-muted">
              Teskari fikrlash (ingliz tilida{" "}
              <em className="not-italic text-foreground">inversion</em>) — bu
              masalani oxiridan boshlab yechish usuli. Odatda biz maqsadga
              qarab yo&apos;l izlaymiz. Teskari fikrlashda esa avval
              muvaffaqiyatsizlikni tasavvur qilamiz va uni keltirib chiqargan
              sabablarni sanaymiz.
            </p>
            <p className="mt-3 text-muted">
              Sabab oddiy: muvaffaqiyat retseptini topish qiyin,
              muvaffaqiyatsizlik sabablarini sanash esa osonroq va aniqroq.
              To&apos;g&apos;ri yo&apos;l bitta emas — o&apos;nlab; ammo yiqitadigan
              narsalar ko&apos;pincha barmoq bilan sanarli.
            </p>
            <p className="mt-3 text-muted">
              Bu yangi fikr emas. Matematik{" "}
              <a
                href="https://en.wikipedia.org/wiki/Carl_Gustav_Jacob_Jacobi"
                rel="noopener nofollow"
                target="_blank"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Karl Yakobi
              </a>{" "}
              qiyin masalalarni «har doim teskarisiga aylantir» tamoyili bilan
              yechishni maslahat bergan.{" "}
              <a
                href="https://en.wikipedia.org/wiki/Charlie_Munger"
                rel="noopener nofollow"
                target="_blank"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Charli Manger
              </a>{" "}
              esa buni investitsiya va qaror qabul qilishga olib kirdi: «Men
              qayerda o&apos;lishimni bilsam bo&apos;lgani — o&apos;sha yerga
              hech qachon bormayman».
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Nega salbiy savol aniqroq javob beradi?
            </h2>
            <p className="text-muted">
              Ijobiy savol ko&apos;p va noaniq javob beradi. Salbiy savol qisqa
              va aniq ro&apos;yxat beradi. Ro&apos;yxatni yo&apos;q qilish esa —
              amaliy ish, uni bugun boshlash mumkin.
            </p>
            <p className="mt-3 text-muted">
              «Qanday qilib pul yig&apos;aman?» degan savol yuzlab maslahatga
              olib boradi: investitsiya, qo&apos;shimcha daromad, budjet
              ilovalari, moliyaviy kitoblar. Hammasi to&apos;g&apos;ri, lekin
              qaysi biridan boshlash noma&apos;lum.
            </p>
            <p className="mt-3 text-muted">
              «Nima meni pulsiz qoldiradi?» degan savol esa beshtagina javob
              beradi:
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
              Teskari savolning kuchi ana shunda: u sizni mavzudan harakatga
              olib o&apos;tadi.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Teskari fikrlash va pessimizm — farqi nimada?
            </h2>
            <p className="text-muted">
              Teskari fikrlash ko&apos;pincha pessimizm bilan aralashtiriladi.
              Tashqaridan qaraganda ikkalasi ham yomon narsalarni sanaydi. Farqi
              esa shundaki:{" "}
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
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Teskari fikrlashni 5 qadamda qo&apos;llash
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
              Amaliy misollar: odatiy savol va teskari savol
            </h2>
            <p className="mb-3 text-muted">
              Quyidagi jadval bir xil maqsadni ikki savol orqali ko&apos;rsatadi.
              O&apos;ng ustundagi javob har doim aniqroq va tezroq bajariladi.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[14.5px]">
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
                      Nima meni pulsiz qoldiradi? → oyning 1-kunida maosh
                      kelishi bilan zaxirani ajratib qo&apos;yish
                    </td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      Sport odati
                    </td>
                    <td className="py-2.5 pr-3">
                      Qanday muntazam mashq qilaman?
                    </td>
                    <td className="py-2.5">
                      Meni mashqdan nima to&apos;xtatadi? → kechki charchoq →
                      mashqni ertalabga ko&apos;chirish
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
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      Loyiha
                    </td>
                    <td className="py-2.5 pr-3">
                      Loyihani qanday muvaffaqiyatli qilaman?
                    </td>
                    <td className="py-2.5">
                      Loyiha nega barbod bo&apos;ladi? → talab noaniqligi →
                      birinchi hafta yozma kelishuv
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-muted">
              Oxirgi qatorda ko&apos;rsatilgan yondashuvning jamoaviy nomi bor —{" "}
              <strong className="text-foreground">premortem</strong>. Loyiha
              boshlanishidan oldin jamoa yig&apos;iladi va «bu ish butunlay
              barbod bo&apos;ldi deb tasavvur qiling; nega?» degan savolga javob
              yozadi (usul tavsifi:{" "}
              <a
                href="https://hbr.org/2007/09/performing-a-project-premortem"
                rel="noopener nofollow"
                target="_blank"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Harvard Business Review
              </a>
              ). Xatolar sodir bo&apos;lgunidan oldin ovoz chiqarib aytilsa,
              ularning ko&apos;pi umuman sodir bo&apos;lmaydi.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Bu usul qayerda ishlamaydi?
            </h2>
            <p className="text-muted">
              Men o&apos;zim buni bir necha marta noto&apos;g&apos;ri
              ishlatganman — ro&apos;yxat yozganman, keyin shu ro&apos;yxatga
              qarab ishni butunlay boshlamay qo&apos;yganman. Shuning uchun uch
              chegarani eslatib o&apos;taman:
            </p>
            <ul className="mt-3 space-y-3 text-muted">
              <li>
                <strong className="text-foreground">G&apos;oya bosqichida</strong>{" "}
                — yangi narsa o&apos;ylab topayotganda cheklovlar ro&apos;yxati
                erta keladi va fikrni bo&apos;g&apos;adi. Avval g&apos;oyani
                yozing, teskari savolni keyin bering.
              </li>
              <li>
                <strong className="text-foreground">Uzun ro&apos;yxat</strong> —
                20 ta sabab reja emas, xavotir. Ehtimoli va zarari bo&apos;yicha
                eng kuchli 3-5 tasini qoldiring.
              </li>
              <li>
                <strong className="text-foreground">Harakatsiz ro&apos;yxat</strong>{" "}
                — qarshi harakati yozilmagan sabab shunchaki ro&apos;yxatda
                yotadi va kayfiyatni tushiradi. Har bandga bitta vazifa —
                qoidani buzmang.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.01em] text-foreground">
              Teskari rejani Unumly&apos;da qanday yozish mumkin
            </h2>
            <p className="text-muted">
              Buni daftarda ham qilsa bo&apos;ladi. Faqat bitta muammo bor:
              «Buni nima buzadi?» ro&apos;yxati daftarda bir marta yoziladi-yu,
              qayta ochilmaydi. Ish esa aynan qayta ochishda.
            </p>
            <p className="mt-3 text-muted">
              Unumly&apos;da men buni shunday yuritaman: maqsadni{" "}
              <Link
                href="/maqsad"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Maqsad
              </Link>{" "}
              bo&apos;limiga yozaman, ostiga esa qadamlar sifatida oddiy
              maqsadlarni emas, qarshi harakatlarni qo&apos;yaman — «oyning
              1-kuni zaxirani ajratish», «mashqni 07:00 ga ko&apos;chirish».
              Ular{" "}
              <Link
                href="/bugun"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Bugun
              </Link>{" "}
              ro&apos;yxatida kunlik vazifa bo&apos;lib chiqadi, vaqti kelganda
              Telegram bot eslatma yuboradi. Ya&apos;ni ro&apos;yxat qog&apos;ozda
              qolib ketmaydi — u kunga tushadi.
            </p>
            <p className="mt-3 text-muted">
              Katta ish bo&apos;lsa,{" "}
              <Link
                href="/loyiha"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Loyiha
              </Link>{" "}
              bo&apos;limida alohida hujjat ochib, premortem ro&apos;yxatini
              o&apos;sha yerda yuritish qulay. Unumly qanday ishlashi haqida
              batafsil:{" "}
              <Link
                href="/haqida"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Unumly haqida
              </Link>
              .
            </p>
            <p className="mt-3 text-muted">
              Teskari fikrlash rejalashtirish usullariga qarshi emas — ular bilan
              birga ishlaydi. Ro&apos;yxatni tuzib bo&apos;lgach, qarshi
              harakatlarga vaqt ajratish uchun{" "}
              <Link
                href="/blog/time-blocking"
                className="text-foreground underline-offset-4 hover:underline"
              >
                time blocking
              </Link>{" "}
              yoki oddiy{" "}
              <Link
                href="/blog/kunlik-rejalashtirish"
                className="text-foreground underline-offset-4 hover:underline"
              >
                kunlik reja
              </Link>{" "}
              yetadi. Umumiy asoslar esa{" "}
              <Link
                href="/blog/vaqtni-boshqarish"
                className="text-foreground underline-offset-4 hover:underline"
              >
                vaqtni boshqarish qo&apos;llanmasida
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
            «Buni nima buzadi?» ro&apos;yxatini bugun yozing
          </h2>
          <p className="mt-2 text-[14px] text-muted">
            Bitta maqsadni tanlang, uni buzadigan 3 ta sababni yozing va har
            biriga qarshi bitta vazifa qo&apos;shing. Buni bot yoki saytda
            boshlang — qaysi biri qulay bo&apos;lsa.
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
              about: {
                "@type": "Thing",
                name: "Teskari fikrlash (inversion)",
              },
              translationOfWork: {
                "@type": "BlogPosting",
                url: `https://unumly.uz${RU_PATH}`,
                inLanguage: "ru",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "HowTo",
              name: "Teskari fikrlashni qanday qo'llash kerak",
              description:
                "Maqsadga xalaqit beradigan sabablarni topish va ularni yopish bo'yicha 5 qadamli tartib.",
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
