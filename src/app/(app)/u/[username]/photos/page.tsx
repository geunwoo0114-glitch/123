import Link from "next/link";
import { notFound } from "next/navigation";
import { Images, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getSpace } from "@/features/space/queries";
import { listAlbums } from "@/features/albums/queries";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { MediaImage } from "@/components/media/photo-grid";
import { VisibilityIcon } from "@/components/content/visibility-picker";

export default async function AlbumsPage({ params }: PageProps<"/u/[username]/photos">) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const space = await getSpace(username, viewer?.id ?? null);
  if (!space) notFound();
  if (!space.canView) return null;
  const isOwner = space.relation.state === "SELF";
  const albums = await listAlbums(space.owner.id, viewer?.id ?? null);
  const base = `/@${space.owner.username}/photos`;

  if (albums.length === 0) {
    return (
      <div className="space-card">
        <EmptyState
          icon={<Images />}
          title={isOwner ? "첫 번째 추억을 남겨보세요" : "아직 사진첩이 비어 있어요"}
          description={isOwner ? "일상, 여행, 친구… 앨범을 만들고 사진을 모아보세요." : undefined}
          action={isOwner ? <ButtonLink href="/write/photos">앨범 만들기</ButtonLink> : undefined}
        />
      </div>
    );
  }
  return (
    <div>
      {isOwner && (
        <div className="mb-3 flex justify-end">
          <ButtonLink href="/write/photos" variant="accent" size="sm" icon={<Plus className="size-4" />}>
            사진 올리기
          </ButtonLink>
        </div>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {albums.map((a) => (
          <li key={a.id}>
            <Link href={`${base}/${a.id}`} className="group block">
              <div className="space-card relative aspect-square overflow-hidden">
                {a.cover ? (
                  <MediaImage media={a.cover} thumb alt={`${a.title} 커버`} className="size-full transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-accent-soft text-accent">
                    <Images className="size-8" />
                  </div>
                )}
                <span className="absolute top-2 right-2 rounded-full bg-black/45 p-1.5 text-white">
                  <VisibilityIcon value={a.visibility} />
                </span>
              </div>
              <p className="mt-2 truncate font-semibold group-hover:underline">{a.title}</p>
              <p className="text-caption text-fg-subtle">사진 {a.photoCount}장</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
