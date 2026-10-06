import "server-only";
import { db } from "@/lib/db";
import { defaultAvatar, parseAvatar } from "@/features/avatar/schema";
import { ownedItemIds } from "./service";

export async function getClosetState(userId: string) {
  const [profile, owned, user] = await Promise.all([
    db.profile.findUnique({ where: { userId }, select: { avatar: true, displayName: true } }),
    ownedItemIds(userId),
    db.user.findUnique({ where: { id: userId }, select: { coins: true } }),
  ]);
  return {
    avatar: parseAvatar(profile?.avatar) ?? defaultAvatar,
    displayName: profile?.displayName ?? "",
    owned: [...owned],
    coins: user?.coins ?? 0,
  };
}
