"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { updateSpace } from "@/features/space/actions";
import { cardStyles, spaceBackgrounds, spaceLayouts, spaceThemes, spaceWidgets, themeStyle, type WidgetSetting } from "@/features/space/themes";
import { parseMusicUrl } from "@/features/space/music";
import { cn } from "@/lib/cn";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

type State = {
  themeId: string;
  backgroundId: string;
  layoutVariant: string;
  cardStyle: string;
  widgets: WidgetSetting[];
  musicUrl: string;
  musicTitle: string;
  musicArtist: string;
};

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-card p-5">
      <legend className="sr-only">{title}</legend>
      <h2 className="text-title font-bold">{title}</h2>
      {description && <p className="mt-0.5 text-caption text-fg-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </fieldset>
  );
}

export function SpaceForm({ username, initial }: { username: string; initial: State }) {
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((prev) => ({ ...prev, [k]: v }));
  const musicValid = !s.musicUrl || parseMusicUrl(s.musicUrl) !== null;

  function moveWidget(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= s.widgets.length) return;
    const next = [...s.widgets];
    [next[i], next[j]] = [next[j], next[i]];
    set("widgets", next);
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateSpace(s as Parameters<typeof updateSpace>[0]);
          if (res.ok) {
            toast(res.message ?? "저장했어요.");
            router.refresh();
          } else toast(res.error, "error");
        });
      }}
    >
      {/* 미리보기 */}
      <div style={themeStyle(s.themeId) as React.CSSProperties} data-card={s.cardStyle} className={cn("space-scope space-bg overflow-hidden rounded-lg border border-line p-5", `space-bg-${s.backgroundId}`)} aria-label="미리보기">
        <div className="space-card flex items-center gap-3 p-4">
          <span className="size-12 rounded-full bg-accent" />
          <div className="flex-1">
            <p className="font-bold">내 {s.layoutVariant === "cover" ? "커버형" : "클래식"} 공간</p>
            <p className="text-caption text-fg-muted">이런 느낌으로 보여요</p>
          </div>
          <span className="rounded-full bg-accent px-3 py-1 text-caption font-semibold text-on-accent">버튼</span>
        </div>
      </div>

      <Section title="테마 색">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8" role="radiogroup" aria-label="테마 색">
          {spaceThemes.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={s.themeId === t.id} aria-label={t.name} onClick={() => set("themeId", t.id)} className={cn("flex flex-col items-center gap-1 rounded-md p-2", s.themeId === t.id && "bg-surface-muted ring-2 ring-fg")}>
              <span className="size-8 rounded-full" style={{ backgroundColor: t.accent }} />
              <span className="text-label">{t.name}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="배경 무늬">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="배경 무늬">
          {spaceBackgrounds.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={s.backgroundId === b.id}
              onClick={() => set("backgroundId", b.id)}
              style={themeStyle(s.themeId) as React.CSSProperties}
              className={cn("space-scope space-bg flex h-16 items-end justify-center rounded-md border border-line pb-1 text-label font-semibold", `space-bg-${b.id}`, s.backgroundId === b.id && "ring-2 ring-fg")}
            >
              {b.name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="레이아웃과 카드">
        <div className="grid gap-2 sm:grid-cols-2">
          {spaceLayouts.map((l) => (
            <button key={l.id} type="button" aria-pressed={s.layoutVariant === l.id} onClick={() => set("layoutVariant", l.id)} className={cn("rounded-md border p-3 text-left", s.layoutVariant === l.id ? "border-fg bg-surface-muted" : "border-line")}>
              <span className="block font-semibold">{l.name}</span>
              <span className="text-caption text-fg-muted">{l.description}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {cardStyles.map((c) => (
            <button key={c.id} type="button" aria-pressed={s.cardStyle === c.id} onClick={() => set("cardStyle", c.id)} className={cn("h-9 rounded-full border px-4 text-caption font-semibold", s.cardStyle === c.id ? "border-fg bg-fg text-bg" : "border-line-strong text-fg-muted")}>
              카드: {c.name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="위젯 순서와 표시" description="내 공간 홈에 보일 위젯을 고르고 순서를 바꿔요.">
        <ul className="divide-y divide-line rounded-md border border-line">
          {s.widgets.map((w, i) => (
            <li key={w.id} className={cn("flex items-center gap-2 px-3 py-2", !w.visible && "opacity-50")}>
              <span className="flex-1 font-medium">{spaceWidgets.find((x) => x.id === w.id)?.name}</span>
              <button type="button" aria-label="위로" onClick={() => moveWidget(i, -1)} disabled={i === 0} className="rounded-full p-2 hover:bg-surface-muted disabled:opacity-30">
                <ArrowUp className="size-4" />
              </button>
              <button type="button" aria-label="아래로" onClick={() => moveWidget(i, 1)} disabled={i === s.widgets.length - 1} className="rounded-full p-2 hover:bg-surface-muted disabled:opacity-30">
                <ArrowDown className="size-4" />
              </button>
              <button
                type="button"
                aria-pressed={w.visible}
                aria-label={w.visible ? "숨기기" : "보이기"}
                onClick={() => set("widgets", s.widgets.map((x) => (x.id === w.id ? { ...x, visible: !x.visible } : x)))}
                className="rounded-full p-2 hover:bg-surface-muted"
              >
                {w.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="BGM" description="Spotify 또는 YouTube 링크를 붙이면 공식 플레이어로 재생돼요. (음원을 직접 올릴 수는 없어요)">
        <div className="flex flex-col gap-3">
          <Input label="링크" value={s.musicUrl} onChange={(e) => set("musicUrl", e.target.value)} placeholder="https://open.spotify.com/track/..." error={musicValid ? undefined : "Spotify 또는 YouTube 링크만 쓸 수 있어요."} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="곡 제목 (선택)" value={s.musicTitle} onChange={(e) => set("musicTitle", e.target.value)} maxLength={60} />
            <Input label="아티스트 (선택)" value={s.musicArtist} onChange={(e) => set("musicArtist", e.target.value)} maxLength={60} />
          </div>
        </div>
      </Section>

      <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] flex justify-end gap-2 lg:bottom-4">
        <ButtonLink href={`/@${username}`} variant="secondary">
          내 공간 보기
        </ButtonLink>
        <Button type="submit" loading={pending} disabled={!musicValid}>
          저장
        </Button>
      </div>
    </form>
  );
}
