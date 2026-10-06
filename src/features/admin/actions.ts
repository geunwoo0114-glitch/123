"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ReportTarget } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { fail, messages, ok, type ActionResult } from "@/lib/action";
import { logger } from "@/lib/logger";

async function requireAdminUser() {
  const me = await getCurrentUser();
  return me && me.role === "ADMIN" ? me : null;
}

const targetTypes = ["USER", "POST", "COMMENT", "GUESTBOOK", "DIARY", "PHOTO"] as const;

const resolveSchema = z.object({
  targetType: z.enum(targetTypes),
  targetId: z.string().min(1).max(40),
  action: z.enum(["hide", "suspend", "hide_and_suspend", "dismiss"]),
  note: z.string().trim().max(300).default(""),
});

/** 대상의 주인(작성자) id */
async function ownerOf(type: ReportTarget, id: string): Promise<string | null> {
  switch (type) {
    case "USER":
      return id;
    case "POST":
      return (await db.post.findUnique({ where: { id }, select: { authorId: true } }))?.authorId ?? null;
    case "COMMENT":
      return (await db.comment.findUnique({ where: { id }, select: { authorId: true } }))?.authorId ?? null;
    case "GUESTBOOK":
      return (await db.guestbookEntry.findUnique({ where: { id }, select: { authorId: true } }))?.authorId ?? null;
    case "DIARY":
      return (await db.diaryEntry.findUnique({ where: { id }, select: { authorId: true } }))?.authorId ?? null;
    case "PHOTO":
      return (await db.photo.findUnique({ where: { id }, select: { album: { select: { ownerId: true } } } }))?.album.ownerId ?? null;
  }
}

/** 콘텐츠 숨김 (soft delete, 사진은 삭제) */
async function hideContent(type: ReportTarget, id: string) {
  const now = new Date();
  switch (type) {
    case "POST":
      await db.post.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: now } });
      break;
    case "COMMENT": {
      const c = await db.comment.findFirst({ where: { id, deletedAt: null }, select: { postId: true } });
      if (c) {
        await db.$transaction([
          db.comment.update({ where: { id }, data: { deletedAt: now } }),
          db.post.update({ where: { id: c.postId }, data: { commentCount: { decrement: 1 } } }),
        ]);
      }
      break;
    }
    case "GUESTBOOK":
      await db.guestbookEntry.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: now } });
      break;
    case "DIARY":
      await db.diaryEntry.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: now } });
      break;
    case "PHOTO": {
      const p = await db.photo.findUnique({ where: { id }, select: { albumId: true } });
      if (p) {
        await db.$transaction([
          db.photo.delete({ where: { id } }),
          db.album.update({ where: { id: p.albumId }, data: { photoCount: { decrement: 1 } } }),
          db.album.updateMany({ where: { id: p.albumId, coverPhotoId: id }, data: { coverPhotoId: null } }),
        ]);
      }
      break;
    }
    case "USER":
      break;
  }
}

/** 계정 정지: 즉시 로그아웃시키고, 정지된 사용자의 콘텐츠는 목록에서 빠진다 */
async function suspend(userId: string) {
  await db.$transaction([
    db.user.updateMany({ where: { id: userId, role: "USER" }, data: { status: "SUSPENDED" } }),
    db.session.deleteMany({ where: { userId } }),
  ]);
}

export async function resolveReport(input: z.input<typeof resolveSchema>): Promise<ActionResult> {
  const admin = await requireAdminUser();
  if (!admin) return fail(messages.forbidden);
  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) return fail("요청을 확인해 주세요.");
  const { targetType, targetId, action, note } = parsed.data;

  const owner = await ownerOf(targetType, targetId);
  if (owner === admin.id && action !== "dismiss") return fail("자기 자신에게는 조치할 수 없어요.");
  if (action === "hide" || action === "hide_and_suspend") await hideContent(targetType, targetId);
  if ((action === "suspend" || action === "hide_and_suspend") && owner) await suspend(owner);

  const status = action === "dismiss" ? "DISMISSED" : "RESOLVED";
  await db.report.updateMany({ where: { targetType, targetId, status: { in: ["OPEN", "REVIEWING"] } }, data: { status, resolvedAt: new Date() } });
  const logAction = { hide: "HIDE_CONTENT", suspend: "SUSPEND_USER", hide_and_suspend: "HIDE_AND_SUSPEND", dismiss: "DISMISS" }[action];
  await db.moderationAction.create({ data: { adminId: admin.id, action: logAction, targetType, targetId, note } });
  logger.info("moderation", { admin: admin.id, action: logAction, targetType, targetId });
  revalidatePath("/admin", "layout");
  return ok(undefined, action === "dismiss" ? "신고를 기각했어요." : "조치를 완료했어요.");
}

export async function setUserSuspended(input: { username: string; suspended: boolean; note?: string }): Promise<ActionResult> {
  const admin = await requireAdminUser();
  if (!admin) return fail(messages.forbidden);
  const username = String(input.username ?? "").trim().replace(/^@/, "").toLowerCase();
  const user = await db.user.findUnique({ where: { username }, select: { id: true, role: true } });
  if (!user) return fail("사용자를 찾을 수 없어요.");
  if (user.role === "ADMIN") return fail("운영자 계정은 정지할 수 없어요.");
  if (input.suspended) await suspend(user.id);
  else await db.user.update({ where: { id: user.id }, data: { status: "ACTIVE" } });
  await db.moderationAction.create({
    data: { adminId: admin.id, action: input.suspended ? "SUSPEND_USER" : "UNSUSPEND_USER", targetType: "USER", targetId: user.id, note: String(input.note ?? "").slice(0, 300) },
  });
  revalidatePath("/admin", "layout");
  return ok(undefined, input.suspended ? `@${username} 계정을 정지했어요.` : `@${username} 계정 정지를 풀었어요.`);
}
