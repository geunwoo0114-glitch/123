import Link from "next/link";
import { Avatar, type AvatarSize } from "@/components/ui/avatar";
import type { UserCard } from "@/features/users/card";
import { cn } from "@/lib/cn";

export function spaceHref(username: string, sub?: string) {
  return `/@${username}${sub ? `/${sub}` : ""}`;
}

/** 아바타 + 이름 (+상태) — 누르면 그 사람의 공간으로 '놀러 간다' */
export function UserLink({
  user,
  size = "md",
  showStatus,
  meta,
  className,
}: {
  user: Pick<UserCard, "username" | "displayName" | "avatarKey" | "minimi" | "statusMessage" | "statusEmoji">;
  size?: AvatarSize;
  showStatus?: boolean;
  meta?: React.ReactNode;
  className?: string;
}) {
  const href = spaceHref(user.username);
  // meta 안에 다른 링크(예: 게시 시각 → 게시물)가 올 수 있어 앵커를 중첩하지 않도록 분리한다
  return (
    <div className={cn("group flex min-w-0 items-center gap-2.5", className)}>
      <Link href={href} tabIndex={-1} aria-hidden className="shrink-0">
        <Avatar name={user.displayName} avatarKey={user.avatarKey} minimi={user.minimi} size={size} />
      </Link>
      <span className="min-w-0 leading-tight">
        <Link href={href} className="flex items-baseline gap-1.5">
          <span className="truncate font-semibold text-fg hover:underline">{user.displayName}</span>
          <span className="truncate text-caption text-fg-subtle">@{user.username}</span>
        </Link>
        {showStatus && user.statusMessage ? (
          <span className="block truncate text-caption text-fg-muted">
            {user.statusEmoji} {user.statusMessage}
          </span>
        ) : meta ? (
          <span className="block truncate text-caption text-fg-subtle">{meta}</span>
        ) : null}
      </span>
    </div>
  );
}
