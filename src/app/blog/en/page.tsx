import type { Metadata } from "next";
import {
  BLOG_INDEX_PATHS,
  BLOG_POSTS_EN,
  blogAlternates,
} from "@/lib/blog-posts";
import { BlogIndex } from "@/components/blog/index-page";

export const metadata: Metadata = {
  title: "Blog on productivity and planning",
  description:
    "The Unumly blog in English: daily planning, time management, time blocking, the Pomodoro Technique and thinking tools that keep plans alive.",
  alternates: blogAlternates(BLOG_INDEX_PATHS, "en"),
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Unumly Blog",
    description:
      "Daily planning, time management and productivity methods — practical guides in English.",
    url: "https://unumly.uz/blog/en",
  },
};

export default function BlogEnPage() {
  return (
    <BlogIndex
      lang="en"
      posts={BLOG_POSTS_EN}
      h1="On time and planning"
      lead="Practical guides on planning a day, managing time and finishing what you start — with examples and the trade-offs of each method."
      blogName="Unumly Blog"
      blogDescription="Daily planning, time management and productivity methods — practical guides in English."
    />
  );
}
