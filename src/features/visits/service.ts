import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { serviceDay } from "@/lib/dates";
import { logger } from "@/lib/logger";
import { userCardSelect, toUserCard, type UserCard } from "@/features/users/card";
import { track } from "@/features/analytics/track";

/**
 * 방문 기록. (공간, 방문자, 날짜)당 1번만 집계해 '오늘 방문자'를 순방문자로 센다.
 * 비로그인 방문자는 IP+UA 해시로 익명 집계하고, 개인을 식별할 수 있는 값은 저장하지 않는다.
 * 방문 흔적(누가 왔는지)은 방문자가 '흔적 남기기'를 켠 경우에만 남는다.
 */
export async function recordVisit(hostId: string, viewerId: string | null) {
  if (viewerId === hostId) return;
  try {
    const h = await headers();
    if (/bot|crawler|spider|preview/i.test(h.get("user-agent") ?? "")) return;
    const day = serviceDay();
    let visitorKey: string;
    let traced = false;
    if (viewerId) {
      visitorKey = `u:${viewerId}`;
      const s = await db.userSettings.findUnique({ where: { userId: viewerId }, select: { leaveVisitTraces: true } });
      traced = s?.leaveVisitTraces ?? true;
    } else {
      const raw = `${h.get("x-forwarded-for") ?? ""}|${h.get("user-agent") ?? ""}|${day}`;
      visitorKey = `a:${createHash("sha256").update(raw).digest("hex").slice(0, 32)}`;
    }

    try {
      await db.$transaction([
        db.visit.create({ data: { hostId, visitorKey, visitorId: viewerId, day, traced } }),
        db.profile.update({ where: { userId: hostId }, data: { totalVisits: { increment: 1 } } }),
      ]);
      if (viewerId) track("profile_visit", viewerId, { hostId });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        await db.visit.update({ where: { hostId_visitorKey_day: { hostId, visitorKey, day } }, data: { lastAt: new Date(), traced } });
      } else throw e;
    }
  } catch (err) {
    logger.warn("recordVisit failed", { err, hostId });
  }
}

export async function visitStats(hostId: string) {
  const [today, profile] = await Promise.all([
    db.visit.count({ where: { hostId, day: serviceDay() } }),
    db.profile.findUnique({ where: { userId: hostId }, select: { totalVisits: true } }),
  ]);
  return { today, total: profile?.totalVisits ?? 0 };
}

export type RecentVisitor = UserCard & { lastAt: string };

/** 최근 흔적을 남긴 방문자 (최근 14일, 사람별 1회) */
export async function recentVisitors(hostId: string, excludeIds: string[] = [], take = 12): Promise<RecentVisitor[]> {
  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000);
  const rows = await db.visit.findMany({
    where: { hostId, traced: true, visitorId: { not: null, notIn: excludeIds }, lastAt: { gte: since }, visitor: { status: "ACTIVE" } },
    orderBy: { lastAt: "desc" },
    take: take * 3,
    select: { lastAt: true, visitor: { select: userCardSelect } },
  });
  const seen = new Set<string>();
  const out: RecentVisitor[] = [];
  for (const r of rows) {
    if (!r.visitor || seen.has(r.visitor.id)) continue;
    seen.add(r.visitor.id);
    out.push({ ...toUserCard(r.visitor), lastAt: r.lastAt.toISOString() });
    if (out.length >= take) break;
  }
  return out;
}
