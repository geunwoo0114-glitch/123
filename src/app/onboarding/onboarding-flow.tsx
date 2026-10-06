"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, ChevronLeft } from "lucide-react";
import { completeOnboarding } from "@/features/space/actions";
import { minimiBackgrounds, minimiUrl, partCounts, randomAvatar, type AvatarConfig, type Slot } from "@/features/avatar/schema";
import { isFreeItem } from "@/features/town/catalog";
import { interestSuggestions } from "@/features/users/schemas";
import { spaceThemes, type SpaceThemeId } from "@/features/space/themes";
import { appConfig } from "@/config/app";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { Logo } from "@/components/brand/logo";

const steps = ["미니미", "이름과 상태", "관심사", "공간 테마"];
const quickParts: { slot: Slot; label: string }[] = [
  { slot: "hair", label: "헤어" },
  { slot: "body", label: "옷" },
  { slot: "eyes", label: "눈" },
  { slot: "lips", label: "입" },
  { slot: "bg", label: "배경" },
];

export function OnboardingFlow({ username, displayName: initialName, avatar: initialAvatar }: { username: string; displayName: string; avatar: AvatarConfig }) {
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [displayName, setDisplayName] = useState(initialName);
  const [statusMessage, setStatusMessage] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [themeId, setThemeId] = useState<SpaceThemeId>("peach");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  /** 무료 아이템 안에서 다음/이전 파트로 */
  function cycle(slot: Slot, dir: 1 | -1) {
    const n = partCounts[slot];
    let i = avatar[slot];
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (isFreeItem(slot, i)) break;
    }
    setAvatar({ ...avatar, [slot]: i });
  }

  function finish() {
    start(async () => {
      const res = await completeOnboarding({ displayName, statusMessage, statusEmoji: "", interests, avatar, themeId });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast(`${brand.spaceNoun}이 완성됐어요! 이제 친구를 찾아볼까요?`);
      router.push("/explore");
      router.refresh();
    });
  }

  const canNext = step !== 1 || displayName.trim().length > 0;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-4 py-4">
        <Logo />
        <span className="text-caption text-fg-subtle tabular-nums">
          {step + 1} / {steps.length}
        </span>
      </header>
      <div className="mx-auto h-1 w-full max-w-xl overflow-hidden rounded-full bg-surface-muted px-0">
        <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>
      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8">
        {step === 0 && (
          <section className="animate-fade-up flex flex-col items-center gap-5">
            <div className="text-center">
              <h1 className="text-heading font-bold">반가워요! 나를 닮은 미니미를 골라요</h1>
              <p className="mt-1 text-caption text-fg-muted">더 많은 아이템은 {brand.townName}에서 모을 수 있어요.</p>
            </div>
            <div className="size-48 overflow-hidden rounded-full shadow-2" style={{ backgroundColor: minimiBackgrounds[avatar.bg] }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 미니미 미리보기 */}
              <img src={minimiUrl(avatar)} alt="내 미니미" className="size-full translate-y-[4%]" />
            </div>
            <Button variant="secondary" icon={<Shuffle className="size-4" />} onClick={() => setAvatar(randomAvatar(`${username}${Math.random()}`, isFreeItem))}>
              랜덤으로 바꾸기
            </Button>
            <ul className="w-full max-w-sm space-y-2">
              {quickParts.map((p) => (
                <li key={p.slot} className="flex items-center justify-between rounded-md bg-surface px-3 py-2 shadow-1">
                  <button type="button" aria-label={`이전 ${p.label}`} onClick={() => cycle(p.slot, -1)} className="flex size-9 items-center justify-center rounded-full hover:bg-surface-muted">
                    ‹
                  </button>
                  <span className="font-semibold">{p.label}</span>
                  <button type="button" aria-label={`다음 ${p.label}`} onClick={() => cycle(p.slot, 1)} className="flex size-9 items-center justify-center rounded-full hover:bg-surface-muted">
                    ›
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {step === 1 && (
          <section className="animate-fade-up flex flex-col gap-5">
            <div>
              <h1 className="text-heading font-bold">친구들이 부를 이름과 지금 상태</h1>
              <p className="mt-1 text-caption text-fg-muted">상태 메시지는 친구 목록과 홈 상단에 말풍선으로 보여요.</p>
            </div>
            <Input label="이름(닉네임)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={appConfig.limits.displayName} />
            <Input label="상태 메시지 (선택)" value={statusMessage} onChange={(e) => setStatusMessage(e.target.value)} maxLength={appConfig.limits.statusMessage} placeholder="오늘도 열심히 ☕ / 여행 중 ✈️ / 잠수 중 😴" />
            <div className="flex flex-wrap gap-1.5">
              {["오늘도 열심히 ☕", "여행 중 ✈️", "잠수 중 😴", "새 출발 🌱", "음악 듣는 중 🎧"].map((s) => (
                <button key={s} type="button" onClick={() => setStatusMessage(s)} className="rounded-full bg-surface px-3 py-1.5 text-caption shadow-1 hover:bg-surface-muted">
                  {s}
                </button>
              ))}
            </div>
          </section>
        )}
        {step === 2 && (
          <section className="animate-fade-up flex flex-col gap-5">
            <div>
              <h1 className="text-heading font-bold">어떤 걸 좋아해요?</h1>
              <p className="mt-1 text-caption text-fg-muted">같은 관심사를 가진 사람을 추천해 드려요. (최대 {appConfig.limits.interests}개)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...interestSuggestions, ...interests])].map((i) => {
                const on = interests.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    disabled={!on && interests.length >= appConfig.limits.interests}
                    onClick={() => setInterests(on ? interests.filter((x) => x !== i) : [...interests, i])}
                    className={cn("h-10 rounded-full border px-4 text-body font-medium transition-colors disabled:opacity-40", on ? "border-primary bg-primary text-on-primary" : "border-line-strong bg-surface text-fg-muted")}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = custom.trim().slice(0, 16);
                if (v && !interests.includes(v) && interests.length < appConfig.limits.interests) setInterests([...interests, v]);
                setCustom("");
              }}
            >
              <Input aria-label="직접 입력" wrapClassName="flex-1" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="직접 입력" maxLength={16} />
              <Button type="submit" variant="secondary" className="h-11">
                추가
              </Button>
            </form>
          </section>
        )}
        {step === 3 && (
          <section className="animate-fade-up flex flex-col gap-5">
            <div>
              <h1 className="text-heading font-bold">내 {brand.spaceNoun}의 색을 골라요</h1>
              <p className="mt-1 text-caption text-fg-muted">배경, 레이아웃, 위젯은 나중에 설정에서 더 꾸밀 수 있어요.</p>
            </div>
            <div className="grid grid-cols-4 gap-3" role="radiogroup" aria-label="공간 테마">
              {spaceThemes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={themeId === t.id}
                  onClick={() => setThemeId(t.id)}
                  className={cn("flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all", themeId === t.id ? "border-fg" : "border-transparent")}
                  style={{ backgroundColor: t.tint }}
                >
                  <span className="size-9 rounded-full shadow-1" style={{ backgroundColor: t.accent }} />
                  <span className="text-label font-semibold text-[#1d1915]">{t.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
      <footer className="pb-safe sticky bottom-0 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-3">
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0} icon={<ChevronLeft className="size-4" />}>
            이전
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
              다음
            </Button>
          ) : (
            <Button onClick={finish} loading={pending}>
              내 {brand.spaceNoun} 완성!
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
