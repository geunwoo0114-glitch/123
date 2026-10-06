import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Relation } from "@/features/privacy/policy";
import { userCardSelect, toUserCard, type UserCard } from "@/features/users/card";

/** 친구 쌍을 (작은 id, 큰 id)로 정규화 */
export function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export const getRelation = cache(async (viewerId: string | null, ownerId: string): Promise<Relation> => {
  const base = { viewerId, ownerId, isCloseFriend: false, isFollowing: false };
  if (!viewerId) return { ...base, state: "NONE" };
  if (viewerId === ownerId) return { ...base, state: "SELF" };

  const [userAId, userBId] = orderPair(viewerId, ownerId);
  const [blocks, friendship, close, follow] = await Promise.all([
    db.block.findMany({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: ownerId },
          { blockerId: ownerId, blockedId: viewerId },
        ],
      },
      select: { blockerId: true },
    }),
    db.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } } }),
    db.closeFriend.findUnique({ where: { ownerId_friendId: { ownerId, friendId: viewerId } } }),
    db.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: ownerId } } }),
  ]);

  if (blocks.some((b) => b.blockerId === viewerId)) return { ...base, state: "BLOCKED" };
  if (blocks.length > 0) return { ...base, state: "BLOCKED_BY" };

  let state: Relation["state"] = "NONE";
  if (friendship?.status === "ACCEPTED") state = "FRIENDS";
  else if (friendship?.status === "PENDING") state = friendship.requesterId === viewerId ? "REQUEST_SENT" : "REQUEST_RECEIVED";

  return { ...base, state, isCloseFriend: state === "FRIENDS" && !!close, isFollowing: !!follow };
});

/** viewer 기준 친구 라벨(일촌명): viewer가 owner를 부르는 이름 */
export async function getFriendLabel(viewerId: string, ownerId: string): Promise<string | null> {
  const [a, b] = orderPair(viewerId, ownerId);
  const f = await db.friendship.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
  if (!f || f.status !== "ACCEPTED") return null;
  return viewerId === a ? f.labelAtoB : f.labelBtoA;
}

export const getFriendIds = cache(async (userId: string): Promise<string[]> => {
  const rows = await db.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true },
  });
  return rows.map((r) => (r.userAId === userId ? r.userBId : r.userAId));
});

/** 양방향 차단된 사용자 id (검색/피드/추천에서 제외) */
export const getBlockedIds = cache(async (userId: string): Promise<string[]> => {
  const rows = await db.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return [...new Set(rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)))];
});

export const getFollowingIds = cache(async (userId: string): Promise<string[]> => {
  const rows = await db.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
  return rows.map((r) => r.followingId);
});

/** 나를 친한 친구로 지정한 사람들 (그들의 CLOSE_FRIENDS 글을 볼 수 있음) */
export const getCloseFriendOwnerIds = cache(async (userId: string): Promise<string[]> => {
  const rows = await db.closeFriend.findMany({ where: { friendId: userId }, select: { ownerId: true } });
  return rows.map((r) => r.ownerId);
});

export type FriendListItem = UserCard & { label: string | null; isClose: boolean; since: Date | null };

export async function listFriends(userId: string, opts: { take?: number; viewerId?: string | null } = {}): Promise<FriendListItem[]> {
  const rows = await db.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ userAId: userId }, { userBId: userId }] },
    orderBy: { acceptedAt: "desc" },
    take: opts.take,
    include: { userA: { select: userCardSelect }, userB: { select: userCardSelect } },
  });
  const close = new Set(
    (await db.closeFriend.findMany({ where: { ownerId: userId }, select: { friendId: true } })).map((c) => c.friendId),
  );
  return rows
    .map((r) => {
      const isA = r.userAId === userId;
      const other = isA ? r.userB : r.userA;
      return {
        ...toUserCard(other),
        label: isA ? r.labelAtoB : r.labelBtoA,
        isClose: close.has(other.id),
        since: r.acceptedAt,
      };
    })
    .filter((f) => f.status === "ACTIVE");
}

export async function countFriends(userId: string) {
  return db.friendship.count({ where: { status: "ACCEPTED", OR: [{ userAId: userId }, { userBId: userId }] } });
}

