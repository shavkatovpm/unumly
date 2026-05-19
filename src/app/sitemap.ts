import type { MetadataRoute } from "next";

const BASE = "https://unumly.uz";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`,           lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/haqida`,     lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/blog`,       lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/bugun`,      lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${BASE}/agenda`,     lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${BASE}/kalendar`,   lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${BASE}/reja`,       lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
  ];
}
