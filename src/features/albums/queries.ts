import "server-only";
import { db } from "@/lib/db";
import { mediaSelect, type MediaDTO } from "@/features/media/service";
import { canViewContent, visibleLevels, type Visibility } from "@/features/privacy/policy";
import { getRelation } from "@/features/relationships/queries";

export type AlbumDTO = {
  id: string;
  title: string;
  description: string;
  visibility: Visibility;
  photoCount: number;
  cover: MediaDTO | null;
  updatedAt: string;
};

export type PhotoDTO = { id: string; caption: string; createdAt: string; media: MediaDTO };

export async function listAlbums(ownerId: string, viewerId: string | null): Promise<AlbumDTO[]> {
  const rel = await getRelation(viewerId, ownerId);
  const albums = await db.album.findMany({
    where: { ownerId, deletedAt: null, visibility: { in: visibleLevels(rel) } },
    orderBy: [{ lastPhotoAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      visibility: true,
      photoCount: true,
      coverPhotoId: true,
      updatedAt: true,
      photos: { orderBy: { createdAt: "desc" }, take: 1, select: { media: { select: mediaSelect } } },
    },
  });
  const coverIds = albums.map((a) => a.coverPhotoId).filter((x): x is string => !!x);
  const covers = coverIds.length
    ? await db.photo.findMany({ where: { id: { in: coverIds } }, select: { id: true, media: { select: mediaSelect } } })
    : [];
  return albums.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    visibility: a.visibility,
    photoCount: a.photoCount,
    cover: covers.find((c) => c.id === a.coverPhotoId)?.media ?? a.photos[0]?.media ?? null,
    updatedAt: a.updatedAt.toISOString(),
  }));
}

export async function getAlbumForViewer(albumId: string, viewerId: string | null) {
  const album = await db.album.findFirst({
    where: { id: albumId, deletedAt: null, owner: { status: "ACTIVE" } },
    select: { id: true, ownerId: true, title: true, description: true, visibility: true, photoCount: true, coverPhotoId: true },
  });
  if (!album) return null;
  const rel = await getRelation(viewerId, album.ownerId);
  if (!canViewContent(rel, album.visibility)) return null;
  const photos = await db.photo.findMany({
    where: { albumId },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, caption: true, createdAt: true, media: { select: mediaSelect } },
  });
  return { album, photos: photos.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })) as PhotoDTO[] };
}

/** 공간 홈 '사진첩' 위젯용: 볼 수 있는 앨범의 최근 사진 */
export async function recentPhotos(ownerId: string, viewerId: string | null, take = 6): Promise<PhotoDTO[]> {
  const rel = await getRelation(viewerId, ownerId);
  const rows = await db.photo.findMany({
    where: { album: { ownerId, deletedAt: null, visibility: { in: visibleLevels(rel) } } },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, caption: true, createdAt: true, media: { select: mediaSelect } },
  });
  return rows.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }));
}
