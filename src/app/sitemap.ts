import type { MetadataRoute } from "next";
import {
  BLOG_INDEX_PATHS,
  BLOG_PATHS,
  type BlogLang,
} from "@/lib/blog-posts";

const BASE = "https://unumly.uz";
const LANGS: BlogLang[] = ["uz", "ru", "en"];

/** Bir maqolaning uch tildagi URL'lari — har biri o'zaro alternates bilan. */
function localized(paths: Record<BlogLang, string>, now: Date) {
  const languages = Object.fromEntries(
    LANGS.map((l) => [l, `${BASE}${paths[l]}`]),
  );
  return LANGS.map((l) => ({
    url: `${BASE}${paths[l]}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: l === "uz" ? 0.7 : 0.65,
    alternates: { languages },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const blogIndexLanguages = Object.fromEntries(
    LANGS.map((l) => [l, `${BASE}${BLOG_INDEX_PATHS[l]}`]),
  );

  return [
    { url: `${BASE}/`,       lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/haqida`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },

    ...LANGS.map((l) => ({
      url: `${BASE}${BLOG_INDEX_PATHS[l]}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: l === "uz" ? 0.7 : 0.65,
      alternates: { languages: blogIndexLanguages },
    })),

    ...Object.values(BLOG_PATHS).flatMap((paths) => localized(paths, now)),
  ];
}
