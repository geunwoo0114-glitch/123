"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { catalog, rarityLabel, shopSlots, type ShopItem, type ShopSlot } from "@/features/town/catalog";
import { buyItem } from "@/features/town/actions";
import { minimiUrl, minimiBackgrounds, type AvatarConfig } from "@/features/avatar/schema";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

const rarityTone = { basic: "neutral", common: "neutral", rare: "accent", special: "warning" } as const;

export function ShopView({ avatar, owned, coins, name }: { avatar: AvatarConfig; owned: string[]; coins: number; name: string }) {
  const [slot, setSlot] = useState<ShopSlot>("hair");
  const [preview, setPreview] = useState<ShopItem | null>(null);
  const [ownedSet, setOwnedSet] = useState(() => new Set(owned));
  const [balance, setBalance] = useState(coins);
  const [filter, setFilter] = useState<"all" | "buyable" | "owned">("all");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const c = brand.currency;

  const items = useMemo(
    () =>
      catalog
        .filter((i) => i.slot === slot && !(i.index === 0 && slot !== "hair"))
        .filter((i) => (filter === "owned" ? i.price === 0 || ownedSet.has(i.id) : filter === "buyable" ? i.price > 0 && !ownedSet.has(i.id) : true)),
    [slot, filter, ownedSet],
  );
  const previewConfig = preview ? { ...avatar, [preview.slot]: preview.index } : avatar;

  function buy(item: ShopItem) {
    start(async () => {
      const res = await buyItem(item.id);
      if (res.ok) {
        setOwnedSet((s) => new Set(s).add(item.id));
        if (res.data) setBalance(res.data.coins);
        toast(res.message ?? "구매했어요!");
        router.refresh();
      } else toast(res.error, "error");
    });
  }

  return (
    <div className="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-card self-start p-4 md:sticky md:top-6">
        <div className="mx-auto aspect-square w-44 overflow-hidden rounded-full md:w-full" style={{ backgroundColor: minimiBackgrounds[avatar.bg] }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 미니미 SVG 미리보기 */}
          <img src={minimiUrl(previewConfig)} alt={`${name}의 미니미 미리보기`} className="size-full translate-y-[4%]" />
        </div>
        <div className="mt-3 text-center">
          {preview ? (
            <>
              <p className="font-bold">{preview.name}</p>
              <p className="text-caption text-fg-muted">입어보는 중이에요</p>
            </>
          ) : (
            <p className="text-caption text-fg-muted">아이템을 누르면 미리 입어볼 수 있어요</p>
          )}
        </div>
        <p className="mt-3 rounded-md bg-surface-muted py-2 text-center font-bold tabular-nums">
          {c.emoji} {balance.toLocaleString()}
        </p>
        <ButtonLink href="/town/closet" variant="secondary" className="mt-2 w-full">
          옷장에서 입기
        </ButtonLink>
      </aside>

      <div className="min-w-0">
        <div role="tablist" aria-label="아이템 종류" className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2">
          {shopSlots.map((s) => (
            <button
              key={s.slot}
              role="tab"
              aria-selected={slot === s.slot}
              type="button"
              onClick={() => {
                setSlot(s.slot);
                setPreview(null);
              }}
              className={cn("inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3.5 text-caption font-semibold", slot === s.slot ? "border-fg bg-fg text-bg" : "border-line-strong text-fg-muted")}
            >
              <span aria-hidden>{s.emoji}</span> {s.label}
            </button>
          ))}
        </div>
        <div className="mb-3 flex gap-3 text-caption">
          {(["all", "buyable", "owned"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={cn("font-medium", filter === f ? "text-fg underline underline-offset-4" : "text-fg-subtle")}>
              {{ all: "전체", buyable: "살 수 있는", owned: "가진 것" }[f]}
            </button>
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => {
            const has = item.price === 0 || ownedSet.has(item.id);
            const active = preview?.id === item.id;
            return (
              <li key={item.id} className={cn("space-card flex flex-col overflow-hidden transition-shadow", active && "ring-2 ring-primary")}>
                <button type="button" onClick={() => setPreview(active ? null : item)} className="relative aspect-square bg-surface-muted" aria-label={`${item.name} 입어보기`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- 아이템을 입은 내 미니미 */}
                  <img src={minimiUrl({ ...avatar, [item.slot]: item.index })} alt="" loading="lazy" className="size-full translate-y-[4%]" />
                  <Badge tone={rarityTone[item.rarity]} className="absolute top-2 left-2">
                    {rarityLabel[item.rarity]}
                  </Badge>
                </button>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <p className="truncate text-caption font-semibold">{item.name}</p>
                  {has ? (
                    <span className="mt-auto inline-flex h-8 items-center justify-center gap-1 rounded-sm bg-success-soft text-caption font-semibold text-success">
                      <Check className="size-4" /> {item.price === 0 ? "기본" : "보유 중"}
                    </span>
                  ) : (
                    <Button size="sm" className="mt-auto" disabled={pending || balance < item.price} onClick={() => buy(item)}>
                      {c.emoji} {item.price}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
