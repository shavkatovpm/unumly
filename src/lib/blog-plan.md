# Unumly Blog — Reja, Mezonlar, Mavzular

Manba: 2026-05-21 suhbat. Har blog yozilganda quyidagi tartibga qat'iy amal qilinadi.

---

## 1. SEO mezonlari (10)

**Kalit so'z va niyat:**
1. **Primary keyword** — o'zbekcha (lotin), search volume bor, raqobat o'rtacha
2. **Search intent** aniq — informational / how-to / comparison / tool
3. **Long-tail variant** (3–5 so'zli) — H2/H3 va body ichida tabiiy

**Texnik on-page:**
4. **Title tag** — 50–60 belgi, kalit so'z boshda, CTR magnet ("5 qadam", "to'liq qo'llanma", yil)
5. **Meta description** — 150–160 belgi, kalit so'z + foyda + CTA hissi
6. **URL slug** — qisqa, faqat kalit so'z; raqam yo'q
7. **H1 unikal**, faqat bitta; H2/H3 mantiqiy ierarxiya, har H2 alohida sub-topic

**Havola va texnik:**
8. **Internal linking** — kamida 3 ta tegishli ichki sahifa (`/blog/...`, `/dashboard`, `/haqida`)
9. **Schema markup** — `Article` + `BreadcrumbList` JSON-LD (FAQ bo'lsa `FAQPage` ham)
10. **Image SEO + Core Web Vitals** — alt text, descriptive filename, lazy load; LCP <2.5s, CLS <0.1

---

## 2. AEO mezonlari (10) — ChatGPT, Perplexity, Google AI Overview uchun

**To'g'ridan-to'g'ri javob:**
11. **Direct answer paragraph** — birinchi 40–60 so'zda asosiy savolga aniq javob
12. **Definition-first** — "X — bu …" formatdagi aniq ta'rif birinchi H2 ostida
13. **FAQ bo'limi** — 5–8 ta "People Also Ask" uslubidagi savol-javob, har biri 2–4 jumla

**LLM-friendly tuzilma:**
14. **Citable chunks** — har bir H2 bo'limi mustaqil o'qilganda ham mazmunli
15. **Step-by-step va raqamli ro'yxatlar** — LLM extraction-friendly (1. … 2. … 3. …)
16. **Comparison jadval** — solishtirish bo'lsa markdown table
17. **Conversational savol-sarlavhalar** — "X nima?", "Qachon foydalanish kerak?"

**Ishonch (E-E-A-T):**
18. **Muallif + sana + last-updated** — sahifa ostida ko'rinadigan
19. **Statistika + manba** — har bir fakt uchun tashqi link (Wikipedia, akademik, rasmiy)
20. **Original insight** — o'z tajriba, Unumly screenshot, O'zbekiston kontekstida farq

---

## 3. Majburiy qoidalar (har blogda)

### A. Tabiiy "odam yozgan" uslub
- Bir xil uzunlikdagi jumlalar yo'q — qisqa va uzun aralash
- "Moreover", "Furthermore", "In conclusion" tipidagi shablon o'tish so'zlari yo'q
- Birinchi shaxsda misol: "Men o'zim sinab ko'rdim…", "Bir hafta urinib ko'rgach…"
- O'zbek tilida tabiiy gap qurilishi — kalkalash (so'zma-so'z tarjima) yo'q
- Kichik nomukammallik OK: ritorik savol, qisqa fragment
- **Mezonlarga ZID kelmaydi** — H2/keyword/FAQ baribir bajariladi, faqat ohang odamcha

### B. Yolg'on ma'lumot — qat'iyan yo'q
- Har raqam/statistika manba bilan (link) yoki umuman yozilmaydi
- Tarixiy fakt, ism, sana — faqat tasdiqlagan holatda
- "X% odamlar…" agar manbasi yo'q — olib tashlanadi yoki "ko'p odamlar uchun"ga almashtiriladi
- Shubhali joyda — yozmaslik to'qishdan ustun

### C. Unumly'ga tabiiy CTA
**Matn ichida (organik):**
- 1–2 marta Unumly mavzuga uyg'un eslatiladi (echim/misol sifatida, reklama emas)
- Spam ohang yo'q ("Unumly eng yaxshi!"); echim ohangi ha ("Unumly'da bu shunday ko'rinadi")

**Vizual:**
- Maqola o'rtasida Unumly UI screenshot — mavzuni illyustratsiya qiladi

**Yakuniy CTA — 2 ta tugma (majburiy, yonma-yon)**

Har blog oxirida ikkita parallel CTA bo'ladi — foydalanuvchi o'zi qulay kanalni tanlasin:

1. **Bot orqali foydalanish** → `https://t.me/unumlybot`
   - Birlamchi (primary) tugma
   - Matn varianti: "Telegram botda boshlash", "Botda ochish", "Telegram orqali davom etish"
   - Sabab: O'zbekistonda Telegram dominant; eslatmalar va "Bajardim" tugmasi to'g'ridan-to'g'ri botda ishlaydi
   - **Muhim:** bare URL (param yo'q) — webhook'da `param === "login"` shartiga tushmaydi, shuning uchun foydalanuvchi "Xush kelibsiz" + Mini App tugmasini oladi (kod EMAS). Web kirish oqimi `?start=login` URL'ida alohida ishlashda davom etadi (`src/app/api/telegram/webhook/route.ts`).

2. **Web orqali foydalanish** → mavzuga aloqador sahifa (`/bugun` — vazifalar/kunlik reja default; `/kalendar` — time-blocking; `/haqida` — umumiy)
   - Ikkilamchi (secondary) tugma
   - Matn varianti: "Saytda boshlash", "Saytda ochish", "Brauzerda davom etish"
   - Sabab: katta ekran, mufassal rejalashtirish, klaviatura
   - Eslatma: Unumly'da `/dashboard` yo'q; asosiy ish sahifasi `/bugun`

Vizual: tugmalar yonma-yon (mobile'da ustma-ust); primary to'liq rangda, secondary outline/ghost. Mavzuga moslashtirilgan kontekst matni: "Pomodoro" maqolasida — "Pomodoro taymerini bot yoki saytda ishga tushiring"; "Ishlarni yozib borish" maqolasida — "Vazifalarni yozishni boshlang — bot yoki saytda".

**Muvozanat:** ~80% sof foydali kontent, ~20% Unumly integratsiya/CTA.

---

## 4. Mavzular ro'yxati (15)

### Pillar (keng auditoriya)
1. **Vaqtni boshqarish — boshlovchilar uchun to'liq qo'llanma** · `vaqtni boshqarish` · hub-page
2. **Maqsad qo'yish — SMART metodi bo'yicha amaliy qo'llanma** · `smart maqsad` · AEO definitional

### Reja ierarxiyasi (mavjud "kunlik" bilan to'plam)
3. **Haftalik rejalashtirish — yakshanba kechqurun 30 daqiqada** · `haftalik reja` · weekly view
4. **Oylik va yillik rejalar — uzoq muddatli maqsadlar tizimi** · `yillik reja` · Unumly unique feature

### Pain-point
5. **Prokrastinatsiya — ishni keyinga qoldirishdan qanday qutulish** · `prokrastinatsiya` · eslatma+bosqichlar
6. **Burnout — charchash belgilari va undan saqlanish rejasi** · `burnout` · reja chegarasi

### Framework (AEO oltin koni)
7. **Eisenhower matritsasi — muhim va shoshilinch ishlarni ajratish** · `eisenhower matritsasi` · priority/labels
8. **Deep work — chuqur ish konsepsiyasi va telefonsiz fokus** · `deep work` · fokus + pomodoro

### Niche audience
9. **Talaba uchun kunni rejalashtirish — imtihon va o'qishni muvozanatlash** · `talaba uchun reja` · countdown
10. **Odat shakllantirish — 21 kun afsonasi va haqiqiy ilm** · `odat shakllantirish` · tracking/streak

### Ilova izlovchilar (bottom-of-funnel, conversion)
Format: qidiruv niyati = "ilova kerak", Unumly funksiyasi to'g'ridan-to'g'ri javob. Comparison emas — solution landing.
11. **Vaqtni rejalash ilovasi — kunni qulay boshqarish uchun yechim** · `vaqtni rejalash ilovasi` · kunlik reja + time-blocking
12. **Telegram bot orqali rejalashtirish — ilova va bot bitta tizimda** · `telegram orqali reja` · Telegram OTP + bot eslatma
13. **Ishlarni yozib borish uchun ilova — o'zbek tilidagi vazifa menejeri** · `ishlarni yozib borish` · vazifa CRUD + tracking
14. **Eslatmali planner ilova — har vazifa o'z vaqtida bildirishnoma bilan** · `eslatma ilova` · priority notifications + bot "Bajardim"
15. **Maqsad qo'yish va kuzatish ilovasi — yillik maqsadlardan kunlik vazifagacha** · `maqsad qoyish ilova` · kun→hafta→oy→yil ierarxiya

---

## 5. Yozish tartibi (5 faza)

**Faza 1 — Foundation (traffic):** 1, 3, 4 — pillar + reja ierarxiyasi to'liq bo'ladi
**Faza 2 — Pain magnets:** 5, 7 — prokrastinatsiya, eisenhower
**Faza 3 — Conversion:** 11, 12, 14 — vaqt-rejalash ilovasi + Telegram + eslatma (high-intent)
**Faza 4 — Depth:** 2, 8, 10 — SMART, deep work, odat
**Faza 5 — Niche + qolgan conversion:** 6, 9, 13, 15 — burnout, talaba, vazifa menejeri, maqsad ilovasi

---

## 6. Mavjud bloglar (saqlanadi, kerak bo'lsa yangilanadi)

- `kunlik-rejalashtirish` — Kunlik rejalashtirish: 5 qadamda samarali kun
- `time-blocking` — Time blocking — vaqt blok usuli
- `pomodoro-texnikasi` — Pomodoro texnikasi — 25 daqiqalik fokus

Yangi 15 ta yozilgach, eski 3 tasini ham shu mezonlarga tekshirib yangilash kerak.
