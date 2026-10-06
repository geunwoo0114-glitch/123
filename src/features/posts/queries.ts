import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { userCardSelect, toUserCard, type UserCard } from "@/features/users/card";
import { mediaSelect, type MediaDTO } from "@/features/media/service";
import { canViewContent, visibleLevels, type Visibility } from "@/features/privacy/policy";
import { getRelation } from "@/features/relationships/queries";
import { appConfig } from "@/config/app";

export type PostDTO = {
  id: string;
  body: string;
  mood: string | null;
  tags: string[];
  linkUrl: string | null;
  visibility: Visibility;
  createdAt: string;
  edited: boolean;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  author: UserCard;
  images: (MediaDTO & { alt: string })[];
};

export function postSelect(viewerId: string | null) {
  return {
    id: true,
    body: true,
    mood: true,
    tags: true,
    linkUrl: true,
    visibility: true,
    createdAt: true,
    updatedAt: true,
    likeCount: true,
    commentCount: true,
    author: { select: userCardSelect },
    images: { orderBy: { order: "asc" }, select: { alt: true, media: { select: mediaSelect } } },
    likes: viewerId ? { where: { userId: viewerId }, select: { userId: true }, take: 1 } : false,
  } satisfies Prisma.PostSelect;
}

type PostRow = Prisma.PostGetPayload<{ select: ReturnType<typeof postSelect> }>;

export function toPostDTO(p: PostRow): PostDTO {
  return {
    id: p.id,
    body: p.body,
    mood: p.mood,
    tags: p.tags,
    linkUrl: p.linkUrl,
    visibility: p.visibility,
    createdAt: p.createdAt.toISOString(),
    edited: p.updatedAt.getTime() - p.createdAt.getTime() > 60_000,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    likedByMe: Array.isArray(p.likes) && p.likes.length > 0,
    author: toUserCard(p.author),
    images: p.images.map((i) => ({ ...i.media, alt: i.alt })),
  };
}

/** 단건 조회 + 권한 확인. 볼 수 없으면 null (존재 여부를 노출하지 않음) */
export async function getPostForViewer(postId: string, viewerId: string | null): Promise<PostDTO | null> {
  const post = await db.post.findFirst({
    where: { id: postId, deletedAt: null, author: { status: "ACTIVE" } },
    select: { ...postSelect(viewerId), authorId: true },
  });
  if (!post) return null;
  const rel = await getRelation(viewerId, post.authorId);
  if (!canViewContent(rel, post.visibility)) return null;
  return toPostDTO(post);
}

export type Page<T> = { items: T[]; nextCursor: string | null };

/** 한 사람의 공간에 보이는 게시물 (보는 사람 권한에 맞게 필터) */
export async function listUserPosts(ownerId: string, viewerId: string | null, cursor?: string | null, take: number = appConfig.pageSize.feed): Promise<Page<PostDTO>> {
  const rel = await getRelation(viewerId, ownerId);
  const levels = visibleLevels(rel);
  if (levels.length === 0) return { items: [], nextCursor: null };
  const rows = await db.post.findMany({
    where: { authorId: ownerId, deletedAt: null, visibility: { in: levels } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: postSelect(viewerId),
  });
  const items = rows.slice(0, take).map(toPostDTO);
  return { items, nextCursor: rows.length > take ? items[items.length - 1].id : null };
}

export type CommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  deleted: boolean;
  author: UserCard;
  canDelete: boolean;
};

export async function listComments(postId: string, postAuthorId: string, viewerId: string | null, blockedIds: string[] = []): Promise<CommentDTO[]> {
  const rows = await db.comment.findMany({
    where: { postId, authorId: { notIn: blockedIds } },
    orderBy: { createdAt: "asc" },
    take: 300,
    select: { id: true, body: true, createdAt: true, parentId: true, deletedAt: true, authorId: true, author: { select: userCardSelect } },
  });
  return rows
    // 삭제된 댓글은 답글이 있을 때만 "삭제된 댓글"로 남긴다
    .filter((c) => !c.deletedAt || rows.some((r) => r.parentId === c.id && !r.deletedAt))
    .map((c) => ({
      id: c.id,
      body: c.deletedAt ? "" : c.body,
      createdAt: c.createdAt.toISOString(),
      parentId: c.parentId,
      deleted: !!c.deletedAt,
      author: toUserCard(c.author),
      canDelete: !c.deletedAt && viewerId !== null && (viewerId === c.authorId || viewerId === postAuthorId),
    }));
}
