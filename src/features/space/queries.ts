import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { parseAvatar, type AvatarConfig } from "@/features/avatar/schema";
import { canSendMessage, canViewSpace, canWriteGuestbook, type Relation } from "@/features/privacy/policy";
import { countFriends, getFriendLabel, getRelation } from "@/features/relationships/queries";
import { mediaSelect, type MediaDTO } from "@/features/media/service";
import { normalizeWidgets, type WidgetSetting } from "./themes";
import { parseRoom, type RoomConfig } from "@/features/room/schema";
import { parseHouse, type HouseConfig } from "@/features/house/schema";
import { parseMusicUrl, type MusicEmbed } from "./music";

export type SpaceDTO = {
  owner: {
    id: string;
    username: string;
    displayName: string;
    bio: string;
    statusMessage: string;
    statusEmoji: string;
    interests: string[];
    avatarKey: string | null;
    cover: MediaDTO | null;
    minimi: AvatarConfig | null;
    joinedAt: string;
  };
  theme: { themeId: string; backgroundId: string; layoutVariant: string; cardStyle: string; widgets: WidgetSetting[] };
  room: RoomConfig;
  house: HouseConfig;
  music: { embed: MusicEmbed; title: string | null; artist: string | null } | null;
  pinnedPostId: string | null;
  relation: Relation;
  /** viewer가 owner를 부르는 이름(일촌명) */
  friendLabel: string | null;
  canView: boolean;
  canWriteGuestbook: boolean;
  canMessage: boolean;
  guestbookPolicy: string;
  showVisitorsPublic: boolean;
  counts: { friends: number; followers: number; following: number };
};

/** username으로 공간 조회. 요청 단위 캐시로 layout/page/metadata에서 재사용한다. */
export const getSpace = cache(async (username: string, viewerId: string | null): Promise<SpaceDTO | null> => {
  const user = await db.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      username: true,
      status: true,
      createdAt: true,
      profile: {
        select: {
          displayName: true,
          bio: true,
          statusMessage: true,
          statusEmoji: true,
          interests: true,
          avatar: true,
          avatarMedia: { select: { thumbKey: true } },
          coverMedia: { select: mediaSelect },
        },
      },
      space: true,
      settings: { select: { spaceVisibility: true, guestbookPolicy: true, showVisitorsPublic: true, messagePolicy: true } },
    },
  });
  if (!user || user.status !== "ACTIVE" || !user.profile) return null;

  const relation = await getRelation(viewerId, user.id);
  // 차단한/차단당한 관계에서는 공간 존재 자체를 숨긴다
  if (relation.state === "BLOCKED_BY") return null;

  const [friends, followers, following, friendLabel] = await Promise.all([
    countFriends(user.id),
    db.follow.count({ where: { followingId: user.id } }),
    db.follow.count({ where: { followerId: user.id } }),
    viewerId && relation.state === "FRIENDS" ? getFriendLabel(viewerId, user.id) : Promise.resolve(null),
  ]);

  const space = user.space;
  const embed = parseMusicUrl(space?.musicUrl);
  const p = user.profile;
  const spaceVisibility = user.settings?.spaceVisibility ?? "PUBLIC";
  return {
    owner: {
      id: user.id,
      username: user.username,
      displayName: p.displayName,
      bio: p.bio,
      statusMessage: p.statusMessage,
      statusEmoji: p.statusEmoji,
      interests: p.interests,
      avatarKey: p.avatarMedia?.thumbKey ?? null,
      cover: p.coverMedia ?? null,
      minimi: parseAvatar(p.avatar),
      joinedAt: user.createdAt.toISOString(),
    },
    theme: {
      themeId: space?.themeId ?? "peach",
      backgroundId: space?.backgroundId ?? "paper",
      layoutVariant: space?.layoutVariant ?? "classic",
      cardStyle: space?.cardStyle ?? "soft",
      widgets: normalizeWidgets(space?.widgets),
    },
    room: parseRoom(space?.room),
    house: parseHouse(space?.house),
    music: embed ? { embed, title: space?.musicTitle ?? null, artist: space?.musicArtist ?? null } : null,
    pinnedPostId: space?.pinnedPostId ?? null,
    relation,
    friendLabel,
    canView: canViewSpace(relation, spaceVisibility),
    canWriteGuestbook: canWriteGuestbook(relation, user.settings?.guestbookPolicy ?? "EVERYONE"),
    canMessage: canSendMessage(relation, user.settings?.messagePolicy ?? "FRIENDS"),
    guestbookPolicy: user.settings?.guestbookPolicy ?? "EVERYONE",
    showVisitorsPublic: user.settings?.showVisitorsPublic ?? false,
    counts: { friends, followers, following },
  };
});
