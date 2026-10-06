import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "./session";

/** 페이지용: 로그인하지 않았으면 로그인 페이지로 보낸다 */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/** 페이지용: 로그인 + 온보딩 완료 */
export async function requireOnboardedUser(next?: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!user.onboarded) redirect("/onboarding");
  return user;
}

/** 안전한 내부 경로만 허용 (open redirect 방지) */
export function safeNext(next: unknown, fallback = "/"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** 운영자 전용 페이지: 관리자가 아니면 페이지가 없는 것처럼 404 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") notFound();
  return user;
}
