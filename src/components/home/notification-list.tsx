"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Heart, MessageCircle, UserPlus, UserCheck, MessageSquareHeart, CornerDownRight, Rss, Gift } from "lucide-react";
import type { NotificationDTO } from "@/features/notifications/queries";
import { markAllNotificationsRead } from "@/features/notifications/actions";
import { loadNotificationsPage } from "@/features/feed/actions";
import { relativeTime } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/misc";
import { useInfinite } from "@/components/content/infinite";

const config: Record<string, { icon: typeof Bell; text: string; color: string }> = {
  FRIEND_REQUEST: { icon: UserPlus, text: "님이 친구 신청을 보냈어요", color: "text-primary" },
  FRIEND_ACCEPT: { icon: UserCheck, text: "님과 친구가 되었어요", color: "text-success" },
  FOLLOW: { icon: Rss, text: "님이 내 소식을 받아보기 시작했어요", color: "text-fg-muted" },
  POST_LIKE: { icon: Heart, text: "님이 내 소식을 좋아해요", color: "text-[#e0475f]" },
  POST_COMMENT: { icon: MessageCircle, text: "님이 댓글을 남겼어요", color: "text-primary" },
  COMMENT_REPLY: { icon: CornerDownRight, text: "님이 내 댓글에 답글을 남겼어요", color: "text-primary" },
  GUESTBOOK: { icon: MessageSquareHeart, text: "님이 내 방명록에 흔적을 남겼어요", color: "text-accent" },
  GUESTBOOK_REPLY: { icon: MessageSquareHeart, text: "님이 방명록에 답글을 달았어요", color: "text-accent" },
  GIFT: { icon: Gift, text: "님이 미니미 아이템을 선물했어요 🎁", color: "text-primary" },
};

function hrefFor(n: NotificationDTO, myUsername: string) {
  switch (n.type) {
    case "FRIEND_REQUEST":
      return "/friends";
    case "FRIEND_ACCEPT":
    case "FOLLOW":
      return `/@${n.actor.username}`;
    case "GUESTBOOK":
      return `/@${myUsername}/guestbook`;
    case "GIFT":
      return "/town/closet";
    case "GUESTBOOK_REPLY":
      return `/@${n.actor.username}/guestbook`;
    default:
      return n.targetId ? `/p/${n.targetId}` : "/";
  }
}

export function NotificationList({ initial, nextCursor, username }: { initial: NotificationDTO[]; nextCursor: string | null; username: string }) {
  const { items, footer } = useInfinite(initial, nextCursor, loadNotificationsPage);
  const router = useRouter();
  const hasUnread = initial.some((n) => !n.read);

  // 알림 화면을 열면 읽음 처리 (표시는 이번 화면에서는 '새 알림'으로 유지)
  useEffect(() => {
    if (hasUnread) void markAllNotificationsRead().then(() => router.refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 최초 1회
  }, []);

  if (items.length === 0) {
    return (
      <div className="space-card">
        <EmptyState icon={<Bell />} title="아직 알림이 없어요" description="친구의 공간에 놀러 가서 방명록을 남겨 보세요. 답장이 오면 여기서 알려드릴게요." />
      </div>
    );
  }
  return (
    <>
      <ul className="space-card divide-y divide-line overflow-hidden">
        {items.map((n) => {
          const c = config[n.type] ?? { icon: Bell, text: "", color: "" };
          return (
            <li key={n.id}>
              <Link href={hrefFor(n, username)} className={cn("flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted", !n.read && "bg-primary-soft/50")}>
                <span className="relative shrink-0">
                  <Avatar name={n.actor.displayName} avatarKey={n.actor.avatarKey} minimi={n.actor.minimi} size="md" />
                  <span className={cn("absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-surface shadow-1", c.color)}>
                    <c.icon className="size-3" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body">
                    <b>{n.actor.displayName}</b>
                    {c.text}
                  </span>
                  {n.preview && <span className="block truncate text-caption text-fg-muted">{n.preview}</span>}
                  <span className="block text-label text-fg-subtle">{relativeTime(n.createdAt)}</span>
                </span>
                {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="새 알림" />}
              </Link>
            </li>
          );
        })}
      </ul>
      {footer}
    </>
  );
}
