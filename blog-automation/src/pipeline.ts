import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeSlug, seoulDate, toMarkdownFile, fromMarkdownFile } from "./post-file.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { generate } from "./providers.js";
import type { Post, Settings } from "./schema.js";
import { ROOT } from "./settings.js";
import { markDone, nextTopic } from "./topics.js";

export const POSTS_DIR = path.join(ROOT, "posts");
export const TOPICS_PATH = path.join(ROOT, "topics.md");

export async function readTopics(): Promise<string> {
  return existsSync(TOPICS_PATH) ? readFile(TOPICS_PATH, "utf8") : "";
}

export async function writeTopics(text: string): Promise<void> {
  await writeFile(TOPICS_PATH, text);
}

export interface WrittenPost {
  fileName: string;
  topic: string;
  post: Post;
}

/**
 * 주제 하나로 글을 쓰고 posts/에 저장한다.
 * topic을 주지 않으면 topics.md의 다음 주제를 쓰고 완료 표시를 한다.
 */
export async function writePost(settings: Settings, opts: { topic?: string; extra?: string } = {}): Promise<WrittenPost | null> {
  const topicsMd = await readTopics();
  const fromQueue = !opts.topic?.trim();
  const topic = fromQueue ? nextTopic(topicsMd) : opts.topic!.trim();
  if (!topic) return null;

  const post = await generate(settings, {
    system: buildSystemPrompt(settings.blog),
    user: buildUserPrompt(topic, opts.extra),
  });

  const date = seoulDate();
  post.slug = normalizeSlug(post.slug, `post-${Date.now()}`);
  await mkdir(POSTS_DIR, { recursive: true });
  let fileName = `${date}-${post.slug}.md`;
  for (let n = 2; existsSync(path.join(POSTS_DIR, fileName)); n++) fileName = `${date}-${post.slug}-${n}.md`;
  await writeFile(path.join(POSTS_DIR, fileName), toMarkdownFile(post, { date, provider: settings.provider, topic }));

  if (fromQueue) await writeTopics(markDone(topicsMd, topic, fileName));
  return { fileName, topic, post };
}

/** posts/ 안의 파일 이름만 받는다(경로 이동 차단). */
export function postPath(fileName: string): string {
  if (!/^[\w.-]+\.md$/.test(fileName) || fileName.startsWith(".")) throw new Error("잘못된 파일 이름입니다.");
  return path.join(POSTS_DIR, fileName);
}

export async function listPosts(): Promise<{ fileName: string; title: string; date: string }[]> {
  if (!existsSync(POSTS_DIR)) return [];
  const names = (await readdir(POSTS_DIR)).filter((f) => f.endsWith(".md"));
  const withTime = await Promise.all(names.map(async (f) => ({ f, t: (await stat(path.join(POSTS_DIR, f))).mtimeMs })));
  const files = withTime.sort((a, b) => b.t - a.t).map((x) => x.f);
  const out = [];
  for (const fileName of files) {
    try {
      const { post, meta } = fromMarkdownFile(await readFile(path.join(POSTS_DIR, fileName), "utf8"));
      out.push({ fileName, title: post.title, date: meta.date });
    } catch {
      out.push({ fileName, title: fileName, date: "" });
    }
  }
  return out;
}

export async function readPost(fileName: string) {
  return fromMarkdownFile(await readFile(postPath(fileName), "utf8"));
}

export async function updatePost(fileName: string, post: Post): Promise<void> {
  const { meta } = await readPost(fileName);
  await writeFile(postPath(fileName), toMarkdownFile(post, meta));
}
