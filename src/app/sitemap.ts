import type { MetadataRoute } from "next";

const BASE = "https://unumly.uz";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`,                            lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/haqida`,                      lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/blog`,                        lastModified: now, changeFrequency: "weekly",  priority: 0.7,
      alternates: { languages: { uz: `${BASE}/blog`, ru: `${BASE}/blog/ru` } } },
    { url: `${BASE}/blog/ru`,                     lastModified: now, changeFrequency: "weekly",  priority: 0.6,
      alternates: { languages: { uz: `${BASE}/blog`, ru: `${BASE}/blog/ru` } } },
    { url: `${BASE}/blog/vaqtni-boshqarish`,      lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/blog/teskari-fikrlash`,       lastModified: now, changeFrequency: "monthly", priority: 0.7,
      alternates: { languages: { uz: `${BASE}/blog/teskari-fikrlash`, ru: `${BASE}/blog/ru/obratnoe-myshlenie` } } },
    { url: `${BASE}/blog/ru/obratnoe-myshlenie`,  lastModified: now, changeFrequency: "monthly", priority: 0.7,
      alternates: { languages: { uz: `${BASE}/blog/teskari-fikrlash`, ru: `${BASE}/blog/ru/obratnoe-myshlenie` } } },
    { url: `${BASE}/blog/kunlik-rejalashtirish`,  lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/blog/time-blocking`,          lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/blog/pomodoro-texnikasi`,     lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];
}
