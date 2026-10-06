"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { checkLimit } from "@/lib/rate-limit";
import { fail, fromZodError, messages as msg, ok, type ActionResult } from "@/lib/action";
import { canSendMessage } from "@/features/privacy/policy";
import { getRelation, orderPair } from "@/features/relationships/queries";
import { listMessages, type MessageDTO } from "./queries";
import { appConfig } from "@/config/app";
import { sendPush } from "@/features/push/service";
import { publish } from "@/lib/realtime/hub";

const MESSAGE_MAX = appConfig.limits.message;

const sendSchema = z.object({
  toUserId: z.string().min(1).max(40),
  body: z.string().trim().min(1, "내용을 입력해 주세요.").max(MESSAGE_MAX, `${MESSAGE_MAX}자까지 보낼 수 있어요.`),
});

async function policyFor(userId: string) {
  const s = await db.userSettings.findUnique({ where: { userId }, select: { messagePolicy: true } });
  return s?.messagePolicy ?? "FRIENDS";
}

export async function sendMessage(input: z.input<typeof sendSchema>): Promise<ActionResult<MessageDTO>> {
  const me = await getCurrentUser();
  if (!me) return fail(msg.unauthorized);
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { toUserId, body } = parsed.data;
  if (toUserId === me.id) return fail("나에게는 쪽지를 보낼 수 없어요.");
  if (!(await checkLimit("message", me.id))) return fail(msg.rateLimited);

  const target = await db.user.findFirst({ where: { id: toUserId, status: "ACTIVE" }, select: { id: true } });
  if (!target) return fail(msg.notFound);
  const rel = await getRelation(me.id, toUserId);
  const policy = await policyFor(toUserId);
  if (!canSendMessage(rel, policy)) {
    if (rel.state === "BLOCKED" || rel.state === "BLOCKED_BY") return fail(msg.blocked);
    return fail(policy === "FRIENDS" ? "친구에게만 쪽지를 보낼 수 있어요." : "이 사용자는 지금 쪽지를 받지 않아요.");
  }

  const [userAId, userBId] = orderPair(me.id, toUserId);
  const iAmA = me.id === userAId;
  const now = new Date();
  const created = await db.$transaction(async (tx) => {
    let conv = await tx.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } }, select: { id: true } });
    if (!conv) {
      try {
        conv = await tx.conversation.create({ data: { userAId, userBId }, select: { id: true } });
      } catch (e) {
        // 양쪽이 동시에 첫 쪽지를 보낸 경우
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
        conv = await tx.conversation.findUniqueOrThrow({ where: { userAId_userBId: { userAId, userBId } }, select: { id: true } });
      }
    }
    const m = await tx.message.create({ data: { conversationId: conv.id, senderId: me.id, body, createdAt: now } });
    await tx.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: now, lastPreview: body.slice(0, 80), lastSenderId: me.id, ...(iAmA ? { aReadAt: now } : { bReadAt: now }) },
    });
    return m;
  });
  await publish(toUserId, {
    type: "dm",
    from: { id: me.id, username: me.username },
    message: { id: created.id, body: created.body, createdAt: created.createdAt.toISOString() },
  });
  void sendPush(toUserId, { title: `${me.displayName}님의 쪽지`, body: body.slice(0, 120), url: `/messages/${me.username}`, tag: `dm:${me.id}` });
  revalidatePath("/messages", "layout");
  return ok({ id: created.id, body: created.body, createdAt: created.createdAt.toISOString(), mine: true });
}

/** 대화를 읽음으로 표시 */
export async function markConversationRead(otherId: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(msg.unauthorized);
  const [userAId, userBId] = orderPair(me.id, String(otherId));
  const iAmA = me.id === userAId;
  await db.conversation.updateMany({ where: { userAId, userBId }, data: iAmA ? { aReadAt: new Date() } : { bReadAt: new Date() } });
  revalidatePath("/", "layout");
  return ok();
}

/** 대화 나가기: 내 쪽지함에서만 지금까지의 대화를 지운다 (상대방에게는 남아 있음) */
export async function leaveConversation(otherId: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(msg.unauthorized);
  const [userAId, userBId] = orderPair(me.id, String(otherId));
  const iAmA = me.id === userAId;
  const now = new Date();
  await db.conversation.updateMany({ where: { userAId, userBId }, data: iAmA ? { aClearedAt: now, aReadAt: now } : { bClearedAt: now, bReadAt: now } });
  revalidatePath("/messages", "layout");
  return ok(undefined, "대화방을 나갔어요.");
}

/** 폴링: 마지막으로 받은 시각 이후 새 쪽지 (읽음 처리 포함) */
export async function pollMessages(otherId: string, after: string | null): Promise<MessageDTO[]> {
  const me = await getCurrentUser();
  if (!me) return [];
  const res = await listMessages(me.id, String(otherId), { after });
  if (res.items.some((m) => !m.mine)) await markConversationRead(String(otherId));
  return res.items;
}

/** 이전 쪽지 더 보기 */
export async function loadOlderMessages(otherId: string, before: string) {
  const me = await getCurrentUser();
  if (!me) return { items: [], nextCursor: null };
  const res = await listMessages(me.id, String(otherId), { before });
  return { items: res.items, nextCursor: res.nextCursor };
}
