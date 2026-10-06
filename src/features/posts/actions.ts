"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { checkLimit } from "@/lib/rate-limit";
import { fail, fromZodError, messages, ok, type ActionResult } from "@/lib/action";
import { ownedMediaIds } from "@/features/media/service";
import { canDeleteComment, canInteract, canViewContent } from "@/features/privacy/policy";
import { getRelation } from "@/features/relationships/queries";
import { notify } from "@/features/notifications/service";
import { track } from "@/features/analytics/track";
import { commentInputSchema, extractTags, postInputSchema } from "./schemas";

function revalidatePostViews(username: string, postId?: string) {
  revalidatePath("/");
  revalidatePath(`/u/${username}`, "layout");
  if (postId) revalidatePath(`/p/${postId}`);
}

export async function createPost(input: z.input<typeof postInputSchema>): Promise<ActionResult<{ id: string }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (!(await checkLimit("post", me.id))) return fail(messages.rateLimited);
  const { body, mood, visibility, mediaIds, linkUrl } = parsed.data;

  const owned = await ownedMediaIds(me.id, mediaIds);
  if (owned === null) return fail("사진을 다시 올려 주세요.");

  const post = await db.post.create({
    data: {
      authorId: me.id,
      body,
      mood,
      visibility,
      linkUrl,
      tags: extractTags(body),
      images: { create: owned.map((mediaId, order) => ({ mediaId, order })) },
    },
    select: { id: true },
  });
  track("post_created", me.id, { images: owned.length, visibility });
  revalidatePostViews(me.username);
  return ok({ id: post.id }, "소식을 남겼어요.");
}

export async function updatePost(postId: string, input: z.input<typeof postInputSchema>): Promise<ActionResult<{ id: string }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const existing = await db.post.findFirst({ where: { id: postId, deletedAt: null }, select: { authorId: true } });
  // 존재하지 않거나 남의 글이면 같은 응답 (IDOR 방지)
  if (!existing || existing.authorId !== me.id) return fail(messages.notFound);
  const { body, mood, visibility, mediaIds, linkUrl } = parsed.data;
  const owned = await ownedMediaIds(me.id, mediaIds);
  if (owned === null) return fail("사진을 다시 올려 주세요.");

  await db.$transaction([
    db.postImage.deleteMany({ where: { postId } }),
    db.post.update({
      where: { id: postId },
      data: {
        body,
        mood,
        visibility,
        linkUrl,
        tags: extractTags(body),
        images: { create: owned.map((mediaId, order) => ({ mediaId, order })) },
      },
    }),
  ]);
  revalidatePostViews(me.username, postId);
  return ok({ id: postId }, "수정했어요.");
}

/** soft delete: 신고/분쟁 대응을 위해 일정 기간 보관 후 배치로 정리 */
export async function deletePost(postId: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const res = await db.post.updateMany({ where: { id: postId, authorId: me.id, deletedAt: null }, data: { deletedAt: new Date() } });
  if (res.count === 0) return fail(messages.notFound);
  await db.spaceSettings.updateMany({ where: { userId: me.id, pinnedPostId: postId }, data: { pinnedPostId: null } });
  revalidatePostViews(me.username, postId);
  return ok(undefined, "게시물을 삭제했어요.");
}

async function viewablePost(postId: string, viewerId: string) {
  const post = await db.post.findFirst({
    where: { id: postId, deletedAt: null, author: { status: "ACTIVE" } },
    select: { id: true, authorId: true, visibility: true, body: true, author: { select: { username: true } } },
  });
  if (!post) return null;
  const rel = await getRelation(viewerId, post.authorId);
  if (!canViewContent(rel, post.visibility) || !canInteract(rel)) return null;
  return post;
}

export async function toggleLike(postId: string, like: boolean): Promise<ActionResult<{ liked: boolean; likeCount: number }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  if (!(await checkLimit("like", me.id))) return fail(messages.rateLimited);
  const post = await viewablePost(postId, me.id);
  if (!post) return fail(messages.notFound);

  // 카운터와 좋아요 행을 한 트랜잭션에서 맞춘다. 중복 클릭(P2002)/이미 취소된 경우는 무시.
  let changed = false;
  try {
    await db.$transaction(async (tx) => {
      if (like) {
        await tx.postLike.create({ data: { postId, userId: me.id } });
        await tx.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });
      } else {
        const del = await tx.postLike.deleteMany({ where: { postId, userId: me.id } });
        if (del.count > 0) await tx.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
      }
      changed = true;
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }
  if (changed && like) {
    await notify({ recipientId: post.authorId, actorId: me.id, type: "POST_LIKE", targetId: postId, dedupeKey: `like:${postId}:${me.id}`, preview: post.body });
  }
  const fresh = await db.post.findUnique({ where: { id: postId }, select: { likeCount: true } });
  return ok({ liked: like, likeCount: fresh?.likeCount ?? 0 });
}

export async function addComment(input: z.input<typeof commentInputSchema>): Promise<ActionResult<{ id: string }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = commentInputSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (!(await checkLimit("comment", me.id))) return fail(messages.rateLimited);
  const { postId, parentId, body } = parsed.data;

  const post = await viewablePost(postId, me.id);
  if (!post) return fail(messages.notFound);

  let parent: { id: string; authorId: string; parentId: string | null } | null = null;
  if (parentId) {
    parent = await db.comment.findFirst({ where: { id: parentId, postId, deletedAt: null }, select: { id: true, authorId: true, parentId: true } });
    if (!parent) return fail("답글을 달 댓글을 찾을 수 없어요.");
  }

  const comment = await db.$transaction(async (tx) => {
    const c = await tx.comment.create({
      // 답글은 1단계까지만 (답글의 답글은 같은 스레드에 붙임)
      data: { postId, authorId: me.id, body, parentId: parent ? (parent.parentId ?? parent.id) : null },
      select: { id: true },
    });
    await tx.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
    return c;
  });

  await notify({ recipientId: post.authorId, actorId: me.id, type: "POST_COMMENT", targetId: postId, dedupeKey: `comment:${comment.id}`, preview: body });
  if (parent && parent.authorId !== post.authorId) {
    await notify({ recipientId: parent.authorId, actorId: me.id, type: "COMMENT_REPLY", targetId: postId, dedupeKey: `reply:${comment.id}`, preview: body });
  }
  revalidatePath(`/p/${postId}`);
  revalidatePostViews(post.author.username);
  return ok({ id: comment.id });
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const c = await db.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: { id: true, authorId: true, postId: true, post: { select: { authorId: true } } },
  });
  if (!c || !canDeleteComment(me.id, c, c.post)) return fail(messages.notFound);
  await db.$transaction([
    db.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } }),
    db.post.update({ where: { id: c.postId }, data: { commentCount: { decrement: 1 } } }),
  ]);
  revalidatePath(`/p/${c.postId}`);
  return ok(undefined, "댓글을 삭제했어요.");
}

export async function setPinnedPost(postId: string | null): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  if (postId) {
    const p = await db.post.findFirst({ where: { id: postId, authorId: me.id, deletedAt: null }, select: { id: true } });
    if (!p) return fail(messages.notFound);
  }
  await db.spaceSettings.update({ where: { userId: me.id }, data: { pinnedPostId: postId } });
  revalidatePath(`/u/${me.username}`, "layout");
  return ok(undefined, postId ? "대표 글로 고정했어요." : "고정을 해제했어요.");
}
