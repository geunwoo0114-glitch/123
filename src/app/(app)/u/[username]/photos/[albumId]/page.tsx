import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getSpace } from "@/features/space/queries";
import { getAlbumForViewer } from "@/features/albums/queries";
import { visibilityLabels } from "@/features/privacy/policy";
import { Badge, EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { AlbumGallery } from "@/components/space/album-gallery";

export default async function AlbumPage({ params }: PageProps<"/u/[username]/photos/[albumId]">) {
  const { username, albumId } = await params;
  const viewer = await getCurrentUser();
  const space = await getSpace(username, viewer?.id ?? null);
  if (!space || !space.canView) notFound();
  const data = await getAlbumForViewer(albumId, viewer?.id ?? null);
  if (!data || data.album.ownerId !== space.owner.id) notFound();
  const isOwner = viewer?.id === space.owner.id;
  const { album, photos } = data;
  return (
    <div>
      <Link href={`/@${space.owner.username}/photos`} className="mb-3 inline-flex items-center text-caption font-medium text-fg-muted hover:text-fg">
        <ChevronLeft className="size-4" /> 사진첩
      </Link>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-heading font-bold">{album.title}</h2>
          {album.description && <p className="text-caption text-fg-muted">{album.description}</p>}
          <p className="mt-1 flex items-center gap-2 text-label text-fg-subtle">
            사진 {album.photoCount}장 {isOwner && <Badge>{visibilityLabels[album.visibility]}</Badge>}
          </p>
        </div>
        {isOwner && (
          <ButtonLink href={`/write/photos?album=${album.id}`} variant="accent" size="sm">
            사진 추가
          </ButtonLink>
        )}
      </div>
      {photos.length === 0 ? (
        <div className="space-card">
          <EmptyState title="아직 사진이 없어요" description={isOwner ? "이 앨범의 첫 사진을 올려보세요." : undefined} />
        </div>
      ) : (
        <AlbumGallery photos={photos} albumId={album.id} title={album.title} isOwner={isOwner} coverPhotoId={album.coverPhotoId} />
      )}
    </div>
  );
}
