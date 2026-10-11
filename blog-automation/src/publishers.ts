import { marked } from "marked";
import type { BlogConfig, Post } from "./schema.js";

export interface PublishResult {
  target: string;
  url?: string;
}

/**
 * WordPress REST API. 관리자 화면 → 사용자 → 프로필 → "애플리케이션 비밀번호"로 만든 값을 쓴다.
 * WP_URL, WP_USERNAME, WP_APP_PASSWORD가 모두 있을 때만 동작한다.
 */
export async function publishToWordPress(post: Post, config: BlogConfig): Promise<PublishResult | null> {
  const { WP_URL, WP_USERNAME, WP_APP_PASSWORD } = process.env;
  if (!WP_URL || !WP_USERNAME || !WP_APP_PASSWORD) return null;

  const base = `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2`;
  const headers = {
    "content-type": "application/json",
    authorization: `Basic ${Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString("base64")}`,
  };

  async function wp<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${base}${path}`, { ...init, headers });
    if (!res.ok) throw new Error(`WordPress ${path} 실패 (${res.status}): ${await res.text()}`);
    return (await res.json()) as T;
  }

  const tagIds: number[] = [];
  for (const name of post.tags) {
    const found = await wp<{ id: number; name: string }[]>(`/tags?search=${encodeURIComponent(name)}&per_page=100`);
    const exact = found.find((t) => t.name === name);
    tagIds.push(exact ? exact.id : (await wp<{ id: number }>("/tags", { method: "POST", body: JSON.stringify({ name }) })).id);
  }

  const created = await wp<{ link: string }>("/posts", {
    method: "POST",
    body: JSON.stringify({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: await marked.parse(post.markdown),
      status: config.wordpress.status,
      tags: tagIds,
      categories: config.wordpress.categoryIds,
    }),
  });
  return { target: `WordPress (${config.wordpress.status})`, url: created.link };
}

/**
 * 범용 웹훅. Make·Zapier·n8n 시나리오로 받아 네이버 블로그·티스토리·Notion 등에 이어 붙인다.
 * BLOG_WEBHOOK_URL이 있을 때만 동작한다.
 */
export async function publishToWebhook(post: Post): Promise<PublishResult | null> {
  const url = process.env.BLOG_WEBHOOK_URL;
  if (!url) return null;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...post, html: await marked.parse(post.markdown) }),
  });
  if (!res.ok) throw new Error(`웹훅 전송 실패 (${res.status}): ${await res.text()}`);
  return { target: "웹훅" };
}
