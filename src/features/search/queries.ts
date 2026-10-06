import "server-only";
import { db } from "@/lib/db";
import { userCardSelect, toUserCard } from "@/features/users/card";
import { postSelect, toPostDTO } from "@/features/posts/queries";
import { getBlockedIds } from "@/features/relationships/queries";

/**
 * 검색. 지금은 Postgres ILIKE로 충분하지만, 규모가 커지면 이 모듈만 검색 엔진
 * (Meilisearch/OpenSearch 등) 호출로 바꾼다. pg_trgm 인덱스를 먼저 고려.
 */
export async function searchUsers(q: string, viewerId: string | null, take = 20) {
  const term = q.trim().replace(/^@/, "").slice(0, 40);
  if (!term) return [];
  const blocked = viewerId ? await getBlockedIds(viewerId) : [];
  const rows = await db.user.findMany({
    where: {
      status: "ACTIVE",
      onboardedAt: { not: null },
      id: { notIn: blocked },
      settings: { discoverable: true },
      OR: [
        { username: { contains: term.toLowerCase() } },
        { profile: { displayName: { contains: term, mode: "insensitive" } } },
        { profile: { interests: { has: term } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take,
    select: userCardSelect,
  });
  // 정확히 일치하는 아이디를 맨 앞으로
  return rows.map(toUserCard).sort((a, b) => Number(b.username === term.toLowerCase()) - Number(a.username === term.toLowerCase()));
}

/** 공개 글 태그/내용 검색 */
export async function searchPublicPosts(q: string, viewerId: string | null, take = 20) {
  const term = q.trim().slice(0, 40);
  if (!term) return [];
  const blocked = viewerId ? await getBlockedIds(viewerId) : [];
  const tag = term.startsWith("#") ? term.slice(1).toLowerCase() : null;
  const rows = await db.post.findMany({
    where: {
      deletedAt: null,
      visibility: "PUBLIC",
      authorId: { notIn: blocked },
      author: { status: "ACTIVE" },
      ...(tag ? { tags: { has: tag } } : { OR: [{ body: { contains: term, mode: "insensitive" } }, { tags: { has: term.toLowerCase() } }] }),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: postSelect(viewerId),
  });
  return rows.map(toPostDTO);
}

/** 둘러보기: 최근 공개 글 (사진 있는 글 위주) */
export async function recentPublicPosts(viewerId: string | null, take = 24) {
  const blocked = viewerId ? await getBlockedIds(viewerId) : [];
  const rows = await db.post.findMany({
    where: { deletedAt: null, visibility: "PUBLIC", authorId: { notIn: blocked }, author: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    take,
    select: postSelect(viewerId),
  });
  return rows.map(toPostDTO);
}

export async function popularTags(take = 12): Promise<string[]> {
  const rows = await db.$queryRaw<{ tag: string; n: bigint }[]>`
    SELECT unnest(tags) AS tag, COUNT(*) AS n FROM "Post"
    WHERE "deletedAt" IS NULL AND visibility = 'PUBLIC' AND "createdAt" > now() - interval '30 days'
    GROUP BY tag ORDER BY n DESC LIMIT ${take}`;
  return rows.map((r) => r.tag);
}
