"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DiaryDTO } from "@/features/diary/queries";
import type { Visibility } from "@/features/privacy/policy";
import { saveDiary } from "@/features/diary/actions";
import { weathers } from "@/features/diary/schemas";
import { moods } from "@/features/posts/schemas";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useUploads } from "@/components/media/use-uploads";
import { UploadTray } from "@/components/media/upload-tray";
import { VisibilityPicker } from "./visibility-picker";

function ChipGroup<T extends { id: string; emoji: string; label: string }>({ label, items, value, onChange }: { label: string; items: readonly T[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-caption font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <button
            key={i.id}
            type="button"
            aria-pressed={value === i.id}
            onClick={() => onChange(value === i.id ? null : i.id)}
            className={cn("inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-caption", value === i.id ? "border-primary bg-primary-soft text-primary" : "border-line text-fg-muted hover:bg-surface-muted")}
          >
            <span aria-hidden>{i.emoji}</span> {i.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function DiaryEditor({ username, today, prompt, initial }: { username: string; today: string; prompt: string; initial?: DiaryDTO }) {
  const [date, setDate] = useState(initial?.date ?? today);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [mood, setMood] = useState<string | null>(initial?.mood ?? null);
  const [weather, setWeather] = useState<string | null>(initial?.weather ?? null);
  const [place, setPlace] = useState(initial?.place ?? "");
  const [tags, setTags] = useState(initial?.tags.map((t) => `#${t}`).join(" ") ?? "");
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? "PRIVATE");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const uploads = useUploads(appConfig.limits.imagesPerDiary, initial?.images);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function submit() {
    setErrors({});
    start(async () => {
      const res = await saveDiary(initial?.id ?? null, {
        date,
        title,
        body,
        mood,
        weather,
        place,
        visibility,
        tags: tags.split(/[\s,]+/).map((t) => t.replace(/^#/, "")).filter(Boolean),
        mediaIds: uploads.mediaIds,
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? { _: res.error });
        toast(res.error, "error");
        return;
      }
      toast(res.message ?? "저장했어요.");
      router.push(`/@${username}/diary/${res.data!.id}`);
      router.refresh();
    });
  }

  return (
    <form
      className="space-card flex flex-col gap-5 p-4 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <Input type="date" label="날짜" value={date} max={today} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={appConfig.limits.diaryTitle} placeholder="오늘을 한 줄로 부른다면?" error={errors.title} />
      </div>
      <Textarea
        label="오늘의 기록"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={appConfig.limits.diaryBody}
        minRows={10}
        placeholder={`오늘의 질문: ${prompt}`}
        error={errors.body}
        className="bg-[repeating-linear-gradient(transparent,transparent_31px,var(--line)_32px)] leading-[32px]"
      />
      <UploadTray uploads={uploads} max={appConfig.limits.imagesPerDiary} compact />
      <ChipGroup label="날씨" items={weathers} value={weather} onChange={setWeather} />
      <ChipGroup label="기분" items={moods} value={mood} onChange={setMood} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="장소 (선택)" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={40} placeholder="예: 동네 카페" />
        <Input label="태그 (선택)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#여행 #가족" />
      </div>
      <fieldset>
        <legend className="mb-1 text-caption font-semibold">공개 범위</legend>
        <p className="mb-2 text-label text-fg-subtle">다이어리는 기본적으로 나만 봐요. 공개하면 친구 피드에도 보여요.</p>
        <VisibilityPicker value={visibility} onChange={setVisibility} />
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.back()}>
          취소
        </Button>
        <Button type="submit" loading={pending} disabled={uploads.uploading || !title.trim() || !body.trim()}>
          {initial ? "고치기" : "저장"}
        </Button>
      </div>
    </form>
  );
}
