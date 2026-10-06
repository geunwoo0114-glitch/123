"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import type { useUploads } from "./use-uploads";

/** 사진 선택(클릭/드래그/붙여넣기) + 미리보기 트레이 */
export function UploadTray({ uploads, max, compact }: { uploads: ReturnType<typeof useUploads>; max: number; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const toast = useToast();

  async function handle(files: FileList | File[]) {
    const skipped = await uploads.add(files);
    if (skipped > 0) toast(`사진은 ${max}장까지 올릴 수 있어요.`, "info");
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) void handle(e.dataTransfer.files);
      }}
      className={cn("rounded-md transition-colors", dragging && "bg-primary-soft ring-2 ring-primary ring-dashed")}
    >
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple={max > 1}
        className="sr-only"
        tabIndex={-1}
        aria-label="사진 파일 선택"
        onChange={(e) => {
          if (e.target.files) void handle(e.target.files);
          e.target.value = "";
        }}
      />
      <div className={cn("flex gap-2 overflow-x-auto scrollbar-none", !compact && "flex-wrap")}>
        {uploads.items.map((item, idx) => (
          <div key={item.localId} className="group relative size-24 shrink-0 overflow-hidden rounded-md bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 blob 미리보기 */}
            <img src={item.previewUrl} alt={`첨부 사진 ${idx + 1}`} className={cn("size-full object-cover", item.status !== "done" && "opacity-50")} />
            {item.status === "uploading" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <Spinner className="size-6 text-white drop-shadow" label="업로드 중" />
              </span>
            )}
            {item.status === "error" && (
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-danger/90 px-1.5 py-1 text-[10px] font-medium text-white">
                <AlertCircle className="size-3 shrink-0" /> {item.error}
              </span>
            )}
            <button
              type="button"
              aria-label="사진 빼기"
              onClick={() => uploads.remove(item.localId)}
              className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="size-3.5" />
            </button>
            {uploads.items.length > 1 && item.status === "done" && (
              <div className="absolute bottom-1 left-1 hidden gap-0.5 group-focus-within:flex group-hover:flex">
                <button type="button" aria-label="앞으로" onClick={() => uploads.move(item.localId, -1)} className="flex size-6 items-center justify-center rounded-full bg-black/60 text-white">
                  <ChevronLeft className="size-3.5" />
                </button>
                <button type="button" aria-label="뒤로" onClick={() => uploads.move(item.localId, 1)} className="flex size-6 items-center justify-center rounded-full bg-black/60 text-white">
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        {uploads.items.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-line-strong text-caption text-fg-muted transition-colors hover:border-fg-subtle hover:bg-surface-muted"
          >
            <ImagePlus className="size-6" />
            {uploads.items.length}/{max}
          </button>
        )}
      </div>
    </div>
  );
}
