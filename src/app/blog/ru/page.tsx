import type { Metadata } from "next";
import {
  BLOG_INDEX_PATHS,
  BLOG_POSTS_RU,
  blogAlternates,
} from "@/lib/blog-posts";
import { BlogIndex } from "@/components/blog/index-page";

export const metadata: Metadata = {
  title: "Блог о продуктивности и планировании",
  description:
    "Блог Unumly на русском: планирование дня, управление временем, тайм-блокинг, Помодоро и приёмы мышления, которые помогают доводить задуманное до конца.",
  alternates: blogAlternates(BLOG_INDEX_PATHS, "ru"),
  openGraph: {
    type: "website",
    locale: "ru_RU",
    title: "Блог Unumly",
    description:
      "Планирование дня, управление временем и методы продуктивности — статьи на русском языке.",
    url: "https://unumly.uz/blog/ru",
  },
};

export default function BlogRuPage() {
  return (
    <BlogIndex
      lang="ru"
      posts={BLOG_POSTS_RU}
      h1="О времени и планировании"
      lead="Статьи о планировании дня, управлении временем и способах доводить задуманное до конца — с примерами и разбором методов."
      blogName="Блог Unumly"
      blogDescription="Планирование дня, управление временем и методы продуктивности — статьи на русском языке."
    />
  );
}
