import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * 고정 윈도우 rate limiter. Postgres UPSERT 한 번으로 원자적으로 동작하므로
 * 여러 서버 인스턴스에서도 일관된다.
 * @returns 허용되면 true
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = new Date();
  const reset = new Date(now.getTime() + windowSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${reset})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${reset} ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  return (rows[0]?.count ?? 0) <= limit;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** 기능별 기본 한도 (횟수, 초) */
export const limits = {
  login: [10, 15 * 60],
  signup: [5, 60 * 60],
  friendRequest: [30, 60 * 60],
  comment: [30, 10 * 60],
  like: [120, 60],
  guestbook: [20, 10 * 60],
  post: [20, 10 * 60],
  upload: [60, 10 * 60],
  report: [20, 60 * 60],
  follow: [60, 60 * 60],
} as const satisfies Record<string, readonly [number, number]>;

/** 테스트/스테이징에서 한도를 늘리기 위한 배수 (기본 1, production에서는 설정하지 않는다) */
const multiplier = Math.max(1, Number(process.env.RATE_LIMIT_MULTIPLIER ?? 1) || 1);

export async function checkLimit(name: keyof typeof limits, subject: string) {
  const [count, windowSec] = limits[name];
  return rateLimit(`${name}:${subject}`, count * multiplier, windowSec);
}
