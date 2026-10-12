/**
 * Threads 예약 발행 프로그램(내 컴퓨터 전용 웹 화면).
 * 127.0.0.1에만 열리고, 다른 사이트가 이 서버를 몰래 부르지 못하도록 Host·Origin·전용 헤더를 검사한다.
 */
import { spawn } from "node:child_process";
import http from "node:http";
import { z } from "zod";
import { checkPost, composeText } from "./compliance.js";
import { bodyBudget, generateDrafts, testClaude } from "./draft.js";
import { Scheduler, recoverInterrupted } from "./scheduler.js";
import { ProductInputSchema, type Data, type Post } from "./schema.js";
import { loadSettings, maskSecrets, settingsFromInput, writeSettings } from "./settings.js";
import { addLog, newId, newPost, nowIso, Store } from "./store.js";
import { ThreadsClient, ThreadsError } from "./threads.js";

const HOST = "127.0.0.1";
const START_PORT = Number(process.env.PORT ?? 4949);

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 1_000_000) throw new HttpError(413, "요청이 너무 큽니다.");
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "잘못된 요청입니다.");
  }
}

const EDITABLE: Post["status"][] = ["draft", "failed", "canceled"];

function findPost(data: Data, id: string): Post {
  const post = data.posts.find((p) => p.id === id);
  if (!post) throw new HttpError(404, "글을 찾을 수 없습니다.");
  return post;
}

type Handler = (req: http.IncomingMessage, url: URL) => Promise<unknown>;

