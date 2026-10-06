/**
 * 구조화 로거. production에서는 JSON 한 줄로 출력해 로그 수집기에서 파싱하기 쉽게 한다.
 */
type Level = "debug" | "info" | "warn" | "error";

function serializeError(err: unknown) {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack };
  return { value: String(err) };
}

function write(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const entry: Record<string, unknown> = { level, msg, time: new Date().toISOString(), ...meta };
  if (meta?.err) entry.err = serializeError(meta.err);
  const line = process.env.NODE_ENV === "production" ? JSON.stringify(entry) : `[${level}] ${msg}`;
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (process.env.NODE_ENV === "production") out(line);
  else out(line, meta ?? "");
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write("error", msg, meta),
};
