import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { DocsToc } from "@/components/landing/docs-toc";
import { FaqList } from "@/components/landing/faq-list";

export const metadata: Metadata = {
  title: "Haqida: Unumly to'liq qo'llanma va dokumentatsiya",
  description:
    "Unumly ilovasining to'liq dokumentatsiyasi: kirish, Bugun, Agenda, Kalendar, Reja, Odat, Maqsad, Bajarilgan, O'chirilgan bo'limlari, sozlamalar, Telegram bot va ma'lumotlar saqlash haqida o'zbekcha qo'llanma.",
  alternates: { canonical: "/haqida" },
  openGraph: {
    title: "Haqida: Unumly to'liq qo'llanma",
    description:
      "Unumly ilovasidan foydalanish bo'yicha to'liq qo'llanma: barcha bo'limlar, sozlamalar va Telegram bot.",
    url: "https://unumly.uz/haqida",
  },
};

/* ─── Sign-up steps (HowTo schema) ──────────────────────────── */
const SIGN_UP_STEPS = [
  {
    name: "Telegram'da botni oching",
    text: "Telegram'da @unumlybot ni qidiring yoki t.me/unumlybot havolasi orqali oching. /start tugmasini bosing.",
  },
  {
    name: "Telefon raqamingizni ulashing",
    text: "Bot \"Telefon raqamingizni ulashish\" tugmasini ko'rsatadi: bossangiz, Telegram avtomatik ravishda raqamingizni botga yuboradi. Veb-saytda hech qanday joyga telefon yozmaysiz.",
  },
  {
    name: "Botdan 6-xonali kodni oling",
    text: "Bot sizga 6-xonali OTP kodini DM orqali yuboradi. Kod 10 daqiqa amal qiladi.",
  },
  {
    name: "unumly.uz/kirish ga kiring",
    text: "Sayt ochilganda telefon raqamingizni va botdan olgan 6-xonali kodingizni kiriting. Tasdiqlash tugmasini bosing.",
  },
  {
    name: "Tayyor: Bugun bo'limiga o'tasiz",
    text: "Sessiya 30 kun davomida saqlanadi. Telegram Mini App orqali kirsangiz, kod kerak bo'lmaydi: avtomatik kirasiz.",
  },
];

/* ─── FAQ (FAQPage schema) ───────────────────────────────────── */
const FAQS = [
  {
    q: "Unumly nima?",
    a: "Unumly: kunlik, haftalik, oylik va yillik vazifalarni rejalashtirish, boshqarish va bajarish uchun mo'ljallangan o'zbek tilidagi minimalistik productivity ilovasi. Brauzer orqali ishlaydi yoki Telegram Mini App sifatida ochiladi.",
  },
  {
    q: "Ro'yxatdan o'tish qanday amalga oshiriladi?",
    a: "Ro'yxatdan o'tish Telegram bot (@unumlybot) orqali. Botda telefon raqamingizni ulasangiz, bot 6-xonali kod yuboradi. Shu kodni saytda kiritib kirish amalga oshiriladi. Veb-saytda telefon raqami yozish maydoni yo'q.",
  },
  {
    q: "Ma'lumotlarim qaerda saqlanadi?",
    a: "Kirgan foydalanuvchilar uchun rejalar bulutda (Postgres) saqlanadi va qurilmalar orasida sinxronlanadi. Kirmagan holatda esa rejalar faqat brauzer xotirasida (localStorage) saqlanadi va sinxronlanmaydi. Birinchi marta kirganingizda localStorage'dagi rejalar avtomatik ravishda bulutga ko'chiriladi.",
  },
  {
    q: "Pul to'lash kerakmi?",
    a: "Yo'q. Unumly to'liq bepul. Asosiy funksiyalar (rejalashtirish, kalendar, bot bildirishnomalari) doimo bepul qoladi.",
  },
  {
    q: "Qanday qurilmalarda ishlaydi?",
    a: "Zamonaviy brauzerga ega bo'lgan har qanday qurilmada: kompyuter, telefon, planshet. Telegram'da Mini App sifatida ham ochish mumkin. Chrome, Safari, Firefox, Edge: barchasida bir xil ishlaydi.",
  },
  {
    q: "Vazifalarni o'chirsam, ular qaytib kelmaydimi?",
    a: "Kelishadi. Unumly yumshoq o'chirish (soft delete) ishlatadi: o'chirilgan vazifalar 30 kun davomida \"O'chirilgan\" bo'limida saqlanadi va qaytarish mumkin. 30 kundan keyin avtomatik butunlay o'chiriladi.",
  },
  {
    q: "Telegram bot orqali nima qila olaman?",
    a: "Bot vaqt belgilangan vazifalar uchun bildirishnoma yuboradi va Tezkor ro'yhatlar uchun item qabul qiladi. Bildirishnomaning ostida \"Bajarildi\" tugmasi bo'ladi: to'g'ridan-to'g'ri Telegram ichidan vazifani bajarilgan deb belgilash mumkin. Botga oddiy matn yuborsangiz, u Tezkor ro'yhatga item bo'lib qo'shiladi.",
  },
  {
    q: "Tezkor nima va Reja'dan farqi nimada?",
    a: "Tezkor — yengil, vaqtsiz ro'yhatlar uchun (bozor, sumka, esda saqlash). Bitta ro'yhatga ko'p item kiradi, ularning har biri checkbox bilan belgilanadi. Reja esa sana/vaqt bog'langan vazifalar uchun, ularning eslatmasi botdan keladi.",
  },
  {
    q: "Bildirishnomalarni qanday boshqarish mumkin?",
    a: "Sozlamalar bo'limida muhimlik darajasi bo'yicha bildirishnomalarni alohida-alohida yoqib-o'chirish mumkin: Yuqori, O'rta, Past va Vaqtsiz vazifalar uchun.",
  },
  {
    q: "Bot eslatmasi qachon yetib keladi?",
    a: "Default holatda eslatma vazifa vaqtidan 10 daqiqa oldin yuboriladi — tayyorlanishga ulgurish uchun. Sozlamalardan account-darajadagi defaultni O'z vaqtida, 10, 20 yoki 30 daqiqa avval qilib o'zgartirishingiz mumkin. Har bir alohida reja uchun esa Batafsil dialogida \"Eslatma\" tugmasini bosib shu 4 ta variantdan tanlash mumkin.",
  },
  {
    q: "Unumly boshqa to-do ilovalardan nimasi bilan farq qiladi?",
    a: "Unumly o'zbek tilida, minimalistik dizaynga ega va Telegram bilan chuqur integratsiyalashgan. Todoist yoki TickTick'dan farqli o'laroq, ortiqcha imkoniyatlar va plitalar yo'q: faqat reja tuzish, ko'rish va bajarish.",
  },
  {
    q: "Internetsiz ishlaydimi?",
    a: "Brauzerda ochilgan holatda saytni qisman ko'ra olasiz, lekin yangi rejalarni saqlash va sinxronlash uchun internet kerak. Telegram Mini App rejimida ham internet zarur.",
  },
];

