import { requireOnboardedUser } from "@/lib/auth/guards";
import { listAlbums } from "@/features/albums/queries";
import { PhotoUploader } from "@/components/content/photo-uploader";
import { MobileTopBar } from "@/components/shell/nav";

export const metadata = { title: "사진첩에 올리기" };

export default async function WritePhotosPage({ searchParams }: PageProps<"/write/photos">) {
  const me = await requireOnboardedUser("/write/photos");
  const { album } = await searchParams;
  const albums = await listAlbums(me.id, me.id);
  return (
    <>
      <MobileTopBar title="사진첩에 올리기" />
      <div className="mx-auto max-w-[680px] px-4 pt-4 pb-10 lg:pt-8">
        <h1 className="mb-4 hidden text-heading font-bold lg:block">사진첩에 올리기</h1>
        <PhotoUploader username={me.username} albums={albums.map((a) => ({ id: a.id, title: a.title, photoCount: a.photoCount }))} initialAlbumId={typeof album === "string" ? album : undefined} />
      </div>
    </>
  );
}
