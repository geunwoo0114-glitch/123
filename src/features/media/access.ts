import "server-only";
import { db } from "@/lib/db";
import { canViewContent, type Visibility } from "@/features/privacy/policy";
import { getRelation } from "@/features/relationships/queries";

/**
 * 업로드 이미지 접근 권한.
 * 이미지가 쓰인 곳(프로필/게시물/다이어리/사진첩)의 공개 범위를 그대로 따른다.
 * - "public": 누구나 볼 수 있음 → 공유 캐시 허용
 * - "private": 이 사람만 볼 수 있음 → 브라우저 캐시만
 * - null: 볼 수 없음 (존재 여부도 숨긴다)
 */
export type MediaAccess = "public" | "private" | null;

type Usage = { ownerId: string; visibility: Visibility };

export async function mediaAccess(key: string, viewer: { id: string; role: string } | null): Promise<MediaAccess> {
  const media = await db.media.findFirst({
    where: { OR: [{ key }, { thumbKey: key }] },
    select: {
      ownerId: true,
      owner: { select: { status: true } },
      _count: { select: { profileAvatars: true, profileCovers: true } },
      postImages: { select: { post: { select: { authorId: true, visibility: true, deletedAt: true } } } },
      diaryImages: { select: { diary: { select: { authorId: true, visibility: true, deletedAt: true } } } },
      photos: { select: { album: { select: { ownerId: true, visibility: true, deletedAt: true } } } },
    },
  });
  if (!media) return null;
  const isOwner = viewer?.id === media.ownerId;
  if (viewer?.role === "ADMIN") return "private"; // 신고 검토용
  if (media.owner.status !== "ACTIVE") return isOwner ? "private" : null;

  // 프로필 사진/커버는 공개 정보
  if (media._count.profileAvatars > 0 || media._count.profileCovers > 0) return "public";

  const usages: Usage[] = [
    ...media.postImages.filter((u) => !u.post.deletedAt).map((u) => ({ ownerId: u.post.authorId, visibility: u.post.visibility })),
    ...media.diaryImages.filter((u) => !u.diary.deletedAt).map((u) => ({ ownerId: u.diary.authorId, visibility: u.diary.visibility })),
    ...media.photos.filter((u) => !u.album.deletedAt).map((u) => ({ ownerId: u.album.ownerId, visibility: u.album.visibility })),
  ];
  if (usages.some((u) => u.visibility === "PUBLIC")) {
    // 전체 공개라도 차단 관계면 보지 못한다
    const rel = await getRelation(viewer?.id ?? null, media.ownerId);
    return rel.state === "BLOCKED" || rel.state === "BLOCKED_BY" ? null : "public";
  }
  if (isOwner) return "private";
  for (const u of usages) {
    const rel = await getRelation(viewer?.id ?? null, u.ownerId);
    if (canViewContent(rel, u.visibility)) return "private";
  }
  return null;
}
