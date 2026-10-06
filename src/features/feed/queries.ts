import "server-only";
import type { Visibility } from "@prisma/client";
import { db } from "@/lib/db";
import { dateToDay } from "@/lib/dates";
import { appConfig } from "@/config/app";
import { userCardSelect, toUserCard, type UserCard } from "@/features/users/card";
import { mediaSelect, type MediaDTO } from "@/features/media/service";
import { postSelect, toPostDTO, type PostDTO } from "@/features/posts/queries";
import { getBlockedIds, getCloseFriendOwnerIds, getFollowingIds, getFriendIds } from "@/features/relationships/queries";

export type FeedItem =
  | { kind: "post"; at: string; post: PostDTO }
  | { kind: "diary"; at: string; author: UserCard; diary: { id: string; title: string; excerpt: string; date: string; mood: string | null; weather: string | null; imageCount: number } }
  | { kind: "photos"; at: string; author: UserCard; album: { id: string; title: string; photoCount: number; recent: MediaDTO[] } };

/**
 * 피드 대상과 공개 범위 조건.
 * - 나: 전부 / 친구: 전체+친구 공개 (+나를 친한 친구로 지정했다면 친한 친구 공개) / 팔로우만: 전체 공개
 * owner 필드명이 모델마다 달라 key로 받는다.
 */
async function audienceWhere(meId: string, key: "authorId" | "ownerId") {
  const [friends, following, closeOwners, blocked] = await Promise.all([
    getFriendIds(meId),
    getFollowingIds(meId),
    getCloseFriendOwnerIds(meId),
    getBlockedIds(meId),
  ]);
  const friendSet = new Set(friends);
  const followOnly = following.filter((id) => !friendSet.has(id) && !blocked.includes(id));
  const close = closeOwners.filter((id) => friendSet.has(id));
  const or: Record<string, unknown>[] = [
    { [key]: meId },
    { [key]: { in: friends }, visibility: { in: ["PUBLIC", "FRIENDS"] satisfies Visibility[] } },
    { [key]: { in: followOnly }, visibility: "PUBLIC" },
  ];
  if (close.length) or.push({ [key]: { in: close }, visibility: "CLOSE_FRIENDS" });
  return { or, peopleCount: friends.length + followOnly.length };
}

/** 친구/관심 사용자의 활동을 시간순으로 합친 피드. cursor = 마지막 항목의 ISO 시각 */
export async function getHomeFeed(meId: string, cursor?: string | null, take: number = appConfig.pageSize.feed) {
  const before = cursor ? new Date(cursor) : undefined;
  const [postAud, albumAud] = await Promise.all([audienceWhere(meId, "authorId"), audienceWhere(meId, "ownerId")]);
  const createdBefore = before ? { lt: before } : undefined;

  const [posts, diaries, albums] = await Promise.all([
    db.post.findMany({
      where: { deletedAt: null, OR: postAud.or, createdAt: createdBefore, author: { status: "ACTIVE" } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: postSelect(meId),
    }),
    db.diaryEntry.findMany({
      // 다이어리는 '공유한' 일기만 피드에 (비공개는 내 것이어도 제외)
      where: { deletedAt: null, OR: postAud.or, NOT: { visibility: "PRIVATE" }, createdAt: createdBefore, author: { status: "ACTIVE" } },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true, title: true, body: true, date: true, mood: true, weather: true, createdAt: true,
        author: { select: userCardSelect },
        _count: { select: { images: true } },
      },
    }),
    db.album.findMany({
      where: { deletedAt: null, OR: albumAud.or, lastPhotoAt: before ? { lt: before } : { not: null }, owner: { status: "ACTIVE" } },
      orderBy: { lastPhotoAt: "desc" },
      take,
      select: {
        id: true, title: true, photoCount: true, lastPhotoAt: true,
        owner: { select: userCardSelect },
        photos: { orderBy: { createdAt: "desc" }, take: 4, select: { media: { select: mediaSelect } } },
      },
    }),
  ]);

  const items: FeedItem[] = [
    ...posts.map((p) => ({ kind: "post" as const, at: p.createdAt.toISOString(), post: toPostDTO(p) })),
    ...diaries.map((d) => ({
      kind: "diary" as const,
      at: d.createdAt.toISOString(),
      author: toUserCard(d.author),
      diary: { id: d.id, title: d.title, excerpt: d.body.slice(0, 160), date: dateToDay(d.date), mood: d.mood, weather: d.weather, imageCount: d._count.images },
    })),
    ...albums.map((a) => ({
      kind: "photos" as const,
      at: a.lastPhotoAt!.toISOString(),
      author: toUserCard(a.owner),
      album: { id: a.id, title: a.title, photoCount: a.photoCount, recent: a.photos.map((p) => p.media) },
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  const page = items.slice(0, take);
  const hasMore = items.length > take || posts.length === take || diaries.length === take || albums.length === take;
  return { items: page, nextCursor: hasMore && page.length ? page[page.length - 1].at : null, peopleCount: postAud.peopleCount };
}

/** '친구들의 요즘' - 상태 메시지 스트립 (최근 상태를 바꾼 친구 먼저) */
export async function getFriendsStatusStrip(meId: string, take = 20) {
  const friends = await getFriendIds(meId);
  if (friends.length === 0) return [];
  const rows = await db.user.findMany({
    where: { id: { in: friends }, status: "ACTIVE" },
    select: { ...userCardSelect, profile: { select: { ...userCardSelect.profile.select, statusUpdatedAt: true } } },
    take: 200,
  });
  return rows
    .map((u) => {
      const at = u.profile?.statusUpdatedAt ?? null;
      return { ...toUserCard(u), statusUpdatedAt: at?.toISOString() ?? null, statusFresh: !!at && Date.now() - at.getTime() < 24 * 3600 * 1000 };
    })
    .sort((a, b) => (b.statusUpdatedAt ?? "").localeCompare(a.statusUpdatedAt ?? ""))
    .slice(0, take);
}
