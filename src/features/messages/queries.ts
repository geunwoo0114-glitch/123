import "server-only";
import { db } from "@/lib/db";
import { userCardSelect, toUserCard, type UserCard } from "@/features/users/card";
import { orderPair } from "@/features/relationships/queries";

export type ConversationItem = {
  id: string;
  other: UserCard;
  lastPreview: string;
  lastMessageAt: string;
  unread: boolean;
  lastFromMe: boolean;
};

export type MessageDTO = { id: string; body: string; createdAt: string; mine: boolean };

/** 내 쪽지함 (최근 대화 순). '나가기' 이후 새 쪽지가 없는 대화는 숨긴다. */
export async function listConversations(meId: string, take = 50): Promise<ConversationItem[]> {
  const rows = await db.conversation.findMany({
    where: { OR: [{ userAId: meId }, { userBId: meId }], lastSenderId: { not: null } },
    orderBy: { lastMessageAt: "desc" },
    take,
    include: { userA: { select: userCardSelect }, userB: { select: userCardSelect } },
  });
  return rows
    .map((c) => {
      const iAmA = c.userAId === meId;
      const other = iAmA ? c.userB : c.userA;
      const readAt = iAmA ? c.aReadAt : c.bReadAt;
      const clearedAt = iAmA ? c.aClearedAt : c.bClearedAt;
      if (clearedAt && c.lastMessageAt <= clearedAt) return null;
      return {
        id: c.id,
        other: toUserCard(other),
        lastPreview: c.lastPreview,
        lastMessageAt: c.lastMessageAt.toISOString(),
        unread: c.lastSenderId !== meId && (!readAt || readAt < c.lastMessageAt),
        lastFromMe: c.lastSenderId === meId,
      };
    })
    .filter((c): c is ConversationItem => c !== null && c.other.status === "ACTIVE");
}

/** 안 읽은 쪽지가 있는 대화 수 (내비게이션 배지) */
export async function countUnreadConversations(meId: string): Promise<number> {
  const rows = await db.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM "Conversation"
    WHERE "lastSenderId" IS NOT NULL AND "lastSenderId" <> ${meId}
      AND (
        ("userAId" = ${meId} AND ("aReadAt" IS NULL OR "aReadAt" < "lastMessageAt") AND ("aClearedAt" IS NULL OR "aClearedAt" < "lastMessageAt"))
        OR
        ("userBId" = ${meId} AND ("bReadAt" IS NULL OR "bReadAt" < "lastMessageAt") AND ("bClearedAt" IS NULL OR "bClearedAt" < "lastMessageAt"))
      )`;
  return Number(rows[0]?.n ?? 0);
}

export async function findConversation(meId: string, otherId: string) {
  const [userAId, userBId] = orderPair(meId, otherId);
  return db.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
}

/**
 * 대화 메시지 (최신 → 과거 커서 페이지). 내가 '나가기'한 시점 이전은 보이지 않는다.
 * @param after 지정하면 그 시각 이후의 새 메시지만 (폴링용)
 */
export async function listMessages(meId: string, otherId: string, opts: { before?: string | null; after?: string | null; take?: number } = {}) {
  const conv = await findConversation(meId, otherId);
  if (!conv) return { conversationId: null, items: [] as MessageDTO[], nextCursor: null as string | null };
  const iAmA = conv.userAId === meId;
  const clearedAt = iAmA ? conv.aClearedAt : conv.bClearedAt;
  const take = opts.take ?? 40;
  const createdAt: { gt?: Date; lt?: Date } = {};
  if (clearedAt) createdAt.gt = clearedAt;
  if (opts.after) {
    const after = new Date(opts.after);
    if (!createdAt.gt || after > createdAt.gt) createdAt.gt = after;
  }
  if (opts.before) createdAt.lt = new Date(opts.before);

  const rows = await db.message.findMany({
    where: { conversationId: conv.id, createdAt },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    select: { id: true, body: true, createdAt: true, senderId: true },
  });
  const items = rows.slice(0, take).map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt.toISOString(), mine: m.senderId === meId }));
  return {
    conversationId: conv.id,
    items: items.reverse(),
    nextCursor: !opts.after && rows.length > take ? items[0].createdAt : null,
  };
}
