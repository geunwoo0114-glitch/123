"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ImageIcon } from "lucide-react";
import type { PhotoDTO } from "@/features/albums/queries";
import { deletePhoto, setAlbumCover } from "@/features/albums/actions";
import { Lightbox, MediaImage } from "@/components/media/photo-grid";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm";

export function AlbumGallery({ photos, albumId, title, isOwner, coverPhotoId }: { photos: PhotoDTO[]; albumId: string; title: string; isOwner: boolean; coverPhotoId: string | null }) {
  const [open, setOpen] = useState<number | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const images = photos.map((p) => ({ ...p.media, alt: p.caption, caption: p.caption }));
  return (
    <>
      <ul className="grid grid-cols-3 gap-1 sm:gap-2 md:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.id} className="group relative aspect-square overflow-hidden rounded-sm bg-surface-muted">
            <button type="button" className="size-full" onClick={() => setOpen(i)} aria-label={`${title} 사진 ${i + 1} 크게 보기`}>
              <MediaImage media={p.media} thumb alt={p.caption || `${title} 사진 ${i + 1}`} className="size-full transition-transform duration-300 group-hover:scale-105" />
            </button>
            {coverPhotoId === p.id && <span className="absolute top-1.5 left-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">커버</span>}
            {isOwner && (
              <div className="absolute right-1.5 bottom-1.5 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
                <button
                  type="button"
                  aria-label="커버로 지정"
                  onClick={() =>
                    start(async () => {
                      const res = await setAlbumCover(albumId, p.id);
                      toast(res.ok ? (res.message ?? "") : res.error, res.ok ? "success" : "error");
                      router.refresh();
                    })
                  }
                  className="flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
                >
                  <ImageIcon className="size-3.5" />
                </button>
                <button type="button" aria-label="사진 삭제" onClick={() => setDel(p.id)} className="flex size-7 items-center justify-center rounded-full bg-black/55 text-white">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {open !== null && <Lightbox images={images} index={open} onClose={() => setOpen(null)} label={title} />}
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title="이 사진을 삭제할까요?"
        pending={pending}
        onConfirm={() =>
          start(async () => {
            const res = await deletePhoto(del!);
            setDel(null);
            toast(res.ok ? (res.message ?? "삭제했어요.") : res.error, res.ok ? "success" : "error");
            router.refresh();
          })
        }
      />
    </>
  );
}
