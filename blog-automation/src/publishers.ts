import { marked } from "marked";
import type { Post, Settings } from "./schema.js";

export interface PublishResult {
  target: string;
  url?: string;
}

export function hasWordPress(s: Settings): boolean {
  return Boolean(s.wordpress.url && s.wordpress.username && s.wordpress.appPassword);
}

/**
 * WordPress REST API. 관리자 화면 → 사용자 → 프로필 → "애플리케이션 비밀번호"로 만든 값을 쓴다.
 */
export async function publishToWordPress(post: Post, settings: Settings): Promise<PublishResult | null> {
  if (!hasWordPress(settings)) return null;
  const { url, username, appPassword, status, categoryIds } = settings.wordpress;

  const base = `${url.replace(/\/$/, "")}/wp-json/wp/v2`;
  const headers = {
    "content-type": "application/json",
    authorization: `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}`,
  };

  async function wp<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${base}${path}`, { ...init, headers });
    } catch {
      throw new Error(`WordPress(${url})에 연결하지 못했습니다. 주소를 확인하세요.`);
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("WordPress 로그인에 실패했습니다. 사용자 이름과 애플리케이션 비밀번호를 확인하세요.");
    }
    if (!res.ok) throw new Error(`WordPress ${path} 실패 (${res.status}): ${(await res.text()).slice(0, 300)}`);
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
      status,
      tags: tagIds,
      categories: categoryIds,
    }),
  });
  const label = { draft: "임시글", publish: "공개", pending: "검토 대기", private: "비공개" }[status];
  return { target: `WordPress (${label})`, url: created.link };
}

/**
 * 범용 웹훅. Make·Zapier·n8n 시나리오로 받아 네이버 블로그·티스토리·Notion 등에 이어 붙인다.
 */
export async function publishToWebhook(post: Post, settings: Settings): Promise<PublishResult | null> {
  if (!settings.webhookUrl) return null;
  let res: Response;
  try {
    res = await fetch(settings.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...post, html: await marked.parse(post.markdown) }),
    });
  } catch {
    throw new Error("웹훅 주소에 연결하지 못했습니다.");
  }
  if (!res.ok) throw new Error(`웹훅 전송 실패 (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return { target: "웹훅" };
}

export async function publishAll(post: Post, settings: Settings): Promise<PublishResult[]> {
  const results = [await publishToWordPress(post, settings), await publishToWebhook(post, settings)];
  return results.filter((r): r is PublishResult => r !== null);
}

/** 설정 화면의 "연결 확인" 버튼. 글은 올리지 않고 로그인만 해 본다. */
export async function testWordPress(settings: Settings): Promise<string> {
  if (!hasWordPress(settings)) throw new Error("WordPress 주소·사용자 이름·애플리케이션 비밀번호를 모두 넣어 주세요.");
  const { url, username, appPassword } = settings.wordpress;
  let res: Response;
  try {
    res = await fetch(`${url.replace(/\/$/, "")}/wp-json/wp/v2/users/me?context=edit`, {
      headers: { authorization: `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}` },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error(`WordPress(${url})에 연결하지 못했습니다. 주소를 확인하세요.`);
  }
  if (res.status === 401 || res.status === 403) throw new Error("로그인 실패: 사용자 이름과 애플리케이션 비밀번호를 확인하세요.");
  if (!res.ok) throw new Error(`WordPress 응답 오류 (${res.status}). 주소가 WordPress 사이트인지 확인하세요.`);
  const me = (await res.json()) as { name?: string };
  return `WordPress 연결 성공 (${me.name ?? username})`;
}