function buildRoutes(store: Store, scheduler: Scheduler): Record<string, Handler> {
  const Id = z.object({ id: z.string() });

  return {
    "GET /api/state": async () => {
      const settings = await loadSettings();
      const data = await store.read();
      return { settings: maskSecrets(settings), ...data, scheduler: scheduler.lastTick, now: nowIso() };
    },

    "POST /api/settings": async (req) => {
      const next = await settingsFromInput(await readBody(req));
      await writeSettings(next);
      return maskSecrets(next);
    },
    "POST /api/test/claude": async (req) => ({ message: await testClaude((await settingsFromInput(await readBody(req))).claude) }),

    /** 토큰으로 내 Threads 계정을 확인하고 사용자 ID를 저장한다 */
    "POST /api/threads/connect": async () => {
      const settings = await loadSettings();
      const me = await new ThreadsClient(settings.threads.accessToken).me();
      settings.threads.userId = me.id;
      settings.threads.username = me.username ?? "";
      settings.threads.tokenCheckedAt = nowIso();
      await writeSettings(settings);
      return { message: `@${me.username ?? me.id} 계정과 연결되었습니다.`, settings: maskSecrets(settings) };
    },
    "POST /api/threads/refresh": async () => {
      const settings = await loadSettings();
      const res = await new ThreadsClient(settings.threads.accessToken).refreshToken();
      settings.threads.accessToken = res.access_token;
      settings.threads.tokenCheckedAt = nowIso();
      await writeSettings(settings);
      const days = Math.round(res.expires_in / 86400);
      return { message: `토큰을 연장했습니다. 약 ${days}일 동안 쓸 수 있어요.` };
    },
    "GET /api/threads/limit": async () => {
      const settings = await loadSettings();
      if (!settings.threads.userId) throw new HttpError(400, "먼저 설정에서 '연결 확인'을 눌러 주세요.");
      return { limit: await new ThreadsClient(settings.threads.accessToken).publishingLimit(settings.threads.userId) };
    },

    "POST /api/products": async (req) => {
      const body = z.object({ id: z.string().optional() }).passthrough().parse(await readBody(req));
      const input = ProductInputSchema.parse(body);
      return store.update((data) => {
        const at = nowIso();
        if (body.id) {
          const product = data.products.find((p) => p.id === body.id);
          if (!product) throw new HttpError(404, "상품을 찾을 수 없습니다.");
          Object.assign(product, input, { updatedAt: at });
          return product;
        }
        const product = { ...input, id: newId(), createdAt: at, updatedAt: at };
        data.products.unshift(product);
        return product;
      });
    },
    "POST /api/products/delete": async (req) => {
      const { id } = Id.parse(await readBody(req));
      return store.update((data) => {
        if (data.posts.some((p) => p.productId === id && (p.status === "scheduled" || p.status === "publishing"))) {
          throw new HttpError(400, "예약된 글이 있는 상품은 지울 수 없습니다. 예약을 먼저 취소하세요.");
        }
        data.products = data.products.filter((p) => p.id !== id);
        return { ok: true };
      });
    },

    "POST /api/drafts/generate": async (req) => {
      const { productId, count, request } = z
        .object({ productId: z.string(), count: z.number().int().min(1).max(5).default(3), request: z.string().max(500).default("") })
        .parse(await readBody(req));
      const settings = await loadSettings();
      const product = (await store.read()).products.find((p) => p.id === productId);
      if (!product) throw new HttpError(404, "상품을 찾을 수 없습니다.");
      const drafts = await generateDrafts(product, settings, count, request);
      return store.update((data) => {
        const created = drafts.map((d) => {
          const post = newPost({ productId, body: d.body.trim(), linkUrl: product.affiliateUrl });
          post.log[0].message = `Claude 초안 생성 (${d.angle})`;
          return post;
        });
        data.posts.unshift(...created);
        return { posts: created };
      });
    },
    "GET /api/drafts/budget": async (_req, url) => {
      const settings = await loadSettings();
      return { budget: bodyBudget({ affiliateUrl: url.searchParams.get("link") ?? "" }, settings) };
    },

    "POST /api/posts/check": async (req) => {
      const { body, linkUrl } = z.object({ body: z.string(), linkUrl: z.string() }).parse(await readBody(req));
      return checkPost(body, linkUrl, await loadSettings());
    },
    "POST /api/posts": async (req) => {
      const input = z
        .object({ id: z.string().optional(), productId: z.string().nullable().default(null), body: z.string().max(5000), linkUrl: z.string().max(2000) })
        .parse(await readBody(req));
      return store.update((data) => {
        if (!input.id) {
          const post = newPost({ productId: input.productId, body: input.body, linkUrl: input.linkUrl });
          post.log[0].message = "직접 작성";
          data.posts.unshift(post);
          return post;
        }
        const post = findPost(data, input.id);
        if (!EDITABLE.includes(post.status)) throw new HttpError(400, "예약된 글은 고칠 수 없습니다. 예약을 먼저 취소하세요.");
        post.body = input.body;
        post.linkUrl = input.linkUrl;
        if (post.status !== "draft") {
          post.status = "draft";
          post.lastError = null;
        }
        addLog(post, "info", "수정");
        return post;
      });
    },

    /**
     * 사람이 최종 글을 확인했다는 표시(confirmed)와 함께 예약한다. 여러 개면 간격을 두고 차례로 잡는다.
     * 검사(광고 표시·글자 수·링크)를 통과하지 못한 글이 하나라도 있으면 아무것도 예약하지 않는다.
     */
    "POST /api/posts/schedule": async (req) => {
      const { ids, startAt, intervalMinutes, confirmed } = z
        .object({
          ids: z.array(z.string()).min(1).max(100),
          startAt: z.string().datetime({ offset: true }),
          intervalMinutes: z.number().int().min(0).max(10080).default(60),
          confirmed: z.literal(true, { message: "최종 글을 확인했다는 체크가 필요합니다." }),
        })
        .parse(await readBody(req));
      void confirmed;
      const settings = await loadSettings();
      const start = Date.parse(startAt);
      if (start < Date.now() - 60_000) throw new HttpError(400, "예약 시간이 이미 지났습니다.");

      return store.update((data) => {
        const posts = ids.map((id) => findPost(data, id));
        const problems: string[] = [];
        for (const post of posts) {
          if (!EDITABLE.includes(post.status)) problems.push(`'${post.body.slice(0, 15)}…': 이미 예약·발행된 글`);
          const check = checkPost(post.body, post.linkUrl, settings);
          for (const issue of check.issues.filter((i) => i.level === "error")) problems.push(`'${post.body.slice(0, 15)}…': ${issue.message}`);
        }
        if (problems.length) throw new HttpError(400, `예약하지 못했습니다.\n${problems.join("\n")}`);

        const at = new Date();
        posts.forEach((post, i) => {
          post.status = "scheduled";
          post.approvedText = composeText(post.body, post.linkUrl, settings.disclosure);
          post.approvedAt = nowIso(at);
          post.scheduledAt = nowIso(new Date(start + i * intervalMinutes * 60_000));
          post.attempts = 0;
          post.nextAttemptAt = null;
          post.containerId = null;
          post.lastError = null;
          addLog(post, "info", `확인 후 예약: ${post.scheduledAt}`, at);
        });
        return { posts };
      });
    },
    "POST /api/posts/unschedule": async (req) => {
      const { id } = Id.parse(await readBody(req));
      return store.update((data) => {
        const post = findPost(data, id);
        if (post.status !== "scheduled") throw new HttpError(400, "예약된 글만 취소할 수 있습니다.");
        post.status = "draft";
        post.approvedText = null;
        post.approvedAt = null;
        post.scheduledAt = null;
        post.nextAttemptAt = null;
        addLog(post, "info", "예약 취소 → 초안");
        return post;
      });
    },
    "POST /api/posts/delete": async (req) => {
      const { id } = Id.parse(await readBody(req));
      return store.update((data) => {
        const post = findPost(data, id);
        if (post.status === "scheduled" || post.status === "publishing") throw new HttpError(400, "예약을 먼저 취소하세요.");
        data.posts = data.posts.filter((p) => p.id !== id);
        return { ok: true };
      });
    },
    "POST /api/scheduler/tick": async () => {
      await scheduler.tick();
      return { scheduler: scheduler.lastTick };
    },
  };
}

