"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Visibility } from "@/features/privacy/policy";
import { addPhotos, saveAlbum } from "@/features/albums/actions";
import { albumPresets } from "@/features/albums/schemas";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useUploads } from "@/components/media/use-uploads";
import { UploadTray } from "@/components/media/upload-tray";
import { VisibilityPicker } from "./visibility-picker";

type AlbumOption = { id: string; title: string; photoCount: number };

export function PhotoUploader({ username, albums, initialAlbumId }: { username: string; albums: AlbumOption[]; initialAlbumId?: string }) {
  const [albumId, setAlbumId] = useState<string | "new">(initialAlbumId ?? albums[0]?.id ?? "new");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("FRIENDS");
  const [caption, setCaption] = useState("");
  const uploads = useUploads(appConfig.limits.photosPerUpload);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function submit() {
    start(async () => {
      let target = albumId;
      if (target === "new") {
        const res = await saveAlbum(null, { title, description, visibility });
        if (!res.ok) return toast(res.error, "error");
        target = res.data!.id;
      }
      if (uploads.mediaIds.length === 0) {
        toast("앨범을 만들었어요.");
        router.push(`/@${username}/photos/${target}`);
        return;
      }
      const res = await addPhotos({ albumId: target, mediaIds: uploads.mediaIds, caption });
      if (!res.ok) return toast(res.error, "error");
      toast(res.message ?? "올렸어요.");
      router.push(`/@${username}/photos/${target}`);
      router.refresh();
    });
  }

  const canSubmit = albumId === "new" ? title.trim().length > 0 : uploads.mediaIds.length > 0;

  return (
    <form
      className="space-card flex flex-col gap-5 p-4 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <fieldset>
        <legend className="mb-2 text-caption font-semibold">어느 앨범에 넣을까요?</legend>
        <div className="flex flex-wrap gap-1.5">
          {albums.map((a) => (
            <button key={a.id} type="button" aria-pressed={albumId === a.id} onClick={() => setAlbumId(a.id)} className={cn("h-9 rounded-full border px-3.5 text-caption font-medium", albumId === a.id ? "border-fg bg-fg text-bg" : "border-line-strong text-fg-muted")}>
              {a.title} <span className="opacity-60">{a.photoCount}</span>
            </button>
          ))}
          <button type="button" aria-pressed={albumId === "new"} onClick={() => setAlbumId("new")} className={cn("inline-flex h-9 items-center gap-1 rounded-full border border-dashed px-3.5 text-caption font-medium", albumId === "new" ? "border-primary bg-primary-soft text-primary" : "border-line-strong text-fg-muted")}>
            <Plus className="size-4" /> 새 앨범
          </button>
        </div>
      </fieldset>

      {albumId === "new" && (
        <div className="flex flex-col gap-4 rounded-md bg-surface-muted p-4">
          <Input label="앨범 이름" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={appConfig.limits.albumTitle} placeholder="예: 2026 제주 여행" />
          <div className="-mt-2 flex flex-wrap gap-1.5">
            {albumPresets.map((p) => (
              <button key={p} type="button" onClick={() => setTitle(p)} className="rounded-full bg-surface px-2.5 py-1 text-label text-fg-muted hover:text-fg">
                {p}
              </button>
            ))}
          </div>
          <Textarea label="설명 (선택)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={appConfig.limits.albumDescription} minRows={2} />
          <fieldset>
            <legend className="mb-2 text-caption font-semibold">공개 범위</legend>
            <VisibilityPicker value={visibility} onChange={setVisibility} />
          </fieldset>
        </div>
      )}

      <div>
        <p className="mb-2 text-caption font-semibold">사진 (한 번에 {appConfig.limits.photosPerUpload}장까지)</p>
        <UploadTray uploads={uploads} max={appConfig.limits.photosPerUpload} />
      </div>
      <Input label="한 줄 메모 (선택)" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={appConfig.limits.photoCaption} placeholder="이 사진들에 대한 짧은 이야기" />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.back()}>
          취소
        </Button>
        <Button type="submit" loading={pending} disabled={!canSubmit || uploads.uploading}>
          {uploads.uploading ? "사진 올리는 중…" : "올리기"}
        </Button>
      </div>
    </form>
  );
}
