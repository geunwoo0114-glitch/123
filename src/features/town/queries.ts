import "server-only";
import { db } from "@/lib/db";
import { defaultAvatar, parseAvatar } from "@/features/avatar/schema";
import { parseRoom } from "@/features/room/schema";
import { ownedItemIds } from "./service";
import { listFriends } from "@/features/relationships/queries";
import { userCardSelect, toUserCard } from "@/features/users/card";
import { itemById } from "./catalog";

export async function getClosetState(userId: string) {
  const [profile, owned, user, space] = await Promise.all([
    db.profile.findUnique({ where: { userId }, select: { avatar: true, displayName: true } }),
    ownedItemIds(userId),
    db.user.findUnique({ where: { id: userId }, select: { coins: true } }),
    db.spaceSettings.findUnique({ where: { userId }, select: { room: true, themeId: true } }),
  ]);
  return {
    avatar: parseAvatar(profile?.avatar) ?? defaultAvatar,
    displayName: profile?.displayName ?? "",
    owned: [...owned],
    coins: user?.coins ?? 0,
    room: parseRoom(space?.room),
    themeId: space?.themeId ?? "lavender",
  };
}

/** 옷장 상단에 보여줄 최근 받은 선물 */
export async function recentGifts(userId: string, take = 5) {
  const rows = await db.gift.findMany({
    where: { recipientId: userId, sender: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, itemId: true, message: true, createdAt: true, sender: { select: userCardSelect } },
  });
  return rows.map((g) => ({ id: g.id, itemName: itemById(g.itemId)?.name ?? g.itemId, message: g.message, createdAt: g.createdAt.toISOString(), sender: toUserCard(g.sender) }));
}

/** 선물 받을 수 있는 친구 목록 (이름/미니미만) */
export async function giftableFriends(userId: string) {
  const friends = await listFriends(userId, { take: 200 });
  return friends.map((f) => ({ id: f.id, displayName: f.displayName, username: f.username, avatarKey: f.avatarKey, minimi: f.minimi, label: f.label }));
}
