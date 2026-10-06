import "server-only";
import type { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

type NotifyInput = {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  targetId?: string;
  preview?: string;
  /** 같은 행동 반복(좋아요 취소 후 재클릭 등)을 한 번만 알리기 위한 키 */
  dedupeKey: string;
};

const settingByType: Partial<Record<NotificationType, "notifyLikes" | "notifyComments" | "notifyGuestbook" | "notifyFollows">> = {
  POST_LIKE: "notifyLikes",
  POST_COMMENT: "notifyComments",
  COMMENT_REPLY: "notifyComments",
  GUESTBOOK: "notifyGuestbook",
  GUESTBOOK_REPLY: "notifyGuestbook",
  FOLLOW: "notifyFollows",
};

/**
 * 의미 있는 알림만 보낸다: 자기 자신/차단 관계/수신 거부/중복은 건너뛴다.
 * 알림 실패가 본 동작을 실패시키지 않도록 예외를 삼킨다(로그는 남김).
 */
export async function notify(input: NotifyInput): Promise<void> {
  if (input.recipientId === input.actorId) return;
  try {
    const [blocked, settings] = await Promise.all([
      db.block.findFirst({
        where: {
          OR: [
            { blockerId: input.recipientId, blockedId: input.actorId },
            { blockerId: input.actorId, blockedId: input.recipientId },
          ],
        },
        select: { blockerId: true },
      }),
      db.userSettings.findUnique({ where: { userId: input.recipientId } }),
    ]);
    if (blocked) return;
    const key = settingByType[input.type];
    if (key && settings && settings[key] === false) return;

    await db.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      create: {
        recipientId: input.recipientId,
        actorId: input.actorId,
        type: input.type,
        targetId: input.targetId,
        preview: input.preview?.slice(0, 120),
        dedupeKey: input.dedupeKey,
      },
      update: {},
    });
  } catch (err) {
    logger.warn("notify failed", { err, type: input.type });
  }
}

/** 원인 행동이 취소되었을 때(친구 요청 취소 등) 알림 제거 */
export async function retractNotification(dedupeKey: string) {
  await db.notification.deleteMany({ where: { dedupeKey } });
}

export async function countUnread(userId: string) {
  return db.notification.count({ where: { recipientId: userId, readAt: null } });
}
