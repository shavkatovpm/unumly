import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Unumly: Kunlik ishlarni rejalashtirish ilovasi",
    short_name: "Unumly",
    description:
      "Kunlik, haftalik, oylik va yillik vazifalarni rejalashtirish, boshqarish va bajarish uchun o'zbekcha minimalistik ilova.",
    start_url: "/bugun",
    display: "standalone",
    background_color: "#FAFAF9",
    theme_color: "#1A1A19",
    lang: "uz",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon.png",       sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/logo.png",       sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    categories: ["productivity", "lifestyle"],
  };
}
