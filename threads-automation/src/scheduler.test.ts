import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { plan, publishPost, recoverInterrupted } from "./scheduler.js";
import { SettingsSchema, type Post } from "./schema.js";
import { newPost, Store } from "./store.js";
import { ThreadsClient } from "./threads.js";

const schedule = { maxPerDay: 3, minGapMinutes: 30, missedGraceMinutes: 60 };
const NOW = new Date("2026-10-12T12:00:00Z");
const min = (m: number) => new Date(NOW.getTime() + m * 60_000).toISOString();

function scheduled(id: string, at: string, extra: Partial<Post> = {}): Post {
  return { ...newPost({ productId: null, body: "b", linkUrl: "https://link.coupang.com/a/x" }), id, status: "scheduled", approvedText: "광고\n\nb", scheduledAt: at, ...extra };
}
function published(id: string, at: string): Post {
  return { ...scheduled(id, at), status: "published", publishedAt: at };
}

describe("plan", () => {
  it("시간이 된 글 중 가장 이른 것 하나를 고른다", () => {
    const p = plan([scheduled("b", min(-5)), scheduled("a", min(-10)), scheduled("c", min(10))], NOW, schedule);
    expect(p.next).toBe("a");
  });

  it("다시 시도 시간이 안 된 글은 건너뛴다", () => {
    const p = plan([scheduled("a", min(-10), { attempts: 1, nextAttemptAt: min(5) })], NOW, schedule);
    expect(p.next).toBeNull();
  });

  it("꺼져 있던 동안 오래 지난 글은 놓침으로 처리하고, 켜져 있는 동안 기다린 글은 아니다", () => {
    const old = scheduled("old", min(-120));
    expect(plan([old], NOW, schedule).missed).toEqual(["old"]);
    // 프로그램이 3시간 전부터 켜져 있었다면 한도 때문에 기다린 것이므로 놓친 게 아니다.
    expect(plan([old], NOW, schedule, new Date(NOW.getTime() - 3 * 3600_000)).next).toBe("old");
  });

  it("24시간 한도와 최소 간격을 지킨다", () => {
    const due = scheduled("a", min(-1));
    expect(plan([due, published("p1", min(-100)), published("p2", min(-200)), published("p3", min(-300))], NOW, schedule).waiting).toContain("한도");
    expect(plan([due, published("p1", min(-10))], NOW, schedule).waiting).toContain("간격");
    expect(plan([due, published("p1", min(-31))], NOW, schedule).next).toBe("a");
  });
});

/** 가짜 Threads 서버: 호출을 기록하고 정해 둔 응답을 돌려준다 */
function fakeThreads(script: Record<string, (url: URL) => { status?: number; body: unknown }>) {
  const calls: string[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const key = `${init?.method ?? "GET"} ${url.pathname.replace("/v1.0", "")}`;
    calls.push(key);
    const handler = script[key] ?? Object.entries(script).find(([k]) => new RegExp(`^${k}$`).test(key))?.[1];
    if (!handler) return new Response(JSON.stringify({ error: { message: `no route ${key}` } }), { status: 404 });
    const r = handler(url);
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  }) as typeof fetch;
  return { client: new ThreadsClient("token", fetchImpl), calls };
}

async function setup(post: Post) {
  const dir = await mkdtemp(path.join(tmpdir(), "threads-"));
  const store = new Store(path.join(dir, "data.json"));
  await store.update((d) => void d.posts.push(post));
  const settings = SettingsSchema.parse({ threads: { accessToken: "token", userId: "42" } });
  return { store, settings };
}

describe("publishPost", () => {
  it("컨테이너 → 상태 확인 → 발행 순서로 올리고 기록을 남긴다", async () => {
    const { store, settings } = await setup(scheduled("a", min(-1)));
    const { client, calls } = fakeThreads({
      "GET /42/threads_publishing_limit": () => ({ body: { data: [{ quota_usage: 1, config: { quota_total: 250 } }] } }),
      "POST /42/threads": (url) => {
        expect(url.searchParams.get("media_type")).toBe("TEXT");
        expect(url.searchParams.get("text")).toBe("광고\n\nb");
        expect(url.searchParams.get("link_attachment")).toBe("https://link.coupang.com/a/x");
        return { body: { id: "c1" } };
      },
      "GET /c1": () => ({ body: { status: "FINISHED" } }),
      "POST /42/threads_publish": () => ({ body: { id: "m1" } }),
      "GET /m1": () => ({ body: { permalink: "https://www.threads.com/@me/post/x" } }),
    });
    const result = await publishPost("a", { store, settings, client, now: () => NOW, sleep: async () => {} });
    expect(result.status).toBe("published");
    expect(result.mediaId).toBe("m1");
    expect(result.permalink).toContain("threads.com");
    expect(calls).toEqual(["GET /42/threads_publishing_limit", "POST /42/threads", "GET /c1", "POST /42/threads_publish", "GET /m1"]);
  });

  it("서버 오류는 나중에 다시 시도하도록 예약 상태로 돌린다", async () => {
    const { store, settings } = await setup(scheduled("a", min(-1)));
    const { client } = fakeThreads({
      "GET /42/threads_publishing_limit": () => ({ body: {} }),
      "POST /42/threads": () => ({ status: 500, body: { error: { message: "boom" } } }),
    });
    const result = await publishPost("a", { store, settings, client, now: () => NOW, sleep: async () => {} });
    expect(result.status).toBe("scheduled");
    expect(result.attempts).toBe(1);
    expect(result.nextAttemptAt).toBe(min(2));
  });

  it("토큰 만료처럼 다시 해도 안 되는 오류는 바로 실패로 남긴다", async () => {
    const { store, settings } = await setup(scheduled("a", min(-1)));
    const { client } = fakeThreads({
      "GET /42/threads_publishing_limit": () => ({ body: {} }),
      "POST /42/threads": () => ({ status: 400, body: { error: { message: "expired", code: 190 } } }),
    });
    const result = await publishPost("a", { store, settings, client, now: () => NOW, sleep: async () => {} });
    expect(result.status).toBe("failed");
    expect(result.lastError).toContain("토큰");
  });

  it("이미 만든 컨테이너가 있으면 새로 만들지 않고, 이미 발행됐으면 다시 올리지 않는다", async () => {
    const { store, settings } = await setup(scheduled("a", min(-1), { attempts: 1, containerId: "c9" }));
    const { client, calls } = fakeThreads({
      "GET /42/threads_publishing_limit": () => ({ body: {} }),
      "GET /c9": () => ({ body: { status: "PUBLISHED" } }),
    });
    const result = await publishPost("a", { store, settings, client, now: () => NOW, sleep: async () => {} });
    expect(result.status).toBe("published");
    expect(calls).not.toContain("POST /42/threads");
    expect(calls).not.toContain("POST /42/threads_publish");
  });
});

describe("recoverInterrupted", () => {
  it("발행 도중 꺼진 글은 자동으로 다시 올리지 않고 실패로 남긴다", async () => {
    const { store } = await setup(scheduled("a", min(-1), { status: "publishing" }));
    await recoverInterrupted(store, null, NOW);
    const post = (await store.read()).posts[0];
    expect(post.status).toBe("failed");
    expect(post.lastError).toContain("확인");
  });
});
