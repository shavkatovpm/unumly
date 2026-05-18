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
  if (localStorage.getItem('unumly:theme:v1') === 'noir') {
    document.documentElement.dataset.theme = 'noir';
  }
} catch(e) {}
`;

export const metadata: Metadata = {
  title: "Unumly — Rejalaringizni tartibga soling",
  description:
    "Kunlik, haftalik, oylik va yillik rejalaringizni bir joyda yuriting. Tinch, sokin, estetik.",
  metadataBase: new URL("https://unumly.uz"),
};

export const viewport: Viewport = {
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
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
