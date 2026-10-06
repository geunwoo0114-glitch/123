import "server-only";
import { db } from "@/lib/db";
import { appConfig } from "@/config/app";
import { userCardSelect, toUserCard, type UserCard } from "@/features/users/card";

export type NotificationDTO = {
  id: string;
  type: string;
  actor: UserCard;
  targetId: string | null;
  preview: string | null;
  read: boolean;
  createdAt: string;
};

export async function listNotifications(userId: string, cursor?: string | null, take: number = appConfig.pageSize.notifications) {
  const rows = await db.notification.findMany({
    where: { recipientId: userId, actor: { status: "ACTIVE" } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, type: true, targetId: true, preview: true, readAt: true, createdAt: true, actor: { select: userCardSelect } },
  });
  const items: NotificationDTO[] = rows.slice(0, take).map((n) => ({
    id: n.id,
    type: n.type,
    actor: toUserCard(n.actor),
    targetId: n.targetId,
    preview: n.preview,
    read: !!n.readAt,
    createdAt: n.createdAt.toISOString(),
  }));
  return { items, nextCursor: rows.length > take ? items[items.length - 1].id : null };
}
