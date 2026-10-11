/**
 * 블로그 자동화 프로그램(내 컴퓨터 전용 웹 화면).
 * 127.0.0.1에만 열리고, 다른 사이트가 이 서버를 몰래 부르지 못하도록 Host·Origin·전용 헤더를 검사한다.
 */
import { spawn } from "node:child_process";
import http from "node:http";
import { marked } from "marked";
import { z } from "zod";
import { listPosts, readPost, readTopics, updatePost, writePost, writeTopics } from "./pipeline.js";
import { listOllamaModels, testClaude } from "./providers.js";
import { publishAll, testWordPress } from "./publishers.js";
import { PostSchema, SettingsSchema, type Settings } from "./schema.js";
import { loadSettings, maskSecrets, saveSettings, SECRET_MASK } from "./settings.js";

const HOST = "127.0.0.1";
const START_PORT = Number(process.env.PORT ?? 4848);

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 2_000_000) throw new HttpError(413, "요청이 너무 큽니다.");
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

/** 화면에서 보낸 설정: 비밀 칸이 마스크면 저장된 값으로 채워서 쓴다(저장 전 "연결 확인"용). */
async function settingsFromBody(body: unknown): Promise<Settings> {
  const current = await loadSettings();
  const next = SettingsSchema.parse(body);
  if (next.claude.apiKey === SECRET_MASK) next.claude.apiKey = current.claude.apiKey;
  if (next.wordpress.appPassword === SECRET_MASK) next.wordpress.appPassword = current.wordpress.appPassword;
  return next;
}

type Handler = (req: http.IncomingMessage, url: URL) => Promise<unknown>;

const routes: Record<string, Handler> = {
  "GET /api/settings": async () => maskSecrets(await loadSettings()),
  "POST /api/settings": async (req) => maskSecrets(await saveSettings(await settingsFromBody(await readBody(req)))),

  "POST /api/test/claude": async (req) => ({ message: await testClaude((await settingsFromBody(await readBody(req))).claude) }),
  "POST /api/test/wordpress": async (req) => ({ message: await testWordPress(await settingsFromBody(await readBody(req))) }),
  "GET /api/ollama/models": async (_req, url) => ({
    models: await listOllamaModels(url.searchParams.get("host") ?? (await loadSettings()).ollama.host),
  }),

  "GET /api/topics": async () => ({ text: await readTopics() }),
  "POST /api/topics": async (req) => {
    const { text } = z.object({ text: z.string() }).parse(await readBody(req));
    await writeTopics(text);
    return { ok: true };
  },

  "GET /api/posts": async () => ({ posts: await listPosts() }),
  "GET /api/post": async (_req, url) => {
    const { post, meta } = await readPost(url.searchParams.get("file") ?? "");
    return { post, meta, html: await marked.parse(post.markdown) };
  },
  "POST /api/post": async (req) => {
    const { file, post } = z.object({ file: z.string(), post: PostSchema }).parse(await readBody(req));
    await updatePost(file, post);
    return { ok: true, html: await marked.parse(post.markdown) };
  },

  "POST /api/generate": async (req) => {
    const { topic, extra, provider } = z
      .object({ topic: z.string().optional(), extra: z.string().optional(), provider: z.enum(["claude", "ollama"]).optional() })
      .parse(await readBody(req));
    const settings = await loadSettings();
    if (provider) settings.provider = provider;
    const written = await writePost(settings, { topic, extra });
    if (!written) throw new HttpError(400, "남은 주제가 없습니다. 주제를 직접 입력하거나 글감 목록에 추가하세요.");
    return { ...written, html: await marked.parse(written.post.markdown) };
  },
  "POST /api/publish": async (req) => {
    const { file } = z.object({ file: z.string() }).parse(await readBody(req));
    const settings = await loadSettings();
    const { post } = await readPost(file);
    const results = await publishAll(post, settings);
    if (results.length === 0) throw new HttpError(400, "발행할 곳이 없습니다. 설정에서 WordPress나 웹훅을 넣어 주세요.");
    return { results };
  },
};

function checkRequest(req: http.IncomingMessage, port: number) {
  const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (!allowedHosts.includes(req.headers.host ?? "")) throw new HttpError(403, "허용되지 않은 주소입니다.");
  const origin = req.headers.origin;
  if (origin && !allowedHosts.some((h) => origin === `http://${h}`)) throw new HttpError(403, "허용되지 않은 요청입니다.");
  if (req.method !== "GET" && req.headers["x-blog-app"] !== "1") throw new HttpError(403, "허용되지 않은 요청입니다.");
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

function createServer(port: () => number, loadUi: () => Promise<string>) {
  return http.createServer(async (req, res) => {
    try {
      checkRequest(req, port());
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        return send(res, 200, await loadUi(), "text/html; charset=utf-8");
      }
      const handler = routes[`${req.method} ${url.pathname}`];
      if (!handler) throw new HttpError(404, "없는 주소입니다.");
      send(res, 200, JSON.stringify(await handler(req, url)), "application/json; charset=utf-8");
    } catch (err) {
      const status = err instanceof HttpError ? err.status : err instanceof z.ZodError ? 400 : 500;
      const message =
        err instanceof z.ZodError ? `입력값을 확인하세요: ${err.issues.map((i) => i.path.join(".")).join(", ")}` : err instanceof Error ? err.message : String(err);
      if (status >= 500) console.error(err);
      send(res, status, JSON.stringify({ error: message }), "application/json; charset=utf-8");
    }
  });
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

/** 화면(HTML)을 어디서 읽을지는 실행 방식에 따라 다르다: 개발은 ui/ 파일, 실행 파일은 내장 문자열. */
export function startServer(loadUi: () => Promise<string>, port = START_PORT, tries = 10) {
  let current = port;
  const server = createServer(() => current, loadUi);
  server.requestTimeout = 0; // 글쓰기는 몇 분 걸릴 수 있다.
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
    console.log("  ✨ 블로그 자동화 프로그램이 켜졌습니다.");
    console.log(`  👉 브라우저에서 ${url} 를 여세요. (자동으로 열립니다)`);
    console.log("  ⏹  끄려면 이 창을 닫거나 Ctrl+C를 누르세요.");
    console.log("");
    if (!process.argv.includes("--no-open")) openBrowser(url);
  });
}

