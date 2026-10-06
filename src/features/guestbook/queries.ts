import "server-only";
import { db } from "@/lib/db";
import { userCardSelect, toUserCard, type UserCard } from "@/features/users/card";
import { canDeleteGuestbookEntry, canReadGuestbookEntry } from "@/features/privacy/policy";
import { getBlockedIds } from "@/features/relationships/queries";
import { appConfig } from "@/config/app";

export type GuestbookEntryDTO = {
  id: string;
  /** 비밀글을 볼 권한이 없으면 내용/작성자를 숨긴다 */
  hidden: boolean;
  body: string;
  isSecret: boolean;
  sticker: string | null;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  author: UserCard | null;
  canDelete: boolean;
  canReply: boolean;
};

export async function listGuestbook(hostId: string, viewerId: string | null, cursor?: string | null, take: number = appConfig.pageSize.guestbook) {
  const blocked = viewerId ? await getBlockedIds(viewerId) : [];
  const rows = await db.guestbookEntry.findMany({
    where: { hostId, deletedAt: null, authorId: { notIn: blocked }, author: { status: "ACTIVE" } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { author: { select: userCardSelect } },
  });
  const items: GuestbookEntryDTO[] = rows.slice(0, take).map((e) => {
    const readable = canReadGuestbookEntry(viewerId, e);
    return {
      id: e.id,
      hidden: !readable,
      body: readable ? e.body : "",
      isSecret: e.isSecret,
      sticker: e.sticker,
      reply: readable ? e.reply : null,
      repliedAt: readable ? (e.repliedAt?.toISOString() ?? null) : null,
      createdAt: e.createdAt.toISOString(),
      author: readable ? toUserCard(e.author) : null,
      canDelete: canDeleteGuestbookEntry(viewerId, e),
      canReply: viewerId === hostId,
    };
  });
  return { items, nextCursor: rows.length > take ? items[items.length - 1].id : null };
}

export async function countGuestbook(hostId: string) {
  return db.guestbookEntry.count({ where: { hostId, deletedAt: null } });
}
