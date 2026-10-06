import "server-only";
import { db } from "@/lib/db";
import { publish } from "@/lib/realtime/hub";
import { getBlockedIds } from "@/features/relationships/queries";
import { userCardSelect, toUserCard, type UserCard } from "@/features/users/card";
import { ROOM_SIZE } from "@/features/house/schema";

/** 이 시간 안에 신호를 보낸 사람만 '지금 여기 있음'으로 본다 (클라이언트는 15초마다 신호) */
export const PRESENCE_WINDOW_MS = 45_000;
export const PRESENCE_MAX = 12;

export type PresentVisitor = UserCard & { isHost: boolean; x: number | null; z: number | null };
export type Position = { x: number; z: number };

const LIMIT = ROOM_SIZE / 2 - 0.12;
/** 방 안으로 자르고 소수 둘째 자리로 맞춘다 */
export function clampPosition(p: Position): Position {
  const c = (v: number) => Math.round(Math.max(-LIMIT, Math.min(LIMIT, v)) * 100) / 100;
  return { x: c(p.x), z: c(p.z) };
}

const freshSince = () => new Date(Date.now() - PRESENCE_WINDOW_MS);

/** 같은 공간에 지금 있는 다른 사람들 (차단 관계 제외) — 실시간 이벤트를 받을 사람 */
async function audience(hostId: string, userId: string) {
  const [rows, blocked] = await Promise.all([
    db.spacePresence.findMany({ where: { hostId, lastSeenAt: { gte: freshSince() }, userId: { not: userId } }, select: { userId: true } }),
    getBlockedIds(userId),
  ]);
  return rows.map((r) => r.userId).filter((id) => !blocked.includes(id));
}

async function broadcast(hostId: string, userId: string, kind: "join" | "move" | "leave", pos?: Position) {
  const to = await audience(hostId, userId);
  await Promise.all(to.map((id) => publish(id, { type: "presence", hostId, kind, id: userId, ...(pos ?? {}) })));
}

/** '방문 흔적 남기기'를 끈 사람은 기록하지 않는다 (다른 사람에게 보이지 않음) */
async function isInvisible(hostId: string, userId: string) {
  if (hostId === userId) return false;
  const s = await db.userSettings.findUnique({ where: { userId }, select: { leaveVisitTraces: true } });
  return !!s && !s.leaveVisitTraces;
}

/**
 * 공간에 머무는 중이라는 신호를 남긴다. 위치를 주면 그 자리로 옮기고 같은 공간 사람들에게 바로 알린다.
 * 새로 들어왔으면 'join'을 알려 다른 사람 화면이 바로 목록을 새로 받게 한다.
 */
export async function touchPresence(hostId: string, userId: string, pos?: Position) {
  if (await isInvisible(hostId, userId)) return false;
  const before = await db.spacePresence.findUnique({ where: { hostId_userId: { hostId, userId } }, select: { lastSeenAt: true } });
  const fresh = !!before && before.lastSeenAt >= freshSince();
  const p = pos ? clampPosition(pos) : undefined;
  await db.spacePresence.upsert({
    where: { hostId_userId: { hostId, userId } },
    create: { hostId, userId, posX: p?.x ?? null, posZ: p?.z ?? null },
    // 다시 들어오면 예전 자리는 잊는다
    update: { lastSeenAt: new Date(), ...(p ? { posX: p.x, posZ: p.z } : fresh ? {} : { posX: null, posZ: null }) },
  });
  if (!fresh) await broadcast(hostId, userId, "join");
  else if (p) await broadcast(hostId, userId, "move", p);
  return true;
}

export async function leavePresence(hostId: string, userId: string) {
  const { count } = await db.spacePresence.deleteMany({ where: { hostId, userId } });
  if (count) await broadcast(hostId, userId, "leave");
}

/** 지금 이 공간에 있는 사람들 (본인과 차단 관계 제외, 주인이 있으면 맨 앞) */
export async function listPresent(hostId: string, viewerId: string): Promise<PresentVisitor[]> {
  const blocked = await getBlockedIds(viewerId);
  const rows = await db.spacePresence.findMany({
    where: {
      hostId,
      lastSeenAt: { gte: freshSince() },
      userId: { notIn: [viewerId, ...blocked] },
      user: { status: "ACTIVE" },
    },
    orderBy: { lastSeenAt: "desc" },
    take: PRESENCE_MAX,
    select: { userId: true, posX: true, posZ: true, user: { select: userCardSelect } },
  });
  return rows
    .map((r) => ({ ...toUserCard(r.user), isHost: r.userId === hostId, x: r.posX, z: r.posZ }))
    .sort((a, b) => Number(b.isHost) - Number(a.isHost));
}

/** 오래된 기록 정리 (신호를 보낼 때 가끔 실행) */
export async function prunePresence() {
  await db.spacePresence.deleteMany({ where: { lastSeenAt: { lt: new Date(Date.now() - 10 * 60_000) } } });
}
