"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { checkLimit } from "@/lib/rate-limit";
import { dayToDate } from "@/lib/dates";
import { fail, fromZodError, messages, ok, type ActionResult } from "@/lib/action";
import { ownedMediaIds } from "@/features/media/service";
import { track } from "@/features/analytics/track";
import { diaryInputSchema } from "./schemas";

export async function saveDiary(id: string | null, input: z.input<typeof diaryInputSchema>): Promise<ActionResult<{ id: string }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = diaryInputSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  if (!(await checkLimit("post", me.id))) return fail(messages.rateLimited);
  const { mediaIds, date, ...rest } = parsed.data;
  const owned = await ownedMediaIds(me.id, mediaIds);
  if (owned === null) return fail("사진을 다시 올려 주세요.");
  const tags = [...new Set(rest.tags.map((t) => t.replace(/^#/, "").toLowerCase()))];
  const data = { ...rest, tags, date: dayToDate(date) };

  let entryId: string;
  if (id) {
    const existing = await db.diaryEntry.findFirst({ where: { id, deletedAt: null }, select: { authorId: true } });
    if (!existing || existing.authorId !== me.id) return fail(messages.notFound);
    await db.$transaction([
      db.diaryImage.deleteMany({ where: { diaryId: id } }),
      db.diaryEntry.update({ where: { id }, data: { ...data, images: { create: owned.map((mediaId, order) => ({ mediaId, order })) } } }),
    ]);
    entryId = id;
  } else {
    const created = await db.diaryEntry.create({
      data: { ...data, authorId: me.id, images: { create: owned.map((mediaId, order) => ({ mediaId, order })) } },
      select: { id: true },
    });
    entryId = created.id;
    track("diary_created", me.id, { visibility: data.visibility });
  }
  revalidatePath(`/u/${me.username}`, "layout");
  revalidatePath("/");
  return ok({ id: entryId }, id ? "일기를 고쳤어요." : "오늘의 일기를 남겼어요.");
}

export async function deleteDiary(id: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const res = await db.diaryEntry.updateMany({ where: { id, authorId: me.id, deletedAt: null }, data: { deletedAt: new Date() } });
  if (res.count === 0) return fail(messages.notFound);
  revalidatePath(`/u/${me.username}`, "layout");
  return ok(undefined, "일기를 삭제했어요.");
}
