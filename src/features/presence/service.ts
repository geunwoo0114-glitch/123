import "server-only";
import { db } from "@/lib/db";
import { getBlockedIds } from "@/features/relationships/queries";
import { userCardSelect, toUserCard, type UserCard } from "@/features/users/card";

/** 이 시간 안에 신호를 보낸 사람만 '지금 여기 있음'으로 본다 (클라이언트는 15초마다 신호) */
export const PRESENCE_WINDOW_MS = 45_000;
export const PRESENCE_MAX = 12;

export type PresentVisitor = UserCard & { isHost: boolean };

/**
 * 공간에 머무는 중이라는 신호를 남긴다.
 * '방문 흔적 남기기'를 끈 사람은 기록하지 않는다 (다른 사람에게 보이지 않음).
 */
export async function touchPresence(hostId: string, userId: string) {
  if (hostId !== userId) {
    const s = await db.userSettings.findUnique({ where: { userId }, select: { leaveVisitTraces: true } });
    if (s && !s.leaveVisitTraces) return false;
  }
  await db.spacePresence.upsert({
    where: { hostId_userId: { hostId, userId } },
    create: { hostId, userId },
    update: { lastSeenAt: new Date() },
  });
  return true;
}

export async function leavePresence(hostId: string, userId: string) {
  await db.spacePresence.deleteMany({ where: { hostId, userId } });
}

/** 지금 이 공간에 있는 사람들 (본인과 차단 관계 제외, 주인이 있으면 맨 앞) */
export async function listPresent(hostId: string, viewerId: string): Promise<PresentVisitor[]> {
  const blocked = await getBlockedIds(viewerId);
  const rows = await db.spacePresence.findMany({
    where: {
      hostId,
      lastSeenAt: { gte: new Date(Date.now() - PRESENCE_WINDOW_MS) },
      userId: { notIn: [viewerId, ...blocked] },
      user: { status: "ACTIVE" },
    },
    orderBy: { lastSeenAt: "desc" },
    take: PRESENCE_MAX,
    select: { userId: true, user: { select: userCardSelect } },
  });
  return rows
    .map((r) => ({ ...toUserCard(r.user), isHost: r.userId === hostId }))
    .sort((a, b) => Number(b.isHost) - Number(a.isHost));
}

/** 오래된 기록 정리 (신호를 보낼 때 가끔 실행) */
export async function prunePresence() {
  await db.spacePresence.deleteMany({ where: { lastSeenAt: { lt: new Date(Date.now() - 10 * 60_000) } } });
}
