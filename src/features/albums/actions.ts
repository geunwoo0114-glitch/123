"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { fail, fromZodError, messages, ok, type ActionResult } from "@/lib/action";
import { ownedMediaIds } from "@/features/media/service";
import { track } from "@/features/analytics/track";
import { addPhotosSchema, albumInputSchema } from "./schemas";

export async function saveAlbum(id: string | null, input: z.input<typeof albumInputSchema>): Promise<ActionResult<{ id: string }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = albumInputSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  let albumId: string;
  if (id) {
    const res = await db.album.updateMany({ where: { id, ownerId: me.id, deletedAt: null }, data: parsed.data });
    if (res.count === 0) return fail(messages.notFound);
    albumId = id;
  } else {
    const count = await db.album.count({ where: { ownerId: me.id, deletedAt: null } });
    if (count >= 100) return fail("앨범은 100개까지 만들 수 있어요.");
    albumId = (await db.album.create({ data: { ...parsed.data, ownerId: me.id }, select: { id: true } })).id;
    track("album_created", me.id);
  }
  revalidatePath(`/u/${me.username}`, "layout");
  return ok({ id: albumId }, id ? "앨범을 수정했어요." : "새 앨범을 만들었어요.");
}

export async function addPhotos(input: z.input<typeof addPhotosSchema>): Promise<ActionResult<{ count: number }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = addPhotosSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { albumId, mediaIds, caption } = parsed.data;
  const album = await db.album.findFirst({ where: { id: albumId, ownerId: me.id, deletedAt: null }, select: { id: true } });
  if (!album) return fail(messages.notFound);
  const owned = await ownedMediaIds(me.id, mediaIds);
  if (owned === null) return fail("사진을 다시 올려 주세요.");

  await db.$transaction([
    db.photo.createMany({ data: owned.map((mediaId) => ({ albumId, mediaId, caption })) }),
    db.album.update({ where: { id: albumId }, data: { photoCount: { increment: owned.length }, lastPhotoAt: new Date() } }),
  ]);
  track("photos_uploaded", me.id, { count: owned.length });
  revalidatePath(`/u/${me.username}`, "layout");
  revalidatePath("/");
  return ok({ count: owned.length }, `사진 ${owned.length}장을 올렸어요.`);
}

export async function deletePhoto(photoId: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const photo = await db.photo.findFirst({ where: { id: photoId, album: { ownerId: me.id } }, select: { id: true, albumId: true } });
  if (!photo) return fail(messages.notFound);
  await db.$transaction([
    db.photo.delete({ where: { id: photoId } }),
    db.album.update({ where: { id: photo.albumId }, data: { photoCount: { decrement: 1 } } }),
    db.album.updateMany({ where: { id: photo.albumId, coverPhotoId: photoId }, data: { coverPhotoId: null } }),
  ]);
  revalidatePath(`/u/${me.username}`, "layout");
  return ok(undefined, "사진을 삭제했어요.");
}

export async function setAlbumCover(albumId: string, photoId: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const photo = await db.photo.findFirst({ where: { id: photoId, albumId, album: { ownerId: me.id } }, select: { id: true } });
  if (!photo) return fail(messages.notFound);
  await db.album.update({ where: { id: albumId }, data: { coverPhotoId: photoId } });
  revalidatePath(`/u/${me.username}`, "layout");
  return ok(undefined, "앨범 커버로 정했어요.");
}

export async function deleteAlbum(albumId: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const res = await db.album.updateMany({ where: { id: albumId, ownerId: me.id, deletedAt: null }, data: { deletedAt: new Date() } });
  if (res.count === 0) return fail(messages.notFound);
  revalidatePath(`/u/${me.username}`, "layout");
  return ok(undefined, "앨범을 삭제했어요.");
}
