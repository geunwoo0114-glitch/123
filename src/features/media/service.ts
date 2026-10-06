import "server-only";
import { db } from "@/lib/db";
import { storage } from "@/lib/media/storage";
import { processImage } from "@/lib/media/process";

export type MediaDTO = { id: string; key: string; thumbKey: string; width: number; height: number; dominant: string };

export async function createMediaFromUpload(ownerId: string, data: Buffer): Promise<MediaDTO> {
  const img = await processImage(data);
  await Promise.all([storage.put(img.key, img.main), storage.put(img.thumbKey, img.thumb)]);
  const media = await db.media.create({
    data: {
      ownerId,
      key: img.key,
      thumbKey: img.thumbKey,
      mime: "image/webp",
      width: img.width,
      height: img.height,
      bytes: img.main.length,
      dominant: img.dominant,
    },
  });
  return { id: media.id, key: media.key, thumbKey: media.thumbKey, width: media.width, height: media.height, dominant: media.dominant };
}

/** 요청한 media id가 모두 본인 소유인지 확인 (다른 사람 사진을 내 글에 붙이는 IDOR 방지) */
export async function ownedMediaIds(ownerId: string, ids: string[]): Promise<string[] | null> {
  if (ids.length === 0) return [];
  const unique = [...new Set(ids)];
  const rows = await db.media.findMany({ where: { id: { in: unique }, ownerId }, select: { id: true } });
  if (rows.length !== unique.length) return null;
  return unique;
}

export const mediaSelect = { id: true, key: true, thumbKey: true, width: true, height: true, dominant: true } as const;