export async function listFriendRequests(userId: string) {
  const rows = await db.friendship.findMany({
    where: { status: "PENDING", OR: [{ userAId: userId }, { userBId: userId }] },
    orderBy: { createdAt: "desc" },
    include: { userA: { select: userCardSelect }, userB: { select: userCardSelect } },
  });
  const incoming: (UserCard & { message: string | null; label: string | null; createdAt: Date })[] = [];
  const outgoing: (UserCard & { createdAt: Date })[] = [];
  for (const r of rows) {
    const other = r.userAId === userId ? r.userB : r.userA;
    if (r.requesterId === userId) outgoing.push({ ...toUserCard(other), createdAt: r.createdAt });
    else
      incoming.push({
        ...toUserCard(other),
        message: r.message,
        // 요청자가 정해 둔 '나를 부르는 이름'
        label: r.requesterId === r.userAId ? r.labelAtoB : r.labelBtoA,
        createdAt: r.createdAt,
      });
  }
  return { incoming, outgoing };
}

export async function countIncomingRequests(userId: string) {
  return db.friendship.count({
    where: { status: "PENDING", NOT: { requesterId: userId }, OR: [{ userAId: userId }, { userBId: userId }] },
  });
}

export async function listBlocked(userId: string) {
  const rows = await db.block.findMany({
    where: { blockerId: userId },
    orderBy: { createdAt: "desc" },
    include: { blocked: { select: userCardSelect } },
  });
  return rows.map((r) => toUserCard(r.blocked));
}

/**
 * 친구 추천: 친구의 친구(공통 친구 수) → 공통 관심사 → 최근 가입한 활동 사용자.
 * 서비스가 커지면 이 함수만 추천 엔진 호출로 바꾸면 된다.
 */
export async function suggestFriends(userId: string, take = 8): Promise<(UserCard & { reason: string })[]> {
  const [friendIds, blocked, me] = await Promise.all([
    getFriendIds(userId),
    getBlockedIds(userId),
    db.profile.findUnique({ where: { userId }, select: { interests: true } }),
  ]);
  const pending = await db.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true },
  });
  const exclude = new Set([userId, ...friendIds, ...blocked, ...pending.flatMap((p) => [p.userAId, p.userBId])]);
  const results = new Map<string, UserCard & { reason: string }>();

  if (friendIds.length > 0) {
    const fof = await db.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ userAId: { in: friendIds } }, { userBId: { in: friendIds } }],
      },
      select: { userAId: true, userBId: true },
      take: 500,
    });
    const counts = new Map<string, number>();
    const friendSet = new Set(friendIds);
    for (const f of fof) {
      for (const id of [f.userAId, f.userBId]) {
        if (!exclude.has(id) && !friendSet.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, take);
    if (top.length) {
      const users = await db.user.findMany({
        where: { id: { in: top.map(([id]) => id) }, status: "ACTIVE", settings: { discoverable: true } },
        select: userCardSelect,
      });
      for (const [id, n] of top) {
        const u = users.find((x) => x.id === id);
        if (u) results.set(id, { ...toUserCard(u), reason: `함께 아는 친구 ${n}명` });
      }
    }
  }

  const interests = me?.interests ?? [];
  if (results.size < take && interests.length > 0) {
    const users = await db.user.findMany({
      where: {
        id: { notIn: [...exclude, ...results.keys()] },
        status: "ACTIVE",
        onboardedAt: { not: null },
        settings: { discoverable: true },
        profile: { interests: { hasSome: interests } },
      },
      select: userCardSelect,
      take: take - results.size,
    });
    for (const u of users) {
      const common = u.profile?.interests.filter((i) => interests.includes(i)) ?? [];
      results.set(u.id, { ...toUserCard(u), reason: `#${common[0] ?? "관심사"} 좋아해요` });
    }
  }

  if (results.size < take) {
    const users = await db.user.findMany({
      where: {
        id: { notIn: [...exclude, ...results.keys()] },
        status: "ACTIVE",
        onboardedAt: { not: null },
        settings: { discoverable: true },
      },
      orderBy: { createdAt: "desc" },
      select: userCardSelect,
      take: take - results.size,
    });
    for (const u of users) results.set(u.id, { ...toUserCard(u), reason: "새로 다락을 열었어요" });
  }

  return [...results.values()].slice(0, take);
}
