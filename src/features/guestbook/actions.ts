"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { checkLimit } from "@/lib/rate-limit";
import { fail, fromZodError, messages, ok, type ActionResult } from "@/lib/action";
import { canDeleteGuestbookEntry, canWriteGuestbook } from "@/features/privacy/policy";
import { getRelation } from "@/features/relationships/queries";
import { notify } from "@/features/notifications/service";
import { track } from "@/features/analytics/track";
import { guestbookInputSchema, guestbookReplySchema } from "./schemas";
import { listGuestbook } from "./queries";

export async function writeGuestbook(input: z.input<typeof guestbookInputSchema>): Promise<ActionResult<{ id: string }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = guestbookInputSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (!(await checkLimit("guestbook", me.id))) return fail(messages.rateLimited);
  const { hostId, body, isSecret, sticker } = parsed.data;

  const host = await db.user.findFirst({ where: { id: hostId, status: "ACTIVE" }, select: { username: true, settings: { select: { guestbookPolicy: true } } } });
  if (!host) return fail(messages.notFound);
  const rel = await getRelation(me.id, hostId);
  if (!canWriteGuestbook(rel, host.settings?.guestbookPolicy ?? "EVERYONE")) {
    return fail(host.settings?.guestbookPolicy === "FRIENDS" ? "친구만 방명록을 남길 수 있어요." : "방명록을 남길 수 없어요.");
  }

  const entry = await db.guestbookEntry.create({ data: { hostId, authorId: me.id, body, isSecret, sticker }, select: { id: true } });
  await notify({
    recipientId: hostId,
    actorId: me.id,
    type: "GUESTBOOK",
    targetId: entry.id,
    dedupeKey: `guestbook:${entry.id}`,
    preview: isSecret ? "비밀 방명록을 남겼어요" : body,
  });
  track("guestbook_created", me.id, { secret: isSecret });
  revalidatePath(`/u/${host.username}`, "layout");
  return ok({ id: entry.id }, "방명록에 흔적을 남겼어요.");
}

export async function replyGuestbook(input: z.input<typeof guestbookReplySchema>): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = guestbookReplySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const entry = await db.guestbookEntry.findFirst({ where: { id: parsed.data.entryId, hostId: me.id, deletedAt: null }, select: { id: true, authorId: true } });
  if (!entry) return fail(messages.notFound);
  const reply = parsed.data.reply || null;
  await db.guestbookEntry.update({ where: { id: entry.id }, data: { reply, repliedAt: reply ? new Date() : null } });
  if (reply) {
    await notify({ recipientId: entry.authorId, actorId: me.id, type: "GUESTBOOK_REPLY", targetId: entry.id, dedupeKey: `guestbook-reply:${entry.id}`, preview: reply });
  }
  revalidatePath(`/u/${me.username}`, "layout");
  return ok(undefined, reply ? "답글을 남겼어요." : "답글을 지웠어요.");
}

export async function deleteGuestbook(entryId: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const entry = await db.guestbookEntry.findFirst({ where: { id: entryId, deletedAt: null }, select: { id: true, hostId: true, authorId: true, host: { select: { username: true } } } });
  if (!entry || !canDeleteGuestbookEntry(me.id, entry)) return fail(messages.notFound);
  await db.guestbookEntry.update({ where: { id: entryId }, data: { deletedAt: new Date() } });
  revalidatePath(`/u/${entry.host.username}`, "layout");
  return ok(undefined, "방명록을 삭제했어요.");
}

/** 더 보기(무한 스크롤) */
export async function loadMoreGuestbook(hostId: string, cursor: string) {
  const me = await getCurrentUser();
  return listGuestbook(hostId, me?.id ?? null, cursor);
}
