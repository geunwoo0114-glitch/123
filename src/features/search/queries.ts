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
  const lower = term.toLowerCase();
  const like = `%${lower.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  // 부분 일치(ILIKE, trigram 인덱스) + 오타 허용(similarity) + 관심사 일치. 정확한 아이디 → 유사도 순
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT u.id
    FROM "User" u
    JOIN "Profile" p ON p."userId" = u.id
    LEFT JOIN "UserSettings" s ON s."userId" = u.id
    WHERE u.status = 'ACTIVE'
      AND u."onboardedAt" IS NOT NULL
      AND COALESCE(s.discoverable, true)
      AND NOT (u.id = ANY(${blocked}::text[]))
      AND (
        u.username ILIKE ${like}
        OR p."displayName" ILIKE ${like}
        OR similarity(u.username, ${lower}) > 0.35
        OR similarity(p."displayName", ${term}) > 0.35
        OR ${term} = ANY(p.interests)
      )
    ORDER BY (u.username = ${lower}) DESC,
             GREATEST(similarity(u.username, ${lower}), similarity(p."displayName", ${term})) DESC,
             u."createdAt" DESC
    LIMIT ${take}`;
  if (rows.length === 0) return [];
  const users = await db.user.findMany({ where: { id: { in: rows.map((r) => r.id) } }, select: userCardSelect });
  const order = new Map(rows.map((r, i) => [r.id, i]));
  return users.map(toUserCard).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
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
