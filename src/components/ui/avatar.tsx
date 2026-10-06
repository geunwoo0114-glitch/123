import { cn } from "@/lib/cn";
import { mediaUrl } from "@/lib/media/url";
import { Minimi, minimiBg } from "@/features/avatar/minimi";
import type { AvatarConfig } from "@/features/avatar/schema";

const sizes = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
  xl: "size-20",
  "2xl": "size-28",
} as const;

export type AvatarSize = keyof typeof sizes;

/**
 * 사진 → 미니미 → 이니셜 순으로 표시한다.
 * 사진이 없는 사용자도 미니미로 '사람'이 먼저 보이게 하는 것이 목적.
 */
export function Avatar({
  name,
  avatarKey,
  minimi,
  size = "md",
  className,
  ring,
}: {
  name: string;
  avatarKey?: string | null;
  minimi?: AvatarConfig | null;
  size?: AvatarSize;
  className?: string;
  ring?: boolean;
}) {
  const src = mediaUrl(avatarKey);
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-accent select-none",
        ring && "ring-2 ring-surface",
        sizes[size],
        className,
      )}
      style={!src && minimi ? { backgroundColor: minimiBg(minimi) } : undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- 업로드 시 이미 리사이즈/webp 변환됨
        <img src={src} alt={`${name}의 프로필 사진`} className="size-full object-cover" loading="lazy" decoding="async" />
      ) : minimi ? (
        <Minimi config={minimi} title={`${name}의 미니미`} className="size-full translate-y-[4%] scale-[1.08]" />
      ) : (
        <span className="font-bold" aria-label={name}>
          {name.slice(0, 1)}
        </span>
      )}
    </span>
  );
}

export function AvatarStack({ users, max = 4, size = "sm" }: { users: { id: string; displayName: string; avatarKey: string | null; minimi: AvatarConfig | null }[]; max?: number; size?: AvatarSize }) {
  const shown = users.slice(0, max);
  return (
    <span className="flex -space-x-2">
      {shown.map((u) => (
        <Avatar key={u.id} name={u.displayName} avatarKey={u.avatarKey} minimi={u.minimi} size={size} ring />
      ))}
      {users.length > max && (
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-surface-muted text-label font-semibold text-fg-muted ring-2 ring-surface">
          +{users.length - max}
        </span>
      )}
    </span>
  );
}
