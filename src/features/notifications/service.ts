import "server-only";
import type { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { sendPush } from "@/features/push/service";
import { publish } from "@/lib/realtime/hub";

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

    try {
      await db.notification.create({
        data: {
          recipientId: input.recipientId,
          actorId: input.actorId,
          type: input.type,
          targetId: input.targetId,
          preview: input.preview?.slice(0, 120),
          dedupeKey: input.dedupeKey,
        },
      });
    } catch (e) {
      // 같은 행동의 반복(좋아요 취소 후 다시 누르기 등)은 알리지 않는다
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return;
      throw e;
    }
    // 새 알림일 때만: 열려 있는 화면의 배지 갱신 + 기기 푸시 (응답을 막지 않도록 기다리지 않는다)
    void publish(input.recipientId, { type: "notification" });
    void pushFor(input);
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

const pushText: Record<NotificationType, string> = {
  FRIEND_REQUEST: "님이 친구 신청을 보냈어요",
  FRIEND_ACCEPT: "님과 친구가 되었어요",
  FOLLOW: "님이 내 소식을 받아보기 시작했어요",
  POST_LIKE: "님이 내 소식을 좋아해요",
  POST_COMMENT: "님이 댓글을 남겼어요",
  COMMENT_REPLY: "님이 답글을 남겼어요",
  GUESTBOOK: "님이 방명록에 흔적을 남겼어요",
  GUESTBOOK_REPLY: "님이 방명록에 답글을 달았어요",
  GIFT: "님이 선물을 보냈어요 🎁",
};

async function pushFor(input: NotifyInput) {
  const [actor, recipient] = await Promise.all([
    db.user.findUnique({ where: { id: input.actorId }, select: { profile: { select: { displayName: true } } } }),
    db.user.findUnique({ where: { id: input.recipientId }, select: { username: true } }),
  ]);
  const name = actor?.profile?.displayName ?? "누군가";
  const url =
    input.type === "FRIEND_REQUEST"
      ? "/friends"
      : input.type === "GUESTBOOK"
        ? `/@${recipient?.username}/guestbook`
        : input.type === "GIFT"
          ? "/town/closet"
          : input.targetId && (input.type === "POST_LIKE" || input.type === "POST_COMMENT" || input.type === "COMMENT_REPLY")
            ? `/p/${input.targetId}`
            : "/notifications";
  await sendPush(input.recipientId, { title: `${name}${pushText[input.type]}`, body: input.preview ?? "", url, tag: input.type });
}
