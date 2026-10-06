import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { appConfig } from "@/config/app";

const { cookieName, maxAgeSeconds } = appConfig.session;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  const ua = (await headers()).get("user-agent")?.slice(0, 255) ?? null;
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt, userAgent: ua } });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(cookieName);
}

export type SessionUser = {
  id: string;
  username: string;
  role: "USER" | "ADMIN";
  onboarded: boolean;
  displayName: string;
  avatarKey: string | null;
};

/**
 * 현재 요청의 로그인 사용자. 요청 단위로 memoize된다.
 * 정지/삭제된 계정은 로그인되지 않은 것으로 취급한다.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          status: true,
          onboardedAt: true,
          profile: { select: { displayName: true, avatarMedia: { select: { thumbKey: true } } } },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date() || session.user.status !== "ACTIVE") return null;

  const u = session.user;
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    onboarded: !!u.onboardedAt,
    displayName: u.profile?.displayName ?? u.username,
    avatarKey: u.profile?.avatarMedia?.thumbKey ?? null,
  };
});

export async function revokeOtherSessions(userId: string) {
  const token = (await cookies()).get(cookieName)?.value;
  const current = token ? hashToken(token) : "";
  await db.session.deleteMany({ where: { userId, NOT: { tokenHash: current } } });
}
