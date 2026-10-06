"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shuffle } from "lucide-react";
import { faceSlots, isFreeItem, shopSlots } from "@/features/town/catalog";
import { saveCloset } from "@/features/town/actions";
import { minimiBackgrounds, minimiUrl, partCounts, type AvatarConfig, type Slot } from "@/features/avatar/schema";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

const allSlots: { slot: Slot; label: string }[] = [...shopSlots.map((s) => ({ slot: s.slot as Slot, label: s.label })), ...faceSlots];

/** 옷장: 가진 아이템만 고를 수 있는 미니미 편집기 */
export function ClosetEditor({ initial, owned, name }: { initial: AvatarConfig; owned: string[]; name: string }) {
  const [config, setConfig] = useState(initial);
  const [slot, setSlot] = useState<Slot>("hair");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const ownedSet = useMemo(() => new Set(owned), [owned]);
  const has = (s: Slot, i: number) => isFreeItem(s, i) || ownedSet.has(`${s}:${i}`);
  const dirty = JSON.stringify(config) !== JSON.stringify(initial);

  const options = Array.from({ length: partCounts[slot] }, (_, i) => i);

  function randomize() {
    const next = { ...config };
    for (const { slot: s } of allSlots) {
      const mine = Array.from({ length: partCounts[s] }, (_, i) => i).filter((i) => has(s, i));
      next[s] = mine[Math.floor(Math.random() * mine.length)];
    }
    setConfig(next);
  }

  return (
    <div className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-card self-start p-4 md:sticky md:top-6 lg:top-22">
        <div className="mx-auto aspect-square w-48 overflow-hidden rounded-full md:w-full" style={{ backgroundColor: minimiBackgrounds[config.bg] }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 미니미 미리보기 */}
          <img src={minimiUrl(config)} alt={`${name}의 미니미`} className="size-full translate-y-[4%]" />
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={randomize} icon={<Shuffle className="size-4" />} aria-label="가진 아이템으로 랜덤 코디">
            랜덤
          </Button>
          <Button
            className="flex-1"
            disabled={!dirty}
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await saveCloset(config);
                toast(res.ok ? (res.message ?? "저장했어요.") : res.error, res.ok ? "success" : "error");
                if (res.ok) router.refresh();
              })
            }
          >
            이대로 입기
          </Button>
        </div>
      </aside>
      <div className="min-w-0">
        <div role="tablist" aria-label="파트" className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-3">
          {allSlots.map((s) => (
            <button
              key={s.slot}
              role="tab"
              type="button"
              aria-selected={slot === s.slot}
              onClick={() => setSlot(s.slot)}
              className={cn("h-9 shrink-0 rounded-full border px-3.5 text-caption font-semibold", slot === s.slot ? "border-fg bg-fg text-bg" : "border-line-strong text-fg-muted")}
            >
              {s.label}
            </button>
          ))}
        </div>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {options.map((i) => {
            const mine = has(slot, i);
            const selected = config[slot] === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={!mine}
                  aria-pressed={selected}
                  aria-label={mine ? `${i}번 선택` : `${i}번 (상점에서 구매 필요)`}
                  onClick={() => setConfig((c) => ({ ...c, [slot]: i }))}
                  className={cn(
                    "relative aspect-square w-full overflow-hidden rounded-lg border-2 transition-all",
                    selected ? "border-primary shadow-2" : "border-transparent",
                    !mine && "opacity-45",
                  )}
                  style={{ backgroundColor: slot === "bg" ? minimiBackgrounds[i] : "var(--surface-muted)" }}
                >
                  {slot !== "bg" && (
                    // eslint-disable-next-line @next/next/no-img-element -- 파트 미리보기
                    <img src={minimiUrl({ ...config, [slot]: i })} alt="" loading="lazy" className="size-full translate-y-[4%]" />
                  )}
                  {!mine && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Lock className="size-5 text-fg" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-center text-caption text-fg-muted">
          잠긴 아이템은{" "}
          <ButtonLink href="/town/shop" variant="ghost" size="sm" className="inline-flex">
            상점
          </ButtonLink>
          에서 살 수 있어요.
        </p>
      </div>
    </div>
  );
}
