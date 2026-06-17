import { Landing } from "@/components/landing/landing";
import { LangProvider } from "@/components/landing/i18n";

export default function HomePage() {
  return (
    <>
      <LangProvider>
        <Landing />
      </LangProvider>

      {/* Crawler/AEO-friendly content: visually subtle, semantically rich */}
      <section aria-label="Unumly haqida qisqacha" className="sr-only">
        <h2>Unumly nima?</h2>
        <p>
          Unumly: o&apos;zbek tilidagi minimalistik reja va shaxsiy moliya
          ilovasi. Kunlik, haftalik, oylik va yillik vazifalarni
          rejalashtirish, odat qurish va maqsadlarga yetish, shuningdek
          daromad, xarajat va byudjetni boshqarish uchun mo&apos;ljallangan.
          Telegram orqali tez kirish, eslatmalar va bulutli sinxronizatsiya
          bilan.
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
          <li>
            <strong>Odat va Maqsad</strong>: takrorlanuvchi odatlar va OKR
            uslubidagi maqsadlar.
          </li>
          <li>
            <strong>Moliya</strong>: daromad va xarajatlarni yozish, byudjet
            tuzish va shaxsiy moliyani kuzatish.
          </li>
        </ul>

        <h2>Shaxsiy moliya va byudjet</h2>
        <p>
          Unumly moliya bo&apos;limi bilan pulingizni nazoratda tuting:
          daromadlaringizni qo&apos;shing, xarajatlaringizni toifalar
          bo&apos;yicha kuzating, oylik byudjet belgilang va pulingiz qayoqqa
          ketayotganini aniq ko&apos;ring. Rejalashtirish va moliya — bitta
          o&apos;zbek tilidagi ilovada.
        </p>

        <h2>Narx</h2>
        <p>
          Unumly bepul boshlanadi. Pro tarifi oyiga 27 000 so&apos;m: Telegram
          eslatmalari, bulutli sinxronizatsiya, Odat, Maqsad va Moliya
          modullari hamda barcha rang temalari. Aksiya: 1-iyulgacha Pro tarifi
          ham mutlaqo bepul.
        </p>

        <h2>Kim uchun?</h2>
        <p>
          Unumly: o&apos;quvchilar, talabalar, freelancerlar, kichik biznes
          egalari va kundalik vazifalari hamda shaxsiy moliyasini tartibga
          solishni xohlovchi har qanday kishi uchun.
        </p>
      </section>
    </>
  );
}
