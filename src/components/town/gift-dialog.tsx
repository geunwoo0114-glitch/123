"use client";

import { useState, useTransition } from "react";
import { Gift } from "lucide-react";
import type { ShopItem } from "@/features/town/catalog";
import type { AvatarConfig } from "@/features/avatar/schema";
import { giftItem } from "@/features/town/actions";
import { brand } from "@/config/brand";
import { josa } from "@/lib/josa";
import { cn } from "@/lib/cn";
import { Dialog } from "@/components/ui/dialog";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";

export type GiftFriend = { id: string; displayName: string; username: string; avatarKey: string | null; minimi: AvatarConfig | null; label: string | null };

export function GiftDialog({ item, friends, balance, onClose, onSent }: { item: ShopItem; friends: GiftFriend[]; balance: number; onClose: () => void; onSent: (coins: number) => void }) {
  const [to, setTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const c = brand.currency;
  const enough = balance >= item.price;
  return (
    <Dialog
      open
      onClose={onClose}
      title={`${item.name} 선물하기`}
      description={`${c.emoji} ${item.price}개가 들어요. 친구의 옷장에 바로 들어가요.`}
      size="sm"
      footer={
        friends.length > 0 ? (
          <Button
            icon={<Gift className="size-4" />}
            disabled={!to || !enough}
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await giftItem({ itemId: item.id, toUserId: to!, message });
                if (res.ok) {
                  toast(res.message ?? "선물했어요!");
                  if (res.data) onSent(res.data.coins);
                  onClose();
                } else toast(res.error, "error");
              })
            }
          >
            {enough ? "선물 보내기" : `${josa(c.name, "이", "가")} 부족해요`}
          </Button>
        ) : undefined
      }
    >
      {friends.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-caption text-fg-muted">선물은 친구에게만 보낼 수 있어요.</p>
          <ButtonLink href="/explore" size="sm">
            친구 찾기
          </ButtonLink>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ul role="radiogroup" aria-label="받을 친구" className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {friends.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={to === f.id}
                  onClick={() => setTo(f.id)}
                  className={cn("flex w-full flex-col items-center gap-1 rounded-md p-2 transition-colors", to === f.id ? "bg-primary-soft ring-2 ring-primary" : "hover:bg-surface-muted")}
                >
                  <Avatar name={f.displayName} avatarKey={f.avatarKey} minimi={f.minimi} size="lg" />
                  <span className="w-full truncate text-label font-medium">{f.displayName}</span>
                  {f.label && <span className="-mt-1 w-full truncate text-[11px] text-accent">{f.label}</span>}
                </button>
              </li>
            ))}
          </ul>
          <Input label="한마디 (선택)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={80} placeholder="생일 축하해! 🎂" />
        </div>
      )}
    </Dialog>
  );
}