const TOC = [
  { id: "umumiy", label: "1. Umumiy ma'lumot" },
  { id: "boshlash", label: "2. Boshlash (Kirish)" },
  { id: "tushunchalar", label: "3. Asosiy tushunchalar" },
  { id: "bugun", label: "4. Bugun bo'limi" },
  { id: "agenda", label: "5. Agenda bo'limi" },
  { id: "tezkor", label: "6. Tezkor bo'limi" },
  { id: "kalendar", label: "7. Kalendar bo'limi" },
  { id: "reja", label: "8. Reja bo'limi" },
  { id: "odat", label: "9. Odat bo'limi" },
  { id: "maqsad", label: "10. Maqsad bo'limi" },
  { id: "bajarilgan-ochirilgan", label: "11. Bajarilgan va O'chirilgan" },
  { id: "sozlamalar", label: "12. Sozlamalar" },
  { id: "telegram-bot", label: "13. Telegram bot" },
  { id: "malumotlar", label: "14. Ma'lumotlar va xavfsizlik" },
  { id: "faq", label: "15. Tez-tez so'raladigan savollar" },
];

export default function HaqidaPage() {
  return (
    <>
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-12 sm:px-8 sm:py-16">
        <nav className="mb-12" aria-label="Breadcrumb">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint hover:text-foreground"
          >
            ← Bosh sahifa
          </Link>
        </nav>

        <header className="mb-14">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint">
            Dokumentatsiya
          </p>
          <h1 className="mt-3 text-balance text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.05] tracking-[-0.025em]">
            Unumly: to&apos;liq qo&apos;llanma
          </h1>
          <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-muted">
            Unumly ilovasidan foydalanish bo&apos;yicha to&apos;liq qo&apos;llanma:
            ro&apos;yxatdan o&apos;tishdan tortib har bir bo&apos;limning aniq
            imkoniyatlarigacha. Hujjat mavjud xususiyatlarni tavsiflaydi:
            kelajakdagi rejalar alohida belgilanadi.
          </p>
        </header>

        {/* ─── Table of Contents (client: smooth scroll) ─── */}
        <DocsToc items={TOC} />

        {/* ─── 1. Umumiy ─────────────────────────────────────── */}
        <Section id="umumiy" title="1. Umumiy ma'lumot">
          <p>
            <strong>Unumly</strong>: o&apos;zbek tilidagi minimalistik
            productivity ilovasi. Asosiy maqsadi: kunlik, haftalik, oylik va
            yillik vazifalarni bir joyda rejalashtirish, boshqarish va
            bajarish. Ilovada ortiqcha imkoniyatlar, murakkab sozlamalar yoki
            plitalar yo&apos;q: faqat reja tuzish va bajarish bilan bog&apos;liq
            asosiy ish oqimlari.
          </p>
          <p>
            Ilova ikki rejimda ishlaydi:{" "}
            <strong>brauzerda</strong> (unumly.uz manzilida) va{" "}
            <strong>Telegram Mini App</strong> sifatida (bot ichidan).
            Foydalanuvchi tomonida hech narsa o&apos;rnatish kerak emas.
          </p>

          <h3>Kim uchun?</h3>
          <ul>
            <li>O&apos;quvchi va talabalar: darslar va loyihalarni rejalashtirish uchun</li>
            <li>Freelancer va mustaqil mutaxassislar: mijoz ishlarini kuzatish uchun</li>
            <li>Kichik biznes egalari: kundalik vazifalarni tartibga solish uchun</li>
            <li>Kundalik hayotini tartibli olib borishni xohlovchi har kim</li>
          </ul>

          <h3>Asosiy farqlovchi xususiyatlar</h3>
          <ul>
            <li>O&apos;zbek tilida (boshqa rejalashtirish ilovalarining ko&apos;pchiligi inglizcha)</li>
            <li>Telegram bilan chuqur integratsiya: bot bildirishnomalari, Mini App, bot ichidan bajarish</li>
            <li>Minimalistik dizayn: ortiqcha tugmalar va menyular yo&apos;q</li>
            <li>Telefon raqami saytda emas, Telegram orqali tasdiqlanadi</li>
            <li>Bepul, reklamasiz</li>
          </ul>
        </Section>

        {/* ─── 2. Boshlash ───────────────────────────────────── */}
        <Section id="boshlash" title="2. Boshlash (Kirish)">
          <p>
            Unumly Telegram orqali kirish tizimini ishlatadi. Bu degani:
            veb-saytda telefon raqami yozish maydoni <strong>yo&apos;q</strong>;
            barcha tasdiqlash Telegram bot ichida amalga oshadi. Bu:
            xavfsizroq va SMS narxidan tashqari ishlaydi.
          </p>

          <h3>5 qadamda kirish</h3>
          <ol className="space-y-4">
            {SIGN_UP_STEPS.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong className="text-foreground">{s.name}.</strong>{" "}
                  <span className="text-muted">{s.text}</span>
                </div>
              </li>
            ))}
          </ol>

          <h3>Telegram Mini App rejimi</h3>
          <p>
            Botda Mini App tugmasini bossangiz, Unumly Telegram ichida to&apos;la
            interfeys bilan ochiladi. Bu holatda kod kiritish shart emas:
            Telegram&apos;ning <code>initData</code> mexanizmi orqali avtomatik
            kirasiz. Bu eng tezkor yo&apos;l.
          </p>

          <h3>Sessiya muddati va xavfsizlik</h3>
          <ul>
            <li>Sessiya 30 kun davomida saqlanadi (JWT, httpOnly cookie)</li>
            <li>OTP kodi 10 daqiqa amal qiladi</li>
            <li>5 ta noto&apos;g&apos;ri urinishdan keyin kod bloklanadi</li>
            <li>Chiqish: Sozlamalar &gt; Chiqish tugmasi</li>
          </ul>
        </Section>

        {/* ─── 3. Tushunchalar ───────────────────────────────── */}
        <Section id="tushunchalar" title="3. Asosiy tushunchalar">
          <h3>Reja (Plan)</h3>
          <p>
            <strong>Reja</strong>: aniq bir vaqt yoki kunga bog&apos;langan
            vazifa. Misol: &quot;Ertaga soat 10:00 da yig&apos;ilish&quot;.
            Rejalarda sarlavha, sana, vaqt (ixtiyoriy), muhimlik darajasi va
            status bo&apos;ladi. Rejalar <em>Bugun</em>, <em>Agenda</em> va{" "}
            <em>Kalendar</em> bo&apos;limlarida ko&apos;rinadi.
          </p>

          <h3>G&apos;oya (Ideya)</h3>
          <p>
            <strong>G&apos;oya</strong>: vaqt belgilanmagan, lekin uzoq
            muddatli niyat. Misol: &quot;Ingliz tilini o&apos;rganish&quot;.
            G&apos;oyalar <em>Reja</em> bo&apos;limida kategoriyalar
            bo&apos;yicha tartiblanadi. G&apos;oyaga sana belgilansa, u
            avtomatik ravishda Reja sifatida{" "}
            <em>Bugun/Agenda/Kalendar</em>&apos;da ko&apos;rinadi.
          </p>

          <h3>Kategoriya</h3>
          <p>
            G&apos;oyalarni guruhlashtirish uchun. Misol: &quot;Ish&quot;,
            &quot;Shaxsiy&quot;, &quot;Sport&quot;, &quot;O&apos;qish&quot;.
            Har bir kategoriyaga rang belgilanadi (10 ta variant: Olive,
            Emerald, Teal, Indigo, Pink, Slate, Stone, Mocha, White, Gray).
          </p>

          <h3>Muhimlik darajasi</h3>
          <p>3 ta daraja:</p>
          <ul>
            <li><strong>Yuqori</strong>: kritik, bugun albatta bajarilishi kerak</li>
            <li><strong>O&apos;rta</strong>: muhim, lekin kechiktirish mumkin</li>
            <li><strong>Past</strong>: qachondir bajarilsa bo&apos;ladi</li>
          </ul>
          <p>
            Vazifaga muhimlik belgilamaslik ham mumkin:{" "}
            <strong>Vaqtsiz/belgisiz</strong> deb hisoblanadi.
          </p>

          <h3>Status</h3>
          <ul>
            <li><strong>TODO</strong>: bajarilmagan, aktiv reja</li>
            <li><strong>DONE</strong>: bajarilgan, <em>Bajarilgan</em> bo&apos;limga o&apos;tadi</li>
            <li><strong>O&apos;chirilgan</strong>: yumshoq o&apos;chirilgan, 30 kun davomida qaytarish mumkin</li>
          </ul>
        </Section>

        {/* ─── 4. Bugun ──────────────────────────────────────── */}
        <Section id="bugun" title="4. Bugun bo'limi">
          <p className="text-faint">URL: <code>/bugun</code></p>
          <p>
            <strong>Bugun</strong>: bir kunlik vazifalarning markaziy
            ko&apos;rinishi. Sahifa ochilganda darhol bugungi rejalarni ko&apos;rasiz,
            vaqt bo&apos;ylab guruhlangan holda.
          </p>

          <h3>Vazifalar qanday guruhlangan</h3>
          <ul>
            <li>
              <strong>Kechikkan</strong>: o&apos;tgan kundan qolib ketgan,
              vaqti belgilangan va hali bajarilmagan rejalar — qizil belgi
              bilan eng tepada chiqadi
            </li>
            <li><strong>Yarim kechasi</strong>: 00:00 dan 03:59 gacha</li>
            <li><strong>Ertalab</strong>: 04:00 dan 11:59 gacha</li>
            <li><strong>Kunduzi</strong>: 12:00 dan 16:59 gacha</li>
            <li><strong>Kechqurun</strong>: 17:00 dan 23:59 gacha</li>
            <li>
              <strong>Vaqtsiz</strong>: vaqt belgilanmagan rejalar (o&apos;tgan
              kunlardan qolgan vaqtsiz rejalar ham shu yerga qo&apos;shiladi)
            </li>
          </ul>

          <h3>Bajarilmagan rejalarning o&apos;tishi (carry-over)</h3>
          <p>
            Agar bugun yaratgan reja kun oxirigacha bajarilmasa, ertasi kun
            ham <em>Bugun</em> ekranida turaveradi — to bajarilgunicha,
            tahrirlangunicha yoki o&apos;chirilgunicha. Vaqtsiz rejalar oddiy
            ko&apos;rinishda <strong>Vaqtsiz</strong> blokda, vaqti
            belgilanganlari esa yuqoridagi <strong>Kechikkan</strong> blokda
            qizil belgi bilan ko&apos;rinadi.
          </p>

          <h3>Foydalanuvchi nima qila oladi</h3>
          <ul>
            <li>
              <strong>Yangi reja qo&apos;shish</strong>: yuqoridagi input
              maydoniga sarlavhani yozib Enter yoki + tugmasini bosish
            </li>
            <li>
              <strong>Vaqt belgilash</strong>: soat ikonkasini bosib HH:MM
              shaklida vaqt tanlash (ixtiyoriy)
            </li>
            <li>
              <strong>Muhimlik belgilash</strong>: bayroq ikonkasi bilan
              Yuqori / O&apos;rta / Past tanlash
            </li>
            <li>
              <strong>Bajarildi belgisi</strong>: chap tomondagi doirani
              bosish; animatsiya bilan tasdiqlanadi va vazifa{" "}
              <em>Bajarilgan</em> bo&apos;limga o&apos;tadi
            </li>
            <li>
              <strong>Tahrirlash</strong>: vazifa ustiga bosib batafsil
              dialogni ochish, hamma parametrlarni o&apos;zgartirish
            </li>
            <li>
              <strong>O&apos;chirish</strong>: batafsil dialog ichidagi
              o&apos;chirish tugmasi; vazifa <em>O&apos;chirilgan</em>{" "}
              bo&apos;limga 30 kunlik muddatga ko&apos;chadi
            </li>
          </ul>

          <h3>Kichik tafsilotlar</h3>
          <ul>
            <li>Bajarilish foizi yuqorida real vaqtda ko&apos;rinadi</li>
            <li>Bajarganda animatsiya + (ixtiyoriy) tovush effekti</li>
            <li>Sortlash: status, vaqt, yaratilish tartibi</li>
          </ul>
        </Section>

        {/* ─── 5. Agenda ─────────────────────────────────────── */}
        <Section id="agenda" title="5. Agenda bo'limi">
          <p className="text-faint">URL: <code>/agenda</code></p>
          <p>
            <strong>Agenda</strong>: ertangi kun va undan keyingi bir necha
            kunlardagi rejalarni bir nuqtadan ko&apos;rish uchun. Har bir kun
            o&apos;z bo&apos;limiga ega, ichida vazifalar vaqt bo&apos;yicha
            tartiblangan.
          </p>

          <h3>Nima qila olasiz</h3>
          <ul>
            <li>Yaqin kunlardagi rejalarni bir ekranda ko&apos;rish</li>
            <li>Vazifani <strong>boshqa kunga ko&apos;chirish</strong> (drag-and-drop)</li>
            <li>Bajarildi deb belgilash</li>
            <li>Batafsil dialog orqali tahrirlash yoki o&apos;chirish</li>
            <li>Bo&apos;sh kunlar uchun &quot;Hozircha reja yo&apos;q&quot; xabari ko&apos;rinadi</li>
          </ul>
          <p>
            Agenda: &quot;ertangi haftaga kuchli boshlanish&quot; uchun
            ko&apos;rib chiqish bo&apos;limi.
          </p>
        </Section>

        {/* ─── 6. Tezkor ─────────────────────────────────────── */}
        <Section id="tezkor" title="6. Tezkor bo'limi">
          <p className="text-faint">URL: <code>/tezkor</code></p>
          <p>
            <strong>Tezkor</strong>: yengil, vaqt belgilanmaydigan
            ro&apos;yhatlar uchun (bozor ro&apos;yhati, sumka ro&apos;yhati,
            esda saqlash kerak narsalar). Har bir narsani alohida vazifa
            qilib yaratish o&apos;rniga, bittagina ro&apos;yhat ichiga
            checkbox ko&apos;rinishida joylanadi.
          </p>

          <h3>Web yoki Mini App orqali</h3>
          <ul>
            <li>
              <strong>+ Yangi ro&apos;yhat</strong> tugmasi orqali multiline
              maydon ochiladi
            </li>
            <li>
              Har qatorga bittadan yozasiz (Enter bilan ajratiladi):
              <pre className="my-2 rounded-md bg-subtle/40 p-3 text-[12px] leading-relaxed">{`Bodring
Pomidor
Gugurt`}</pre>
            </li>
            <li>
              Saqlasangiz bitta ro&apos;yhat sifatida saqlanadi. Default nom:{" "}
              <em>&quot;Ro&apos;yhat — 23-may 14:30&quot;</em> (istalgan
              vaqtda o&apos;zgartirish mumkin)
            </li>
            <li>
              Ro&apos;yhat ichiga kirib har bir narsani checkbox bilan
              belgilab borasiz; yangi narsa qo&apos;shish, tahrirlash,
              o&apos;chirish mumkin
            </li>
          </ul>

          <h3>Telegram bot orqali</h3>
          <ul>
            <li>
              Botga oddiy xabar yuborasiz (masalan <em>&quot;Bodring&quot;</em>{" "}
              deb)
            </li>
            <li>
              Bot xabarni 📝 emoji bilan tasdiqlaydi (ortiqcha matn yo&apos;q)
              va uni ochiq ro&apos;yhatga item sifatida qo&apos;shadi
            </li>
            <li>
              Oxirgi xabardan ~<strong>20 soniya</strong> jim turilsa, bot
              ro&apos;yhat summarysini yuboradi 4 ta tugma bilan:
              <ul>
                <li><strong>✅ Tasdiqlash</strong> — ro&apos;yhatni shu nom bilan saqlab yopadi</li>
                <li><strong>➕ Davom etish</strong> — ro&apos;yhatni qayta ochadi, yana 20s kutadi</li>
                <li><strong>✏️ Nom kiritish</strong> — navbatdagi xabaringiz ro&apos;yhat nomi bo&apos;ladi</li>
                <li><strong>🗑 O&apos;chirish</strong> — ro&apos;yhatni soft-delete qiladi</li>
              </ul>
            </li>
            <li>
              <em>Davom etish</em> bosgan bo&apos;lsangiz va keyin yana
              jim tursangiz, bot bir xil xabarni tahrirlaydi (yangi xabar
              yubormaydi) — chat bezovta bo&apos;lmaydi.
            </li>
          </ul>

          <h3>Qachon Reja, qachon Tezkor?</h3>
          <ul>
            <li>
              <strong>Reja (Bugun/Agenda)</strong>: sana/vaqt bog&apos;langan,
              muhimlik darajasi bor, eslatma kelib turadi
            </li>
            <li>
              <strong>Tezkor</strong>: shunchaki ro&apos;yhat — sotib olish,
              olib borish, eslab qolish kerak narsalar. Sana yo&apos;q,
              priority yo&apos;q, eslatma yo&apos;q
            </li>
          </ul>
        </Section>

        {/* ─── 7. Kalendar ───────────────────────────────────── */}
        <Section id="kalendar" title="7. Kalendar bo'limi">
          <p className="text-faint">URL: <code>/kalendar</code></p>
          <p>
            <strong>Kalendar</strong>: vaqt bo&apos;yicha to&apos;liq vizual
            ko&apos;rinish. 4 ta ko&apos;rinish rejimi mavjud, har biri turli
            masshtabga mo&apos;ljallangan.
          </p>

          <h3>Kun ko&apos;rinishi</h3>
          <ul>
            <li>24-soatlik vertical setka</li>
            <li>Hozirgi soat avtomatik scroll qilinadi</li>
            <li>Soat slot&apos;iga bosib yangi vazifa qo&apos;shish</li>
            <li>Drag bilan vazifani boshqa vaqtga ko&apos;chirish</li>
            <li>Slot davomiyligini cho&apos;zib o&apos;zgartirish (vaqt belgilash)</li>
          </ul>

          <h3>Hafta ko&apos;rinishi</h3>
          <ul>
            <li>7 ustun (Yakshanba dan Shanba gacha)</li>
            <li>Har kunda vazifalar vaqt bo&apos;ylab joylashgan</li>
            <li>Drag bilan kun va vaqt orasida ko&apos;chirish</li>
            <li>Chevron tugmalari bilan oldingi/keyingi haftaga o&apos;tish</li>
          </ul>

          <h3>Oy ko&apos;rinishi</h3>
          <ul>
            <li>An&apos;anaviy oy setkasi (6 hafta satri)</li>
            <li>Har kunda vazifalar soni ko&apos;rsatiladi</li>
            <li>Kunni bosish: Kun ko&apos;rinishiga o&apos;tish</li>
          </ul>

          <h3>Yil ko&apos;rinishi</h3>
          <ul>
            <li>12 ta mini-oy bir ekranda</li>
            <li>Bir oyni bosish: Oy ko&apos;rinishiga o&apos;tish</li>
            <li>Yil davomidagi umumiy reja zichligini baholash uchun</li>
          </ul>
        </Section>

        {/* ─── 7. Reja ───────────────────────────────────────── */}
        <Section id="reja" title="8. Reja bo'limi">
          <p className="text-faint">URL: <code>/reja</code></p>
          <p>
            <strong>Reja</strong> bo&apos;limi: uzoq muddatli niyatlar va
            g&apos;oyalar uchun. Bu yerda vaqt belgilanmagan g&apos;oyalar
            kategoriyalar bo&apos;ylab guruhlanadi. Vaqt belgilangan rejalar
            esa <em>Bugun</em>, <em>Agenda</em> va <em>Kalendar</em>&apos;da
            ko&apos;rinadi.
          </p>

          <h3>Ikki ko&apos;rinish</h3>
          <h4>Tab ko&apos;rinishi (mobil va default)</h4>
          <ul>
            <li>Kategoriyalar vertikal ro&apos;yxat sifatida</li>
            <li>Har kategoriya ostida aktiv g&apos;oyalar</li>
            <li>Bajarilganlar &quot;Bajarilgan&quot; sticky&apos;da</li>
            <li>Sort: &quot;Yangi avval&quot; yoki &quot;Eski avval&quot;</li>
          </ul>

          <h4>Kanban ko&apos;rinishi (desktop)</h4>
          <ul>
            <li>Har kategoriya: alohida ustun (kartalar)</li>
            <li>Aktiv g&apos;oyalar yuqorida, bajarilganlar pastda</li>
            <li>Mobilda kanban yo&apos;q: avtomatik Tab&apos;ga o&apos;tadi</li>
          </ul>

          <h3>G&apos;oyalar bilan ishlash</h3>
          <ul>
            <li>Yangi g&apos;oya qo&apos;shish: kategoriya ostidagi input&apos;dan</li>
            <li>Bajarilgan deb belgilash: checkbox bilan</li>
            <li>Tahrirlash: batafsil dialog</li>
            <li>O&apos;chirish: soft delete, 30 kun ichida qaytarish mumkin</li>
            <li>
              <strong>Sana belgilash</strong>: g&apos;oyaga sana qo&apos;shsangiz,
              u Reja sifatida shu kunning <em>Bugun/Kalendar</em>&apos;ida
              ko&apos;rinadi
            </li>
          </ul>

          <h3>Kategoriyalarni boshqarish</h3>
          <ul>
            <li>Yangi kategoriya yaratish (ismi va rangi bilan)</li>
            <li>Mavjud kategoriyani qayta nomlash yoki rangini o&apos;zgartirish</li>
            <li>Bo&apos;sh kategoriyani o&apos;chirish</li>
          </ul>
        </Section>

        {/* ─── 9. Odat ──────────────────────────────────────── */}
        <Section id="odat" title="9. Odat bo'limi">
          <p className="text-faint">URL: <code>/odat</code></p>
          <p>
            <strong>Odat</strong> bo&apos;limi: muntazam takrorlanadigan ishlarni
            kuzatish uchun. Reja&apos;dan farqi: Reja — bir martalik vazifa,
            Odat — <strong>hafta kunlari bo&apos;yicha takrorlanadigan</strong>
            ish (masalan &quot;Du, Se, Ju — sport&quot; yoki &quot;har kuni suv
            ichish&quot;). Maqsad — har kuni belgilab borib izchillikni ko&apos;rish.
          </p>

          <h3>Plan tizimi bilan integratsiya</h3>
          <p>
            Odat yaratilganda u <strong>avtomatik vazifa</strong> bo&apos;lib,
            belgilangan kunlari (va vaqtida) <em>Bugun</em>, <em>Agenda</em> va{" "}
            <em>Kalendar</em>&apos;da ♻ belgisi bilan ko&apos;rinadi. Vaqt
            belgilangan bo&apos;lsa, Telegram bot eslatmasi ham keladi. O&apos;sha
            kundagi vazifa vaqtini Agenda/Bugun&apos;da o&apos;zgartirsangiz —{" "}
            <strong>faqat o&apos;sha kunga</strong> ta&apos;sir qiladi, odatning
            umumiy jadvali o&apos;zgarmaydi.
          </p>

          <h3>Ikki bo&apos;lim</h3>
          <h4>Odatlar (boshqaruv)</h4>
          <ul>
            <li>Odatlar toifalar (ikonali) bo&apos;yicha guruhlanadi; tepada &quot;Barchasi&quot; + toifa tablari</li>
            <li>Yangi odat: nom, toifa (majburiy yoki &quot;Toifasiz&quot;), qaysi kunlari, ixtiyoriy vaqt</li>
            <li>Odatni ochib tahrirlash: nom, toifa, kunlar, vaqt &mdash; <strong>Saqlash</strong> bilan</li>
            <li>Toifa qo&apos;shish; toifani tahrirlash/o&apos;chirish: faol tab&apos;ni qayta bosib</li>
            <li>Arxivlash (vaqtincha to&apos;xtatish) va qaytarish; o&apos;chirish &mdash; tasdiq bilan</li>
          </ul>

          <h4>Kalendar (kuzatuv)</h4>
          <ul>
            <li><strong>Hafta</strong> / <strong>Oy</strong> ko&apos;rinishi, oldingi/keyingi davrga o&apos;tish</li>
            <li>Kunni bosib o&apos;sha kun odatlarini belgilash; o&apos;tib ketgan kunlarni ham to&apos;ldirish mumkin</li>
            <li>Kelajak kunlarni ko&apos;rish va odat qo&apos;shish mumkin, lekin bajarish faqat o&apos;tmish/bugun</li>
            <li>Pastda katta halqa: o&apos;sha hafta yoki oy bajarilish foizi</li>
          </ul>
        </Section>

        {/* ─── 10. Maqsad ───────────────────────────────────── */}
        <Section id="maqsad" title="10. Maqsad bo'limi">
          <p>
            <strong>Maqsad</strong> bo&apos;limi: uzoq muddatli maqsadlarni OKR
            uslubida boshqarish. Uch pog&apos;ona: <strong>Maqsad → kichik
            maqsadlar → qadamlar</strong>. Katta maqsadni mayda, bajarib
            bo&apos;ladigan qadamlarga bo&apos;lib, har birini kunlik rejaga
            belgilab borasiz.
          </p>
          <p>
            Har bir qadamni <strong>istalgan kunga</strong> (ixtiyoriy vaqt
            bilan, agar o&apos;sha vaqt band bo&apos;lmasa) belgilash mumkin.
            Belgilangan qadam <strong>avtomatik vazifa</strong> bo&apos;lib,
            Bugun, Agenda va Kalendarda <Target className="inline size-3.5" />{" "}
            belgisi bilan ko&apos;rinadi. Vazifani bajarsangiz, qadam ham
            bajarilgan deb belgilanadi (va aksincha).
          </p>

          <h3>Qanday ishlaydi</h3>
          <ul>
            <li>&quot;+ Maqsad&quot;: nom, ixtiyoriy muddat (deadline) va ikona</li>
            <li>Maqsad ichida <strong>kichik maqsadlar</strong>, ularning ichida <strong>qadamlar</strong> qo&apos;shiladi</li>
            <li>Qadam yonidagi <strong>kalendar</strong> belgisi orqali uni kunga (va vaqtga) belgilash; xohlasangiz belgilashni olib tashlash</li>
            <li>Qadamni belgilab bajarilgan deb qo&apos;yish (checkbox), nomini tahrirlash, o&apos;chirish</li>
            <li>Kichik maqsad va qadamlarni <strong>sudrab tartiblash</strong> (mobil + desktop), nomini tahrirlash</li>
            <li>Yo&apos;l xaritasi ko&apos;rinishi: 📍boshlanish → raqamli bekatlar → 🏁finish; <strong>progress halqasi</strong> (foiz) va muddatga qancha qolgani</li>
            <li><strong>Faol</strong> / <strong>Bajarilgan</strong> / <strong>Arxiv</strong> tablari; maqsadni yakunlash, arxivlash/qaytarish yoki o&apos;chirish (tasdiq bilan)</li>
          </ul>
        </Section>

        {/* ─── 11. Bajarilgan / O'chirilgan ──────────────────── */}
        <Section id="bajarilgan-ochirilgan" title="11. Bajarilgan va O'chirilgan">
          <h3>Bajarilgan bo&apos;limi</h3>
          <p className="text-faint">URL: <code>/bajarilgan</code></p>
          <p>
            DONE statusi belgilangan barcha vazifalar bu yerda saqlanadi. Kun
            bo&apos;ylab guruhlangan (yangilari yuqorida). Har bir vazifani:
          </p>
          <ul>
            <li><strong>Qaytarish</strong>: TODO statusiga qaytadi, asosiy ro&apos;yxatga ko&apos;chadi</li>
            <li><strong>O&apos;chirish</strong>: O&apos;chirilgan bo&apos;limga 30 kunga ko&apos;chadi</li>
          </ul>

          <h3>O&apos;chirilgan bo&apos;limi</h3>
          <p className="text-faint">URL: <code>/ochirilgan</code></p>
          <p>
            Yumshoq o&apos;chirilgan vazifalar bu yerda 30 kun saqlanadi.
            Tasodifan o&apos;chirib qo&apos;ygan reja yoki g&apos;oyalarni
            qaytarish uchun. Har bir element ostida{" "}
            <strong>necha kun qoldi</strong> ko&apos;rsatiladi.
          </p>
          <ul>
            <li><strong>Qaytarish</strong>: vazifa o&apos;z bo&apos;limiga qaytadi</li>
            <li><strong>Butunlay o&apos;chirish</strong>: qaytarib bo&apos;lmaydigan o&apos;chirish (tasdiqlash dialogi)</li>
            <li>30 kundan keyin avtomatik tozalanadi</li>
          </ul>
        </Section>

        {/* ─── 9. Sozlamalar ─────────────────────────────────── */}
        <Section id="sozlamalar" title="12. Sozlamalar">
          <p>
            Sozlamalar dialogini ochish: yuqori-o&apos;ng burchakdagi
            sozlamalar ikonkasini bosib. Dialog 4 qism bo&apos;limga ega:
          </p>

          <h3>Tovush effektlari</h3>
          <ul>
            <li>Yoqish/o&apos;chirish (toggle)</li>
            <li>Ovoz balandligi (0% dan 100% gacha)</li>
            <li>Yoqilganda: kichik test tovushi chalinadi</li>
            <li>Tovush qachon chalinadi: vazifa bajarganda</li>
          </ul>

          <h3>Bildirishnoma sozlamalari (Telegram orqali)</h3>
          <p>
            <strong>Necha daqiqa oldin (account default)</strong>: bot xabari
            vazifa vaqtidan qancha vaqt oldin yuborilishini tanlash —{" "}
            <strong>O&apos;z vaqtida</strong>, <strong>10</strong>,{" "}
            <strong>20</strong> yoki <strong>30 daqiqa</strong> avval.
            Default qiymat: 10 daqiqa avval. Bu barcha rejalarga taalluqli —
            agar reja Batafsilida boshqacha qiymat tanlanmagan bo&apos;lsa.
            O&apos;zgartirsangiz, hozircha yuborilmagan va alohida override
            qo&apos;yilmagan rejalarning eslatmalari yangi sozlamaga moslab
            qayta hisoblanadi.
          </p>
          <p className="text-faint">
            <strong>Per-task override</strong>: reja Batafsil dialogida{" "}
            <code>Eslatma: 5 daq. oldin</code> tugmasi bor — bosib 4 ta
            variant (O&apos;z vaqtida / 5 / 15 / 30 daqiqa avval) orasidan
            tanlash mumkin. Bu faqat shu rejaga taalluqli va account
            defaultidan ustun turadi.
          </p>
          <p>Muhimlik darajasi bo&apos;yicha alohida boshqarish:</p>
          <ul>
            <li><strong>Yuqori muhimlikdagi rejalar</strong> uchun bildirishnoma</li>
            <li><strong>O&apos;rta muhimlikdagi rejalar</strong> uchun bildirishnoma</li>
            <li><strong>Past muhimlikdagi rejalar</strong> uchun bildirishnoma</li>
            <li><strong>Muhimligi belgilanmagan rejalar</strong> uchun bildirishnoma</li>
          </ul>
          <p>Har biri alohida toggle: kerakli darajalarni yoqib qo&apos;yasiz.</p>

          <h3>Mavzu (tema)</h3>
          <p>Sozlamalar &rarr; <strong>Theme</strong> bo&apos;limida palitra va rejim tanlanadi.</p>
          <ul>
            <li><strong>5 ta palitra</strong>: Mono (default), Ocean, Graphite, Raspberry, Honey</li>
            <li>Har bir palitra <strong>Yorug&apos;</strong> va <strong>Qorong&apos;i</strong> rejimda ishlaydi</li>
            <li>Rejim tanlanmagan bo&apos;lsa, tizim sozlamasi kuzatiladi (<code>prefers-color-scheme</code>)</li>
          </ul>

          <h3>Shrift</h3>
          <p>5 ta variant orasida tanlash mumkin:</p>
          <ul>
            <li>Hanken Grotesk (default)</li>
            <li>Inter</li>
            <li>Geist</li>
            <li>Manrope</li>
            <li>Plus Jakarta Sans</li>
          </ul>

          <h3>Chiqish</h3>
          <p>
            Sozlamalar dialogining pastida <strong>Chiqish</strong> tugmasi:
            sessiyani tugatadi va <code>/kirish</code> sahifasiga yo&apos;naltiradi.
          </p>
        </Section>

        {/* ─── 10. Telegram bot ─────────────────────────────── */}
        <Section id="telegram-bot" title="13. Telegram bot">
          <p>
            Unumly bot: <code>@unumlybot</code>: uch ish bajaradi: kirish
            uchun OTP yuborish, vaqt belgilangan rejalar uchun bildirishnoma
            jo&apos;natish va <strong>Tezkor ro&apos;yhatlar</strong>{" "}
            uchun item qabul qilish.
          </p>
          <p>
            <strong>/start</strong> komandasini bossangiz xush kelibsiz
            xabari + Mini App tugmasi keladi. Boshqa har qanday oddiy matn
            esa <strong>Tezkor ro&apos;yhatga item</strong> sifatida
            qo&apos;shiladi (login bo&apos;lgan foydalanuvchilar uchun).
          </p>

          <h3>Bildirishnomalar qanday ishlaydi</h3>
          <ul>
            <li>
              Vaqt belgilangan reja belgilangan vaqtga yaqinlashganda bot
              xabar yuboradi — <strong>default 5 daqiqa oldin</strong>{" "}
              (Sozlamalardan O&apos;z vaqtida, 5, 15 yoki 30 daqiqaga
              o&apos;zgartirish mumkin)
            </li>
            <li>
              Xabar matnida vazifaning asl vaqti va &quot;X daq. qoldi&quot;
              hisobi ko&apos;rsatiladi — tayyorlanishga ulgurish uchun
            </li>
            <li>
              Har bildirishnoma ostida ikkita tugma bo&apos;ladi:{" "}
              <strong>&quot;Bajarildi&quot;</strong> va{" "}
              <strong>&quot;Mini App&apos;da ochish&quot;</strong>
            </li>
            <li>
              <strong>&quot;Bajarildi&quot;</strong> tugmasini bossangiz, reja
              to&apos;g&apos;ridan-to&apos;g&apos;ri Telegram ichidan DONE
              statusiga o&apos;tadi: sayt yoki Mini App ochish kerak emas
            </li>
            <li>
              <strong>&quot;Mini App&apos;da ochish&quot;</strong>: Telegram
              ichida ilovani ochib batafsil ishlash uchun
            </li>
          </ul>

          <h3>Qachon bildirishnoma kelmaydi</h3>
          <ul>
            <li>Rejaga vaqt belgilanmagan bo&apos;lsa</li>
            <li>
              Sozlamalarda shu muhimlik darajasi uchun bildirishnoma
              o&apos;chirilgan bo&apos;lsa
            </li>
            <li>Reja allaqachon bajarilgan yoki o&apos;chirilgan bo&apos;lsa</li>
          </ul>

          <h3>Tezkor ro&apos;yhatlar uchun bot</h3>
          <ul>
            <li>
              Botga oddiy matn yuborsangiz, u <strong>Tezkor</strong>{" "}
              ro&apos;yhatga item bo&apos;lib qo&apos;shiladi
            </li>
            <li>
              Multiline xabar yuborsangiz, har qator alohida item
              bo&apos;ladi
            </li>
            <li>
              Oxirgi xabardan 3 daqiqa o&apos;tgach, bot summarysini
              yuboradi: <strong>[Nom kiritish]</strong> va{" "}
              <strong>[O&apos;chirish]</strong> tugmalari bilan
            </li>
            <li>
              Tafsilotlar 6-bo&apos;limda (Tezkor)
            </li>
          </ul>
        </Section>

        {/* ─── 11. Ma'lumotlar va xavfsizlik ────────────────── */}
        <Section id="malumotlar" title="14. Ma'lumotlar va xavfsizlik">
          <h3>Qaerda saqlanadi?</h3>
          <p>Ikki rejim bor:</p>
          <ul>
            <li>
              <strong>Kirgan foydalanuvchi (avtorizatsiya bilan)</strong>:
              barcha rejalar, g&apos;oyalar va kategoriyalar bulut bazasida
              (Postgres) saqlanadi. Qurilmalar orasida avtomatik
              sinxronlanadi.
            </li>
            <li>
              <strong>Kirmagan foydalanuvchi (mehmon)</strong>: rejalar faqat
              brauzer xotirasida (<code>localStorage</code>) saqlanadi. Boshqa
              qurilmaga ko&apos;chmaydi.
            </li>
          </ul>

          <h3>Birinchi kirishda nima bo&apos;ladi?</h3>
          <p>
            Mehmon sifatida ishlatib turgan paytda{" "}
            <code>localStorage</code>&apos;da rejalar to&apos;plangan bo&apos;lsa,
            birinchi kirishda ular avtomatik ravishda bulutga ko&apos;chiriladi:
            hech narsa yo&apos;qolmaydi.
          </p>

          <h3>Sinxronlash</h3>
          <ul>
            <li>O&apos;zgarish darhol UI&apos;da ko&apos;rinadi (optimistik UI)</li>
            <li>Keyin serverga jo&apos;natiladi</li>
            <li>Server xato qaytarsa: UI o&apos;zgarish bekor qilinadi (rollback)</li>
            <li>Har 20 sekundda fonda yangi ma&apos;lumotlar tortib olinadi</li>
          </ul>

          <h3>Xavfsizlik</h3>
          <ul>
            <li>Login Telegram orqali: saytda parol yoki SMS yo&apos;q</li>
            <li>Sessiya JWT bilan (httpOnly cookie, 30 kun)</li>
            <li>Telegram Mini App&apos;dagi <code>initData</code> server tomonda imzosi tekshiriladi</li>
            <li>OTP 10 daqiqada eskiradi, 5 ta noto&apos;g&apos;ri urinish: kod bloklanadi</li>
            <li>O&apos;chirish: yumshoq (30 kun qaytarish oynasi)</li>
          </ul>
        </Section>

        {/* ─── 12. FAQ ───────────────────────────────────────── */}
        <Section id="faq" title="15. Tez-tez so'raladigan savollar">
          <FaqList items={FAQS} />
        </Section>

        <section className="mt-16 rounded-lg border border-dashed border-border bg-subtle/30 px-6 py-8 text-center sm:px-10 sm:py-10">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint">
            Boshlash
          </p>
          <h2 className="mt-2 text-[20px] font-medium tracking-[-0.01em]">
            Tayyormisiz?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-muted">
            Hozir Telegram bot orqali kirib, birinchi rejani qo&apos;shing.
            Hech narsa o&apos;rnatish kerak emas.
          </p>
          <Link
            href="/kirish"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Kirish
            <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>

      {/* ─── Structured data: Breadcrumb + TechArticle + FAQPage + HowTo ─── */}
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
                  name: "Haqida",
                  item: "https://unumly.uz/haqida",
                },
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "TechArticle",
              headline: "Unumly: to'liq qo'llanma va dokumentatsiya",
              description:
                "Unumly ilovasidan foydalanish bo'yicha to'liq qo'llanma: ro'yxatdan o'tish, Bugun, Agenda, Kalendar, Reja, Bajarilgan, O'chirilgan bo'limlari, sozlamalar, Telegram bot va ma'lumotlar saqlash.",
              url: "https://unumly.uz/haqida",
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
              about: {
                "@type": "SoftwareApplication",
                name: "Unumly",
                applicationCategory: "ProductivityApplication",
                operatingSystem: "Web, Telegram Mini App",
              },
              mainEntityOfPage: {
                "@type": "WebPage",
                "@id": "https://unumly.uz/haqida",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
            {
              "@context": "https://schema.org",
              "@type": "HowTo",
              name: "Unumly'ga qanday ro'yxatdan o'tish kerak",
              description:
                "Telegram bot orqali Unumly'ga kirish bo'yicha 5 qadamli qo'llanma.",
              inLanguage: "uz",
              totalTime: "PT2M",
              step: SIGN_UP_STEPS.map((s, i) => ({
                "@type": "HowToStep",
                position: i + 1,
                name: s.name,
                text: s.text,
              })),
            },
          ]),
        }}
      />
    </>
  );
}

/* ─── Section primitive ──────────────────────────────────────── */
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="mb-16 scroll-mt-20 border-t border-border pt-10 first-of-type:border-t-0 first-of-type:pt-0"
    >
      <h2 className="mb-5 text-[clamp(1.25rem,2.5vw,1.65rem)] font-semibold tracking-[-0.015em]">
        {title}
      </h2>
      <div className="prose-unumly space-y-4 text-[15px] leading-[1.7] text-foreground/85 [&_code]:rounded [&_code]:bg-subtle [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-foreground [&_h3]:mt-7 [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:tracking-[-0.01em] [&_h3]:text-foreground [&_h4]:mt-5 [&_h4]:text-[15px] [&_h4]:font-semibold [&_h4]:text-foreground [&_li]:my-1 [&_li>strong]:text-foreground [&_li]:text-muted [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_p]:text-muted [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
