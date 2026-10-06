"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import type { Visibility } from "@/features/privacy/policy";
import type { MediaDTO } from "@/features/media/service";
import { createPost, updatePost } from "@/features/posts/actions";
import { moods } from "@/features/posts/schemas";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useUploads } from "@/components/media/use-uploads";
import { UploadTray } from "@/components/media/upload-tray";
import { VisibilityPicker } from "./visibility-picker";

type Initial = { id: string; body: string; mood: string | null; visibility: Visibility; linkUrl: string | null; images: MediaDTO[] };

export function PostComposer({ initial, placeholder, redirectTo }: { initial?: Initial; placeholder?: string; redirectTo: string }) {
  const [body, setBody] = useState(initial?.body ?? "");
  const [mood, setMood] = useState<string | null>(initial?.mood ?? null);
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? "FRIENDS");
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? "");
  const [showLink, setShowLink] = useState(!!initial?.linkUrl);
  const [error, setError] = useState<string | null>(null);
  const uploads = useUploads(appConfig.limits.imagesPerPost, initial?.images);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const empty = body.trim().length === 0 && uploads.mediaIds.length === 0;

  function submit() {
    setError(null);
    start(async () => {
      const input = { body, mood, visibility, mediaIds: uploads.mediaIds, linkUrl: showLink ? linkUrl : "" };
      const res = initial ? await updatePost(initial.id, input) : await createPost(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast(res.message ?? "저장했어요.");
      router.push(initial ? `/p/${initial.id}` : redirectTo);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onPaste={(e) => {
        if (e.clipboardData.files.length) void uploads.add(e.clipboardData.files);
      }}
      className="flex flex-col gap-4"
    >
      <Textarea
        aria-label="내용"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder ?? "요즘 어떻게 지내요? #태그 를 붙여도 좋아요"}
        maxLength={appConfig.limits.postBody}
        showCount
        minRows={5}
        autoFocus
        className="border-0 bg-transparent px-0 text-title focus:ring-0"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !empty) submit();
        }}
      />
      <UploadTray uploads={uploads} max={appConfig.limits.imagesPerPost} />

      <fieldset>
        <legend className="mb-2 text-caption font-semibold">지금 기분</legend>
        <div className="flex flex-wrap gap-1.5">
          {moods.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mood === m.id}
              onClick={() => setMood(mood === m.id ? null : m.id)}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-caption transition-colors",
                mood === m.id ? "border-primary bg-primary-soft text-primary" : "border-line text-fg-muted hover:bg-surface-muted",
              )}
            >
              <span aria-hidden>{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>
      </fieldset>

      {showLink ? (
        <Input label="링크" type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://" maxLength={500} />
      ) : (
        <button type="button" onClick={() => setShowLink(true)} className="inline-flex w-fit items-center gap-1.5 text-caption font-medium text-fg-muted hover:text-fg">
          <Link2 className="size-4" /> 링크 붙이기
        </button>
      )}

      <fieldset>
        <legend className="mb-2 text-caption font-semibold">누구에게 보여줄까요?</legend>
        <VisibilityPicker value={visibility} onChange={setVisibility} />
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3.5 py-2.5 text-caption font-medium text-danger">
          {error}
        </p>
      )}
      <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] flex justify-end gap-2 lg:bottom-4">
        <Button variant="ghost" onClick={() => router.back()}>
          취소
        </Button>
        <Button type="submit" loading={pending} disabled={empty || uploads.uploading}>
          {uploads.uploading ? "사진 올리는 중…" : initial ? "수정 완료" : "남기기"}
        </Button>
      </div>
    </form>
  );
}
