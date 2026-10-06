"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { MediaDTO } from "@/features/media/service";
import { updateProfile } from "@/features/space/actions";
import { interestSuggestions } from "@/features/users/schemas";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/cn";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useUploads } from "@/components/media/use-uploads";
import { UploadTray } from "@/components/media/upload-tray";

type Initial = { displayName: string; bio: string; statusMessage: string; statusEmoji: string; interests: string[]; avatarMedia: MediaDTO | null; coverMedia: MediaDTO | null };

export function ProfileForm({ initial }: { initial: Initial }) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [statusMessage, setStatusMessage] = useState(initial.statusMessage);
  const [statusEmoji, setStatusEmoji] = useState(initial.statusEmoji);
  const [interests, setInterests] = useState(initial.interests);
  const avatar = useUploads(1, initial.avatarMedia ? [initial.avatarMedia] : []);
  const cover = useUploads(1, initial.coverMedia ? [initial.coverMedia] : []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  return (
    <form
      className="space-card flex flex-col gap-5 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setErrors({});
        start(async () => {
          const res = await updateProfile({
            displayName,
            bio,
            statusMessage,
            statusEmoji,
            interests,
            avatarMediaId: avatar.mediaIds[0] ?? null,
            coverMediaId: cover.mediaIds[0] ?? null,
          });
          if (res.ok) {
            toast(res.message ?? "저장했어요.");
            router.refresh();
          } else {
            setErrors(res.fieldErrors ?? {});
            toast(res.error, "error");
          }
        });
      }}
    >
      <h2 className="text-title font-bold">프로필</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-caption font-semibold">프로필 사진</p>
          <UploadTray uploads={avatar} max={1} />
          <p className="mt-1.5 text-label text-fg-subtle">사진이 없으면 미니미가 프로필이 돼요.</p>
        </div>
        <div>
          <p className="mb-2 text-caption font-semibold">커버 사진</p>
          <UploadTray uploads={cover} max={1} />
          <p className="mt-1.5 text-label text-fg-subtle">공간 상단에 보여요.</p>
        </div>
      </div>
      <ButtonLink href="/town/closet" variant="soft" size="sm" className="w-fit">
        미니미 꾸미러 가기
      </ButtonLink>
      <Input label="이름(닉네임)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={appConfig.limits.displayName} error={errors.displayName} />
      <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3">
        <Input label="이모지" value={statusEmoji} onChange={(e) => setStatusEmoji(e.target.value)} maxLength={8} placeholder="☕" />
        <Input label="상태 메시지" value={statusMessage} onChange={(e) => setStatusMessage(e.target.value)} maxLength={appConfig.limits.statusMessage} error={errors.statusMessage} />
      </div>
      <Textarea label="소개" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={appConfig.limits.bio} showCount minRows={3} error={errors.bio} placeholder="나를 소개하는 짧은 글" />
      <fieldset>
        <legend className="mb-2 text-caption font-semibold">관심사 (최대 {appConfig.limits.interests}개)</legend>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set([...interests, ...interestSuggestions])].map((i) => {
            const on = interests.includes(i);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={on}
                disabled={!on && interests.length >= appConfig.limits.interests}
                onClick={() => setInterests(on ? interests.filter((x) => x !== i) : [...interests, i])}
                className={cn("inline-flex h-8 items-center gap-1 rounded-full border px-3 text-caption disabled:opacity-40", on ? "border-primary bg-primary-soft text-primary" : "border-line text-fg-muted")}
              >
                {i} {on && <X className="size-3" />}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={avatar.uploading || cover.uploading}>
          저장
        </Button>
      </div>
    </form>
  );
}
