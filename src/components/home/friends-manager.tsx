"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import type { UserCard } from "@/features/users/card";
import { removeFriendship, respondFriendRequest, toggleCloseFriend } from "@/features/relationships/actions";
import { relativeTime } from "@/lib/dates";
import { UserLink } from "@/components/user/user-link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

type Req = UserCard & { message: string | null; label: string | null; createdAt: string };

function useRun() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      toast(res.ok ? (res.message ?? "완료했어요.") : (res.error ?? "문제가 생겼어요."), res.ok ? "success" : "error");
      router.refresh();
    });
  return { pending, run };
}

function RequestRow({ r, outgoing }: { r: Req; outgoing?: boolean }) {
  const { pending, run } = useRun();
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <UserLink user={r} meta={relativeTime(r.createdAt)} />
        {r.message && <p className="mt-1.5 ml-12 rounded-md bg-surface-muted px-3 py-1.5 text-caption">&ldquo;{r.message}&rdquo;</p>}
        {r.label && <p className="mt-1 ml-12 text-label text-fg-subtle">나를 &lsquo;{r.label}&rsquo;(이)라고 불러요</p>}
      </div>
      <div className="flex shrink-0 gap-2 self-end sm:self-auto">
        {outgoing ? (
          <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => removeFriendship({ targetId: r.id }))}>
            취소
          </Button>
        ) : (
          <>
            <Button size="sm" loading={pending} onClick={() => run(() => respondFriendRequest({ targetId: r.id, accept: true }))}>
              수락
            </Button>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => respondFriendRequest({ targetId: r.id, accept: false }))}>
              거절
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

export function RequestList({ requests, outgoing }: { requests: Req[]; outgoing?: boolean }) {
  return (
    <ul className="space-card divide-y divide-line">
      {requests.map((r) => (
        <RequestRow key={r.id} r={r} outgoing={outgoing} />
      ))}
    </ul>
  );
}

type Friend = UserCard & { label: string | null; isClose: boolean; since: string | null };

function FriendRow({ f }: { f: Friend }) {
  const { pending, run } = useRun();
  return (
    <li className="flex items-center justify-between gap-2 px-4 py-3">
      <UserLink user={f} showStatus meta={f.label ? `우리 사이: ${f.label}` : undefined} />
      <button
        type="button"
        disabled={pending}
        aria-pressed={f.isClose}
        aria-label={f.isClose ? `${f.displayName} 친한 친구 해제` : `${f.displayName} 친한 친구로 지정`}
        onClick={() => run(() => toggleCloseFriend({ targetId: f.id, close: !f.isClose }))}
        className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-muted"
      >
        <Star className={cn("size-5", f.isClose ? "fill-warning text-warning" : "text-fg-subtle")} />
      </button>
    </li>
  );
}

export function FriendsManager({ friends }: { friends: Friend[] }) {
  return (
    <ul className="space-card divide-y divide-line">
      {friends.map((f) => (
        <FriendRow key={f.id} f={f} />
      ))}
    </ul>
  );
}
