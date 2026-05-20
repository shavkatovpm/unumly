import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Manrope,
  Plus_Jakarta_Sans,
  Hanken_Grotesk,
  Instrument_Serif,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  weight: "400",
  subsets: ["latin"],
});

const BOOT_SCRIPT = `
try {
  var f = localStorage.getItem('unumly:font:v1');
  var fmap = {
    inter:   'var(--font-inter)',
    geist:   'var(--font-geist)',
    manrope: 'var(--font-manrope)',
    jakarta: 'var(--font-jakarta)',
    hanken:  'var(--font-hanken)'
  };
  var fv = (f && fmap[f]) ? fmap[f] : 'var(--font-hanken)';
  document.documentElement.style.setProperty('--font-sans', fv);
} catch(e) {}
try {
  var t = localStorage.getItem('unumly:theme:v1');
  if (t === 'noir') {
    document.documentElement.dataset.theme = 'noir';
  } else if (!t && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.dataset.theme = 'noir';
  }
} catch(e) {}
`;

export const metadata: Metadata = {
  metadataBase: new URL("https://unumly.uz"),
  title: {
    default: "Unumly — Kunlik ishlarni rejalashtirish ilovasi",
    template: "%s · Unumly",
  },
  description:
    "Kunlik, haftalik, oylik va yillik vazifalarni rejalashtirish, boshqarish va bajarish uchun o'zbekcha ilova. Lokal saqlash, ro'yxatdan o'tish shart emas, minimalistik dizayn.",
  applicationName: "Unumly",
  keywords: [
    "rejalashtirish ilovasi",
    "kunlik ishlar",
    "vazifalar boshqarish",
    "kalendar ilovasi",
    "to-do o'zbekcha",
    "kunlik reja",
    "ish reja qilish",
    "vaqt boshqarish",
    "productivity uz",
    "task manager uz",
    "unumly",
  ],
  authors: [{ name: "Unumly" }],
  creator: "Unumly",
  publisher: "Unumly",
  category: "productivity",
  alternates: {
    canonical: "/",
    languages: {
      "uz-UZ": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: "https://unumly.uz",
    siteName: "Unumly",
    title: "Unumly — Kunlik ishlarni rejalashtirish ilovasi",
    description:
      "Vaqtingizni unumli boshqaring: rejalashtiring, boshqaring, bajaring. Kunlik, haftalik, oylik va yillik rejalar uchun minimalistik o'zbekcha ilova.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Unumly — kunlik ishlarni rejalashtirish ilovasi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Unumly — Kunlik ishlarni rejalashtirish ilovasi",
    description:
      "Vaqtingizni unumli boshqaring: rejalashtiring, boshqaring, bajaring.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF9" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1A19" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="uz"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${manrope.variable} ${jakarta.variable} ${hanken.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* JSON-LD: Organization + WebSite + SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "Unumly",
                url: "https://unumly.uz",
                logo: "https://unumly.uz/opengraph-image",
                sameAs: [],
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "Unumly",
                url: "https://unumly.uz",
                inLanguage: "uz-UZ",
                potentialAction: {
                  "@type": "SearchAction",
                  target: "https://unumly.uz/?q={search_term_string}",
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                name: "Unumly",
                operatingSystem: "Web",
                applicationCategory: "ProductivityApplication",
                inLanguage: "uz",
                description:
                  "Kunlik, haftalik, oylik va yillik vazifalarni rejalashtirish, boshqarish va bajarish uchun o'zbekcha ilova. Lokal saqlash, ro'yxatdan o'tish shart emas.",
                url: "https://unumly.uz",
                image: "https://unumly.uz/opengraph-image",
                featureList: [
                  "Kunlik ishlar ro'yxati (Bugun)",
                  "Yaqin kunlar ro'yxati (Agenda)",
                  "Hafta va Kun ko'rinishida kalendar",
                  "Oy va Yil ko'rinishida kalendar",
                  "Kategoriyalar bo'yicha rejalar (Reja)",
                  "Muhimlik darajalari va vaqt belgilash",
                  "Drag-and-drop bilan reja ko'chirish",
                  "Lokal saqlash, ro'yxatdan o'tish shart emas",
                ],
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "UZS",
                  availability: "https://schema.org/InStock",
                },
              },
            ]),
          }}
        />
        {children}
      </body>
    </html>
  );
}
