"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shuffle } from "lucide-react";
import { roomItemNames, roomSlots, type RoomConfig, type RoomSlot } from "@/features/room/schema";
import type { AvatarConfig } from "@/features/avatar/schema";
import { isFreeRoomItem } from "@/features/town/catalog";
import { saveRoom } from "@/features/town/actions";
import { themeStyle } from "@/features/space/themes";
import { cn } from "@/lib/cn";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { MiniRoom } from "@/components/space/mini-room";

/** 미니룸 꾸미기: 자리마다 가진 아이템을 골라 끼운다 */
export function RoomEditor({ initial, owned, minimi, name, themeId, username }: { initial: RoomConfig; owned: string[]; minimi: AvatarConfig; name: string; themeId: string; username: string }) {
  const [room, setRoom] = useState(initial);
  const [slot, setSlot] = useState<RoomSlot>("wall");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const ownedSet = useMemo(() => new Set(owned), [owned]);
  const has = (s: RoomSlot, i: number) => isFreeRoomItem(s, i) || ownedSet.has(`room.${s}:${i}`);
  const dirty = JSON.stringify(room) !== JSON.stringify(initial);
  const count = roomSlots.find((s) => s.slot === slot)!.count;

  function randomize() {
    const next = { ...room };
    for (const { slot: s, count: n } of roomSlots) {
      const mine = Array.from({ length: n }, (_, i) => i).filter((i) => has(s, i));
      next[s] = mine[Math.floor(Math.random() * mine.length)];
    }
    setRoom(next);
  }

  return (
    <div style={themeStyle(themeId) as React.CSSProperties} className="space-scope flex flex-col gap-5">
      <div className="space-card mx-auto w-full max-w-3xl overflow-hidden">
        <MiniRoom room={room} minimi={minimi} name={name} />
        <div className="flex flex-wrap items-center justify-between gap-2 p-3">
          <p className="text-caption text-fg-muted">잠긴 아이템은 상점의 &lsquo;미니룸&rsquo;에서 살 수 있어요.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={randomize} icon={<Shuffle className="size-4" />}>
              랜덤
            </Button>
            <Button
              disabled={!dirty}
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await saveRoom(room);
                  toast(res.ok ? (res.message ?? "저장했어요.") : res.error, res.ok ? "success" : "error");
                  if (res.ok) router.refresh();
                })
              }
            >
              이대로 꾸미기
            </Button>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="방의 자리" className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4">
        {roomSlots.map((s) => (
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

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: count }, (_, i) => {
          const mine = has(slot, i);
          const selected = room[slot] === i;
          return (
            <li key={i}>
              <button
                type="button"
                disabled={!mine}
                aria-pressed={selected}
                aria-label={`${roomItemNames[slot][i]}${mine ? "" : " (상점에서 구매 필요)"}`}
                onClick={() => setRoom((r) => ({ ...r, [slot]: i }))}
                className={cn("space-card relative w-full overflow-hidden text-left transition-all", selected && "ring-2 ring-primary", !mine && "opacity-50")}
              >
                <MiniRoom room={{ ...room, [slot]: i }} minimi={null} name={roomItemNames[slot][i]} />
                <span className="flex items-center justify-between px-3 py-2 text-caption font-semibold">
                  {roomItemNames[slot][i]}
                  {!mine && <Lock className="size-4 text-fg-muted" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-center gap-2">
        <ButtonLink href="/town/shop?tab=room" variant="secondary">
          미니룸 아이템 사러 가기
        </ButtonLink>
        <ButtonLink href={`/@${username}`} variant="ghost">
          내 공간에서 보기
        </ButtonLink>
      </div>
    </div>
  );
}
