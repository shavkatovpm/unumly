import type { Metadata } from "next";
import {
  BLOG_INDEX_PATHS,
  BLOG_POSTS,
  blogAlternates,
} from "@/lib/blog-posts";
import { BlogIndex } from "@/components/blog/index-page";

export const metadata: Metadata = {
  title: "Blog: Productivity va vaqt boshqarish haqida",
  description:
    "Unumly blogi: vaqt boshqarish, rejalashtirish va samaradorlik haqida o'zbek tilidagi maqolalar. Time blocking, Pomodoro, kunlik reja tuzish va boshqalar.",
  alternates: blogAlternates(BLOG_INDEX_PATHS, "uz"),
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    title: "Blog: Unumly",
    description:
      "Vaqt boshqarish, rejalashtirish va samaradorlik haqida o'zbek tilidagi maqolalar.",
    url: "https://unumly.uz/blog",
  },
};

export default function BlogPage() {
  return (
    <BlogIndex
      lang="uz"
      posts={BLOG_POSTS}
      h1="Vaqt va rejalashtirish haqida"
      lead="Vaqtni boshqarish, kunlik rejalashtirish, samaradorlik uslublari va Unumly ilovasidan unumli foydalanish bo'yicha o'zbekcha maqolalar."
      blogName="Unumly Blog"
      blogDescription="Vaqt boshqarish, kunlik rejalashtirish va samaradorlik haqida o'zbek tilidagi maqolalar."
    />
  );
}
