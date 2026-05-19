import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admode/"],
    },
    sitemap: "https://unumly.uz/sitemap.xml",
    host: "https://unumly.uz",
  };
}
