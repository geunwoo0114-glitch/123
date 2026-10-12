import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SettingsSchema, type Settings } from "./schema.js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SETTINGS_PATH = path.join(ROOT, "settings.json");

/** 비밀 값 자리. 화면에는 실제 값 대신 이 표시만 내려보낸다. */
export const SECRET_MASK = "••••••••";

export async function loadSettings(file = SETTINGS_PATH): Promise<Settings> {
  const json = existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : {};
  const settings = SettingsSchema.parse(json);
  // 설정에 키를 안 넣었으면 환경 변수를 쓴다(Claude SDK도 ANTHROPIC_API_KEY를 직접 읽는다).
  if (!settings.threads.accessToken && process.env.THREADS_ACCESS_TOKEN) settings.threads.accessToken = process.env.THREADS_ACCESS_TOKEN;
  return settings;
}

export async function writeSettings(settings: Settings, file = SETTINGS_PATH): Promise<void> {
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(settings, null, 2) + "\n", { mode: 0o600 });
  await rename(tmp, file);
}

/** 화면에서 받은 값: 비밀 칸이 마스크 그대로면 저장된 값을 유지한다. */
export async function settingsFromInput(input: unknown): Promise<Settings> {
  const current = await loadSettings();
  const next = SettingsSchema.parse(input);
  if (next.claude.apiKey === SECRET_MASK) next.claude.apiKey = current.claude.apiKey;
  if (next.threads.accessToken === SECRET_MASK) next.threads.accessToken = current.threads.accessToken;
  // 계정 정보는 '연결 확인'으로만 바뀐다. 토큰을 새로 넣었으면 다시 확인하도록 비운다.
  if (next.threads.accessToken !== current.threads.accessToken) {
    next.threads = { ...next.threads, userId: "", username: "", tokenCheckedAt: "" };
  } else {
    next.threads = { ...next.threads, userId: current.threads.userId, username: current.threads.username, tokenCheckedAt: current.threads.tokenCheckedAt };
  }
  return next;
}

export function maskSecrets(settings: Settings): Settings {
  return {
    ...settings,
    claude: { ...settings.claude, apiKey: settings.claude.apiKey ? SECRET_MASK : "" },
    threads: { ...settings.threads, accessToken: settings.threads.accessToken ? SECRET_MASK : "" },
  };
}
