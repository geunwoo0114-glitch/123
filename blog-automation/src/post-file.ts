import type { Post } from "./schema.js";

export function normalizeSlug(slug: string, fallback: string): string {
  const cleaned = slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return cleaned || fallback;
}

/** YYYY-MM-DD (Asia/Seoul) */
export function seoulDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
}

/** Hugo·Jekyll·Astro 등 정적 블로그에 그대로 넣을 수 있는 front matter + 본문 */
export function toMarkdownFile(post: Post, meta: { date: string; provider: string; topic: string }): string {
  const q = (s: string) => JSON.stringify(s);
  return [
    "---",
    `title: ${q(post.title)}`,
    `date: ${meta.date}`,
    `slug: ${q(post.slug)}`,
    `description: ${q(post.excerpt)}`,
    `tags: [${post.tags.map(q).join(", ")}]`,
    `topic: ${q(meta.topic)}`,
    `generator: ${q(meta.provider)}`,
    "draft: true",
    "---",
    "",
    post.markdown.trim(),
    "",
  ].join("\n");
}
