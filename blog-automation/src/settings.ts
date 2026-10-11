import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SettingsSchema, type Settings } from "./schema.js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SETTINGS_PATH = path.join(ROOT, "settings.json");
const BLOG_CONFIG_PATH = path.join(ROOT, "blog.config.json");

/** 비밀 값 자리. 화면에는 실제 값 대신 이 표시만 내려보낸다. */
export const SECRET_MASK = "••••••••";

type Json = Record<string, unknown>;

async function readJson(file: string): Promise<Json> {
  if (!existsSync(file)) return {};
  return JSON.parse(await readFile(file, "utf8")) as Json;
}

function fromEnv(env: NodeJS.ProcessEnv): Json {
  const out: Json = {};
  if (env.BLOG_PROVIDER) out.provider = env.BLOG_PROVIDER;
  const claude: Json = {};
  if (env.ANTHROPIC_API_KEY) claude.apiKey = env.ANTHROPIC_API_KEY;
  if (env.CLAUDE_MODEL) claude.model = env.CLAUDE_MODEL;
  const ollama: Json = {};
  if (env.OLLAMA_HOST) ollama.host = env.OLLAMA_HOST;
  if (env.OLLAMA_MODEL) ollama.model = env.OLLAMA_MODEL;
  const wordpress: Json = {};
  if (env.WP_URL) wordpress.url = env.WP_URL;
  if (env.WP_USERNAME) wordpress.username = env.WP_USERNAME;
  if (env.WP_APP_PASSWORD) wordpress.appPassword = env.WP_APP_PASSWORD;
  if (Object.keys(claude).length) out.claude = claude;
  if (Object.keys(ollama).length) out.ollama = ollama;
  if (Object.keys(wordpress).length) out.wordpress = wordpress;
  if (env.BLOG_WEBHOOK_URL) out.webhookUrl = env.BLOG_WEBHOOK_URL;
  return out;
}

/** 깊은 병합: 뒤쪽 값이 이긴다. 배열은 통째로 바꾼다. */
export function merge(...layers: Json[]): Json {
  const out: Json = {};
  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer)) {
      const prev = out[key];
      out[key] =
        value && typeof value === "object" && !Array.isArray(value) && prev && typeof prev === "object" && !Array.isArray(prev)
          ? merge(prev as Json, value as Json)
          : value;
    }
  }
  return out;
}

/** 기본값 ← blog.config.json(공용 블로그 성격) ← 환경 변수 ← settings.json(내 컴퓨터 설정) */
export async function loadSettings(env = process.env): Promise<Settings> {
  const blogConfig = await readJson(BLOG_CONFIG_PATH);
  const { wordpress, ...blog } = blogConfig;
  const base: Json = { blog, ...(wordpress ? { wordpress } : {}) };
  return SettingsSchema.parse(merge(base, fromEnv(env), await readJson(SETTINGS_PATH)));
}

/** 화면에서 받은 값을 저장한다. 비밀 칸이 마스크 그대로면 기존 값을 유지한다. */
export async function saveSettings(input: unknown): Promise<Settings> {
  const current = SettingsSchema.parse(await readJson(SETTINGS_PATH));
  const next = SettingsSchema.parse(input);
  if (next.claude.apiKey === SECRET_MASK) next.claude.apiKey = current.claude.apiKey;
  if (next.wordpress.appPassword === SECRET_MASK) next.wordpress.appPassword = current.wordpress.appPassword;
  await writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2) + "\n", { mode: 0o600 });
  return next;
}

export function maskSecrets(settings: Settings): Settings {
  return {
    ...settings,
    claude: { ...settings.claude, apiKey: settings.claude.apiKey ? SECRET_MASK : "" },
    wordpress: { ...settings.wordpress, appPassword: settings.wordpress.appPassword ? SECRET_MASK : "" },
  };
}
