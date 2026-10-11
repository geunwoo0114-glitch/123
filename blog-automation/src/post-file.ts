import { PostSchema, type Post } from "./schema.js";

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

export interface PostMeta {
  date: string;
  provider: string;
  topic: string;
}

/** Hugo·Jekyll·Astro 등 정적 블로그에 그대로 넣을 수 있는 front matter + 본문 */
export function toMarkdownFile(post: Post, meta: PostMeta): string {
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

/** toMarkdownFile로 만든 파일을 다시 읽는다(사람이 본문을 고친 뒤 발행할 때). */
export function fromMarkdownFile(text: string): { post: Post; meta: PostMeta } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) throw new Error("글 파일 머리말(---)을 찾지 못했습니다.");
  const fields: Record<string, unknown> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const raw = line.slice(i + 1).trim();
    try {
      fields[key] = JSON.parse(raw);
    } catch {
      fields[key] = raw;
    }
  }
  const post = PostSchema.parse({
    title: fields.title,
    slug: fields.slug,
    excerpt: fields.description ?? "",
    tags: fields.tags ?? [],
    markdown: m[2].trim(),
  });
  return {
    post,
    meta: {
      date: String(fields.date ?? ""),
      provider: String(fields.generator ?? ""),
      topic: String(fields.topic ?? ""),
    },
  };
}