function checkRequest(req: http.IncomingMessage, port: number) {
  const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (!allowedHosts.includes(req.headers.host ?? "")) throw new HttpError(403, "허용되지 않은 주소입니다.");
  const origin = req.headers.origin;
  if (origin && !allowedHosts.some((h) => origin === `http://${h}`)) throw new HttpError(403, "허용되지 않은 요청입니다.");
  if (req.method !== "GET" && req.headers["x-threads-app"] !== "1") throw new HttpError(403, "허용되지 않은 요청입니다.");
}

function send(res: http.ServerResponse, status: number, body: string, type: string) {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
  });
  res.end(body);
}

function openBrowser(url: string) {
  const [cmd, args] =
    process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true }).on("error", () => {}).unref();
  } catch {
    // 브라우저를 못 열어도 주소를 안내하므로 괜찮다.
  }
}

export async function startServer(loadUi: () => Promise<string>, port = START_PORT, tries = 10) {
  const store = new Store();
  const scheduler = new Scheduler(store, () => loadSettings());
  const settings = await loadSettings();
  await recoverInterrupted(store, settings.threads.accessToken ? new ThreadsClient(settings.threads.accessToken) : null);
  const routes = buildRoutes(store, scheduler);

  let current = port;
  const server = http.createServer(async (req, res) => {
    try {
      checkRequest(req, current);
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        return send(res, 200, await loadUi(), "text/html; charset=utf-8");
      }
      const handler = routes[`${req.method} ${url.pathname}`];
      if (!handler) throw new HttpError(404, "없는 주소입니다.");
      send(res, 200, JSON.stringify(await handler(req, url)), "application/json; charset=utf-8");
    } catch (err) {
      const status =
        err instanceof HttpError ? err.status : err instanceof z.ZodError ? 400 : err instanceof ThreadsError ? (err.transient ? 502 : 400) : 500;
      const message =
        err instanceof z.ZodError ? err.issues.map((i) => i.message).join("\n") : err instanceof Error ? err.message : String(err);
      if (status >= 500) console.error(err);
      send(res, status, JSON.stringify({ error: message }), "application/json; charset=utf-8");
    }
  });
  server.requestTimeout = 0; // 초안 생성은 1분 넘게 걸릴 수 있다.
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && tries-- > 0) {
      current += 1;
      server.listen(current, HOST);
    } else {
      console.error(`❌ 프로그램을 시작하지 못했습니다: ${err.message}`);
      process.exit(1);
    }
  });
  server.listen(current, HOST, () => {
    const url = `http://localhost:${current}`;
    console.log("");
    console.log("  🧵 Threads 예약 발행 프로그램이 켜졌습니다.");
    console.log(`  👉 브라우저에서 ${url} 를 여세요. (자동으로 열립니다)`);
    console.log("  ⏰ 예약 글은 이 창이 켜져 있는 동안에만 올라갑니다. 끄려면 창을 닫거나 Ctrl+C.");
    console.log("");
    scheduler.start();
    if (!process.argv.includes("--no-open")) openBrowser(url);
  });
}
