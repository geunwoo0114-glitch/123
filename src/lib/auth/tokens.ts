import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { AuthTokenPurpose } from "@prisma/client";
import { db } from "@/lib/db";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export const tokenTtl: Record<AuthTokenPurpose, number> = {
  PASSWORD_RESET: 60 * 60 * 1000, // 1시간
  EMAIL_VERIFY: 3 * 24 * 60 * 60 * 1000, // 3일
};

/** 새 토큰 발급 (같은 용도의 이전 토큰은 무효화). 반환값은 메일 링크에만 쓰는 원본 토큰 */
export async function issueAuthToken(userId: string, purpose: AuthTokenPurpose): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.authToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } }),
    db.authToken.create({ data: { userId, purpose, tokenHash: hash(token), expiresAt: new Date(Date.now() + tokenTtl[purpose]) } }),
  ]);
  return token;
}

/** 토큰 사용 (1회용, 만료 확인). 성공하면 userId */
export async function consumeAuthToken(token: string, purpose: AuthTokenPurpose): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const row = await db.authToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt < new Date()) return null;
  // 동시에 두 번 써도 한 번만 성공하도록 조건부 업데이트
  const used = await db.authToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return used.count === 1 ? row.userId : null;
}

/** 토큰이 아직 유효한지 (재설정 화면을 보여줄지 판단용, 사용 처리하지 않음) */
export async function peekAuthToken(token: string, purpose: AuthTokenPurpose): Promise<boolean> {
  if (!token || token.length > 100) return false;
  const row = await db.authToken.findUnique({ where: { tokenHash: hash(token) }, select: { purpose: true, usedAt: true, expiresAt: true } });
  return !!row && row.purpose === purpose && !row.usedAt && row.expiresAt > new Date();
}
