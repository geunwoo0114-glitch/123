import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Data, Post, PostLog } from "./schema.js";
import { ROOT } from "./settings.js";

export const DATA_PATH = path.join(ROOT, "data.json");

/**
 * 상품·글을 JSON 파일 하나에 둔다. 화면 요청과 예약 발행이 동시에 고칠 수 있으므로
 * 모든 변경은 update()로 한 줄로 세워 처리하고, 임시 파일에 쓴 뒤 바꿔치기해서 반쯤 쓰인 파일이 남지 않게 한다.
 */
export class Store {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private file = DATA_PATH) {}

  async read(): Promise<Data> {
    if (!existsSync(this.file)) return { products: [], posts: [] };
    const data = JSON.parse(await readFile(this.file, "utf8")) as Partial<Data>;
    return { products: data.products ?? [], posts: data.posts ?? [] };
  }

  update<T>(fn: (data: Data) => T | Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const data = await this.read();
      const result = await fn(data);
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
      await rename(tmp, this.file);
      return result;
    });
    this.queue = run.catch(() => {});
    return run;
  }
}

export function newId(): string {
  return randomUUID().slice(0, 8);
}

export function nowIso(now = new Date()): string {
  return now.toISOString();
}

export function addLog(post: Post, level: PostLog["level"], message: string, now = new Date()) {
  post.log.push({ at: nowIso(now), level, message });
  if (post.log.length > 50) post.log.splice(0, post.log.length - 50);
  post.updatedAt = nowIso(now);
}

export function newPost(fields: { productId: string | null; body: string; linkUrl: string }, now = new Date()): Post {
  const at = nowIso(now);
  return {
    id: newId(),
    productId: fields.productId,
    body: fields.body,
    linkUrl: fields.linkUrl,
    status: "draft",
    approvedText: null,
    approvedAt: null,
    scheduledAt: null,
    attempts: 0,
    nextAttemptAt: null,
    containerId: null,
    mediaId: null,
    permalink: null,
    publishedAt: null,
    lastError: null,
    log: [{ at, level: "info", message: "초안 생성" }],
    createdAt: at,
    updatedAt: at,
  };
}
