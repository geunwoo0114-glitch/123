"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { MediaDTO } from "@/features/media/service";
import { cn } from "@/lib/cn";

export function MediaImage({ media, thumb, alt, className, sizes }: { media: MediaDTO; thumb?: boolean; alt: string; className?: string; sizes?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 업로드 시 리사이즈된 webp를 그대로 사용
    <img
      src={`/media/${thumb ? media.thumbKey : media.key}`}
      srcSet={thumb ? undefined : `/media/${media.thumbKey} 480w, /media/${media.key} ${media.width}w`}
      sizes={sizes}
      width={media.width}
      height={media.height}
      alt={alt}
      loading="lazy"
      decoding="async"
      style={{ backgroundColor: media.dominant }}
      className={cn("object-cover", className)}
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

/** 게시물 사진 배치: 1장(원본 비율), 2장(반반), 3장+(큰 1 + 작은 2), 4장+(2x2) */
export function PostPhotos({ images, label }: { images: (MediaDTO & { alt?: string })[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (images.length === 0) return null;
  const shown = images.slice(0, 4);
  const more = images.length - shown.length;
  const layout =
    images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : images.length === 3 ? "grid-cols-2 grid-rows-2" : "grid-cols-2 grid-rows-2";
  return (
    <>
      <div className={cn("grid gap-1 overflow-hidden rounded-md", layout, images.length > 1 && "aspect-[4/3]")}>
        {shown.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`${label} 사진 ${i + 1} 크게 보기`}
            className={cn("relative overflow-hidden bg-surface-muted", images.length === 3 && i === 0 && "row-span-2")}
          >
            <MediaImage
              media={img}
              thumb={images.length > 2}
              alt={img.alt || `${label} 사진 ${i + 1}`}
              sizes="(max-width: 640px) 100vw, 600px"
              className={cn("size-full transition-transform duration-300 hover:scale-[1.02]", images.length === 1 && "max-h-[560px]")}
            />
            {more > 0 && i === shown.length - 1 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-heading font-bold text-white">+{more}</span>
            )}
          </button>
        ))}
      </div>
      {open !== null && <Lightbox images={images} index={open} onClose={() => setOpen(null)} label={label} />}
    </>
  );
}

/** 전체 화면 사진 뷰어: ←/→/ESC, 스와이프 */
export function Lightbox({ images, index, onClose, label }: { images: (MediaDTO & { alt?: string; caption?: string })[]; index: number; onClose: () => void; label: string }) {
  const [i, setI] = useState(index);
  const [touchX, setTouchX] = useState<number | null>(null);
  const go = useCallback((d: number) => setI((x) => (x + d + images.length) % images.length), [images.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  const img = images[i];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${label} 사진 보기`}
      className="animate-fade-up fixed inset-0 z-[70] flex flex-col bg-black/92"
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        setTouchX(null);
      }}
    >
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-caption tabular-nums opacity-80">
          {i + 1} / {images.length}
        </span>
        <button type="button" onClick={onClose} aria-label="닫기" autoFocus className="rounded-full p-2 hover:bg-white/10">
          <X className="size-6" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 원본 크기 뷰어 */}
        <img src={`/media/${img.key}`} alt={img.alt || `${label} 사진 ${i + 1}`} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        {images.length > 1 && (
          <>
            <button type="button" aria-label="이전 사진" onClick={(e) => (e.stopPropagation(), go(-1))} className="absolute left-3 hidden rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:block">
              <ChevronLeft className="size-6" />
            </button>
            <button type="button" aria-label="다음 사진" onClick={(e) => (e.stopPropagation(), go(1))} className="absolute right-3 hidden rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:block">
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>
      {img.caption && <p className="pb-safe px-5 py-4 text-center text-body text-white/90">{img.caption}</p>}
    </div>
  );
}
