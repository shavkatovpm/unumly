import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Haqida — Unumly nima va u qanday ishlaydi",
  description:
    "Unumly — kunlik, haftalik, oylik va yillik ishlarni rejalashtirish uchun o'zbekcha minimalistik ilova. Lokal saqlash, ro'yxatdan o'tish shart emas, bepul.",
  alternates: { canonical: "/haqida" },
  openGraph: {
    title: "Haqida — Unumly",
    description:
      "Kunlik vazifalarni rejalashtirish va kuzatish uchun o'zbekcha ilova haqida batafsil.",
    url: "https://unumly.uz/haqida",
  },
};

const FAQS = [
  {
    q: "Unumly nima?",
    a: "Unumly — kunlik, haftalik, oylik va yillik ishlarni rejalashtirish, boshqarish va bajarish uchun mo'ljallangan o'zbek tilidagi minimalistik ilova. Brauzer orqali ishlaydi, hech qanday yuklab olish kerak emas.",
  },
  {
    q: "Ma'lumotlarim qaerda saqlanadi?",
    a: "Hozircha barcha rejalar foydalanuvchi qurilmasidagi brauzer xotirasida (localStorage) saqlanadi. Bu sizning ma'lumotlaringiz hech qanday serverga yuborilmasligini va to'liq sizniki bo'lib qolishini anglatadi.",
  },
  {
    q: "Ro'yxatdan o'tish kerakmi?",
    a: "Yo'q. Unumly'da ro'yxatdan o'tish, login yoki parol kerak emas. Sahifani ochishingiz va darhol foydalanishni boshlashingiz mumkin.",
  },
  {
    q: "Pul to'lash kerakmi?",
    a: "Yo'q. Unumly to'liq bepul va keyinchalik ham asosiy funksiyalar bepul qoladi. Hech qanday yashirin to'lov yoki obuna yo'q.",
  },
  {
    q: "Qanday qurilmalarda ishlaydi?",
    a: "Zamonaviy brauzerga ega bo'lgan har qanday qurilmada — kompyuter, telefon, planshet. Chrome, Safari, Firefox, Edge — barchasida bir xil ishlaydi.",
  },
  {
    q: "Unumly'ning Kalendaridan qanday foydalanish mumkin?",
    a: "Kalendar bo'limida hafta, oy va yil ko'rinishlarini almashtirib turish mumkin. Hafta ko'rinishida har bir soat ustiga bosib yangi vazifa qo'shasiz; drag-and-drop bilan task'larni boshqa kun yoki vaqtga ko'chirasiz.",
  },
  {
    q: "Ilovani ochsam, rejam yo'qolmaydimi?",
    a: "Yo'q — rejalar localStorage'da turadi va siz brauzer tarixini tozalamaguningizcha saqlanadi. Kelajakda akkaunt orqali bulutga zaxiralash imkoniyati qo'shiladi.",
  },
];

export default function HaqidaPage() {
  return (
    <>
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
        <nav className="mb-12">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint hover:text-foreground"
          >
            ← Bosh sahifa
          </Link>
        </nav>

        <header className="mb-10">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-faint">
            Haqida
          </p>
          <h1 className="mt-3 text-balance text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.05] tracking-[-0.025em]">
            Unumly — kunlik ishlarni rejalashtirish ilovasi
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
            Unumly — o&apos;zbek tilidagi minimalistik productivity ilovasi. Bir kun,
            bir hafta, bir oy yoki bir yilingizdagi vazifalarni bitta toza
            interfeysda boshqaring. Hech qanday ortiqcha tugma, ro&apos;yxatdan o&apos;tish
            yoki to&apos;lov yo&apos;q.
          </p>
        </header>

        <section className="mb-12 space-y-6">
          <h2 className="text-[20px] font-semibold tracking-[-0.01em]">
            Asosiy imkoniyatlar
          </h2>
          <ul className="space-y-3 text-[14.5px] leading-relaxed text-muted">
            <li>
              <strong className="text-foreground">Bugun</strong> — bir kunlik
              rejalaringiz. Vaqt belgilash, muhimlik darajasi, bajarildi belgisi.
            </li>
            <li>
              <strong className="text-foreground">Agenda</strong> — ertangi kun
              va undan keyingi yaqin kunlardagi rejalar. Bir nuqtadan barchasini
              ko&apos;rib turish.
            </li>
            <li>
              <strong className="text-foreground">Kalendar</strong> — kun, hafta,
              oy va yil ko&apos;rinishlari. Drag bilan slot belgilash, drag-and-drop
              orqali ko&apos;chirish.
            </li>
            <li>
              <strong className="text-foreground">Reja</strong> — kategoriyalar
              bo&apos;yicha uzoq muddatli rejalar va g&apos;oyalar. Tab yoki Kanban
              ko&apos;rinishida.
            </li>
          </ul>
        </section>

        <section className="mb-12 space-y-6">
          <h2 className="text-[20px] font-semibold tracking-[-0.01em]">
            Tez-tez so&apos;raladigan savollar
          </h2>
          <div className="divide-y divide-border/70 rounded-lg border border-border bg-surface">
            {FAQS.map((f, i) => (
              <details
                key={i}
                className="group px-4 py-3 [&[open]>summary>span:last-child]:rotate-45"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-[14px] font-medium">
                  <span className="flex-1">{f.q}</span>
                  <span className="grid size-5 shrink-0 place-items-center text-[18px] leading-none text-faint transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <Link
            href="/bugun"
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Bugundan boshlash
            <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>

      {/* FAQ structured data for AEO (ChatGPT, Perplexity, Google AI Overview) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: f.a,
              },
            })),
          }),
        }}
      />
    </>
  );
}
