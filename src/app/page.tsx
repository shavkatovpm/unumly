import Hero from "@/components/landing/hero";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col">
      <Hero />

      {/* Crawler/AEO-friendly content: visually subtle, semantically rich */}
      <section
        aria-label="Unumly haqida qisqacha"
        className="sr-only"
      >
        <h2>Unumly nima?</h2>
        <p>
          Unumly: o&apos;zbek tilidagi minimalistik productivity ilovasi.
          Kunlik, haftalik, oylik va yillik vazifalarni rejalashtirish,
          boshqarish va bajarish uchun mo&apos;ljallangan. Ro&apos;yxatdan o&apos;tish
          shart emas, hech qanday to&apos;lov yo&apos;q, barcha rejalar
          foydalanuvchining qurilmasida (localStorage) saqlanadi.
        </p>

        <h2>Asosiy imkoniyatlar</h2>
        <ul>
          <li>
            <strong>Bugun</strong>: bir kunlik vazifalar ro&apos;yxati, vaqt
            belgilash va muhimlik darajasi bilan.
          </li>
          <li>
            <strong>Agenda</strong>: yaqin kunlarning rejalarini bir nuqtadan
            ko&apos;rish.
          </li>
          <li>
            <strong>Kalendar</strong>: kun, hafta, oy va yil ko&apos;rinishlari;
            drag-and-drop bilan rejalarni ko&apos;chirish.
          </li>
          <li>
            <strong>Reja</strong>: kategoriyalar bo&apos;yicha uzoq muddatli
            rejalar, Tab yoki Kanban ko&apos;rinishida.
          </li>
        </ul>

        <h2>Kim uchun?</h2>
        <p>
          Unumly: o&apos;quvchilar, talabalar, freelancerlar, kichik biznes
          egalari va kundalik vazifalarini tartibga solishni xohlovchi har
          qanday kishi uchun. Ortiqcha imkoniyatlar yo&apos;q: faqat
          rejalashtirish va bajarish.
        </p>
      </section>

      <footer className="px-6 pb-5 pt-3 text-center text-[10px] uppercase tracking-[0.15em] text-faint sm:pb-6 sm:text-[10.5px]">
        © {new Date().getFullYear()} unumly.uz
      </footer>
    </main>
  );
}
