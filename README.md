# unumly.uz

Kunlik, haftalik, oylik va yillik rejalaringizni bir joyda tartibga soluvchi minimalist productivity ilovasi.

> **Hozirgi holat — Lokal rejim**
> Ma'lumotlar brauzeringizning `localStorage`'iga saqlanadi. Ro'yxatdan o'tish, baza yoki internet ulanishi shart emas. Neon DB va Google OAuth keyinroq qo'shiladi.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** (warm-stone + soft emerald design tokens)
- **Framer Motion** + custom CSS uchun ozgina nozik animatsiyalar
- _(Yotgan rejim)_: Prisma 6 + Neon + Auth.js scaffolding mavjud, lekin hozir ishlatilmaydi

## Boshlash

```bash
npm install
npm run dev
```

→ http://localhost:3000

Tamom — boshqa hech narsa shart emas. "Boshlash" tugmasini bosing va rejalaringizni yozishni boshlang.

## Komandalar

| Command | Tavsif |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (prisma generate avtomatik) |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run db:studio` | Prisma Studio (DB GUI) |
| `npm run db:push` | Schema'ni DB ga tarqatish (migration yaratmasdan) |
| `npm run db:migrate` | Migration yaratish va qo'llash |
| `npm run db:deploy` | Production migration'larini qo'llash |
| `npm run db:reset` | DB ni reset qilish (ehtiyot bo'ling) |

## Loyiha tuzilishi

```
src/
├── app/
│   ├── (app)/                 ← auth-gated routes
│   │   ├── layout.tsx         ← header + auth check
│   │   └── dashboard/
│   ├── actions/               ← server actions (auth, plans)
│   ├── api/auth/[...nextauth]/
│   ├── globals.css            ← design tokens
│   ├── layout.tsx             ← root layout
│   └── page.tsx               ← landing
├── components/
│   ├── app/                   ← dashboard komponentlari
│   ├── brand/                 ← wordmark va h.k.
│   └── ui/                    ← button, ikonlar
└── lib/
    ├── auth.ts                ← NextAuth config
    ├── dates.ts               ← sana yordamchilari
    ├── prisma.ts              ← Prisma client singleton
    └── utils.ts               ← cn() helper

prisma/
└── schema.prisma              ← User + Plan modellari
```

## MVP doirasi

- Google bilan kirish
- Reja CRUD (Kunlik / Haftalik / Oylik / Yillik)
- Bajarildi belgilash
- Tracking (qancha bajarilgan)

## Keyingi bosqichlar (post-MVP)

- Reja tafsilotlari (notes, due time, tags)
- Drag-and-drop tartiblash
- Finance moduli
- Pomodoro / fokus rejimi
- Telegram bot integratsiyasi
