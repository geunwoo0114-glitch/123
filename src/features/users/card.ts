import type { Prisma } from "@prisma/client";
import { parseAvatar, type AvatarConfig } from "@/features/avatar/schema";

/** 사용자 카드/아바타 표시에 필요한 최소 필드 (민감 정보 제외) */
export const userCardSelect = {
  id: true,
  username: true,
  status: true,
  profile: {
    select: {
      displayName: true,
      statusMessage: true,
      statusEmoji: true,
      interests: true,
      avatar: true,
      avatarMedia: { select: { thumbKey: true, dominant: true } },
    },
  },
  space: { select: { themeId: true } },
} satisfies Prisma.UserSelect;

type UserCardRow = Prisma.UserGetPayload<{ select: typeof userCardSelect }>;

export type UserCard = {
  id: string;
  username: string;
  status: string;
  displayName: string;
  statusMessage: string;
  statusEmoji: string;
  avatarKey: string | null;
  themeId: string;
  interests: string[];
  minimi: AvatarConfig | null;
};

export function toUserCard(u: UserCardRow): UserCard {
  return {
    id: u.id,
    username: u.username,
    status: u.status,
    displayName: u.profile?.displayName ?? u.username,
    statusMessage: u.profile?.statusMessage ?? "",
    statusEmoji: u.profile?.statusEmoji ?? "",
    avatarKey: u.profile?.avatarMedia?.thumbKey ?? null,
    themeId: u.space?.themeId ?? "lavender",
    interests: u.profile?.interests ?? [],
    minimi: parseAvatar(u.profile?.avatar),
  };
}
