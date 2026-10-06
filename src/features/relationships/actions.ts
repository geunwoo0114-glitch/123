"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { checkLimit } from "@/lib/rate-limit";
import { fail, fromZodError, messages, ok, type ActionResult } from "@/lib/action";
import { notify, retractNotification } from "@/features/notifications/service";
import { track } from "@/features/analytics/track";
import { getRelation, orderPair } from "./queries";

const idSchema = z.string().min(1).max(40);
const labelSchema = z.string().trim().max(12, "12자 이내로 적어 주세요.").optional().transform((v) => v || null);

function revalidateRelation(username?: string) {
  revalidatePath("/friends");
  revalidatePath("/");
  if (username) revalidatePath(`/u/${username}`, "layout");
}

async function activeTarget(targetId: string) {
  return db.user.findFirst({
    where: { id: targetId, status: "ACTIVE" },
    select: { id: true, username: true, settings: { select: { allowFriendRequests: true } } },
  });
}

const requestSchema = z.object({
  targetId: idSchema,
  label: labelSchema,
  message: z.string().trim().max(100, "100자 이내로 적어 주세요.").optional().transform((v) => v || null),
});

/** 친구 신청. 상대가 이미 나에게 신청했다면 바로 친구가 된다. */
export async function sendFriendRequest(input: z.input<typeof requestSchema>): Promise<ActionResult<{ state: string }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { targetId, label, message } = parsed.data;
  if (targetId === me.id) return fail("나 자신에게는 신청할 수 없어요.");
  if (!(await checkLimit("friendRequest", me.id))) return fail(messages.rateLimited);

  const target = await activeTarget(targetId);
  if (!target) return fail(messages.notFound);
  const rel = await getRelation(me.id, targetId);
  if (rel.state === "BLOCKED" || rel.state === "BLOCKED_BY") return fail(messages.blocked);
  if (rel.state === "FRIENDS") return ok({ state: "FRIENDS" });
  if (rel.state === "REQUEST_SENT") return ok({ state: "REQUEST_SENT" }, "이미 친구 신청을 보냈어요.");
  if (rel.state === "REQUEST_RECEIVED") return respondFriendRequest({ targetId, accept: true, label: label ?? undefined });
  if (target.settings && !target.settings.allowFriendRequests) return fail("이 사용자는 지금 친구 신청을 받지 않아요.");

  const [userAId, userBId] = orderPair(me.id, targetId);
  const iAmA = me.id === userAId;
  try {
    await db.friendship.create({
      data: {
        userAId,
        userBId,
        requesterId: me.id,
        message,
        labelAtoB: iAmA ? label : null,
        labelBtoA: iAmA ? null : label,
      },
    });
  } catch (e) {
    // 동시에 두 번 눌렀거나 상대가 동시에 신청한 경우: 현재 상태를 그대로 돌려준다
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return ok({ state: "REQUEST_SENT" });
    }
    throw e;
  }
  await notify({
    recipientId: targetId,
    actorId: me.id,
    type: "FRIEND_REQUEST",
    dedupeKey: `friend-req:${userAId}:${userBId}:${me.id}`,
    preview: message ?? undefined,
  });
  track("friend_request", me.id);
  revalidateRelation(target.username);
  return ok({ state: "REQUEST_SENT" }, "친구 신청을 보냈어요.");
}

const respondSchema = z.object({ targetId: idSchema, accept: z.boolean(), label: labelSchema });

export async function respondFriendRequest(input: z.input<typeof respondSchema>): Promise<ActionResult<{ state: string }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { targetId, accept, label } = parsed.data;
  const [userAId, userBId] = orderPair(me.id, targetId);

  const f = await db.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
  if (!f || f.status !== "PENDING" || f.requesterId === me.id) return fail("처리할 친구 신청이 없어요.");

  const target = await db.user.findUnique({ where: { id: targetId }, select: { username: true } });
  if (!accept) {
    await db.friendship.delete({ where: { id: f.id } });
    await retractNotification(`friend-req:${userAId}:${userBId}:${targetId}`);
    revalidateRelation(target?.username);
    return ok({ state: "NONE" }, "친구 신청을 거절했어요.");
  }

  const iAmA = me.id === userAId;
  // 조건부 업데이트로 중복 수락(race) 방지
  const updated = await db.friendship.updateMany({
    where: { id: f.id, status: "PENDING" },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
      ...(label !== null ? (iAmA ? { labelAtoB: label } : { labelBtoA: label }) : {}),
    },
  });
  if (updated.count === 1) {
    await notify({
      recipientId: targetId,
      actorId: me.id,
      type: "FRIEND_ACCEPT",
      dedupeKey: `friend-accept:${userAId}:${userBId}`,
    });
    track("friend_accept", me.id);
  }
  revalidateRelation(target?.username);
  return ok({ state: "FRIENDS" }, "이제 친구예요!");
}

/** 보낸 신청 취소 / 친구 끊기 */
export async function removeFriendship(input: { targetId: string }): Promise<ActionResult<{ state: string }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const targetId = idSchema.safeParse(input.targetId);
  if (!targetId.success) return fail(messages.notFound);
  const [userAId, userBId] = orderPair(me.id, targetId.data);
  const f = await db.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
  if (!f) return ok({ state: "NONE" });
  if (f.status === "PENDING" && f.requesterId !== me.id) return fail("받은 신청은 거절로 처리해 주세요.");

  await db.$transaction([
    db.friendship.delete({ where: { id: f.id } }),
    db.closeFriend.deleteMany({
      where: {
        OR: [
          { ownerId: me.id, friendId: targetId.data },
          { ownerId: targetId.data, friendId: me.id },
        ],
      },
    }),
  ]);
  if (f.status === "PENDING") await retractNotification(`friend-req:${userAId}:${userBId}:${me.id}`);
  const target = await db.user.findUnique({ where: { id: targetId.data }, select: { username: true } });
  revalidateRelation(target?.username);
  return ok({ state: "NONE" }, f.status === "PENDING" ? "친구 신청을 취소했어요." : "친구를 끊었어요.");
}

/** 우리 사이 이름(일촌명) 변경 - 내가 상대를 부르는 이름 */
export async function setFriendLabel(input: { targetId: string; label?: string }): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = z.object({ targetId: idSchema, label: labelSchema }).safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const [userAId, userBId] = orderPair(me.id, parsed.data.targetId);
  const iAmA = me.id === userAId;
  const res = await db.friendship.updateMany({
    where: { userAId, userBId, status: "ACCEPTED" },
    data: iAmA ? { labelAtoB: parsed.data.label } : { labelBtoA: parsed.data.label },
  });
  if (res.count === 0) return fail("친구 사이에서만 이름을 정할 수 있어요.");
  revalidateRelation();
  return ok(undefined, "우리 사이 이름을 바꿨어요.");
}

export async function toggleCloseFriend(input: { targetId: string; close: boolean }): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = z.object({ targetId: idSchema, close: z.boolean() }).safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { targetId, close } = parsed.data;
  if (close) {
    const rel = await getRelation(me.id, targetId);
    if (rel.state !== "FRIENDS") return fail("친구만 친한 친구로 지정할 수 있어요.");
    await db.closeFriend.upsert({
      where: { ownerId_friendId: { ownerId: me.id, friendId: targetId } },
      create: { ownerId: me.id, friendId: targetId },
      update: {},
    });
  } else {
    await db.closeFriend.deleteMany({ where: { ownerId: me.id, friendId: targetId } });
  }
  revalidatePath("/friends");
  return ok(undefined, close ? "친한 친구로 지정했어요." : "친한 친구에서 뺐어요.");
}

export async function setFollow(input: { targetId: string; follow: boolean }): Promise<ActionResult<{ following: boolean }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = z.object({ targetId: idSchema, follow: z.boolean() }).safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { targetId, follow } = parsed.data;
  if (targetId === me.id) return fail("나 자신은 팔로우할 수 없어요.");

  if (follow) {
    if (!(await checkLimit("follow", me.id))) return fail(messages.rateLimited);
    const rel = await getRelation(me.id, targetId);
    if (rel.state === "BLOCKED" || rel.state === "BLOCKED_BY") return fail(messages.blocked);
    if (!(await activeTarget(targetId))) return fail(messages.notFound);
    await db.follow.upsert({
      where: { followerId_followingId: { followerId: me.id, followingId: targetId } },
      create: { followerId: me.id, followingId: targetId },
      update: {},
    });
    await notify({ recipientId: targetId, actorId: me.id, type: "FOLLOW", dedupeKey: `follow:${me.id}:${targetId}` });
    track("follow", me.id);
  } else {
    await db.follow.deleteMany({ where: { followerId: me.id, followingId: targetId } });
  }
  const target = await db.user.findUnique({ where: { id: targetId }, select: { username: true } });
  revalidateRelation(target?.username);
  return ok({ following: follow }, follow ? "소식을 받아볼게요." : "소식 받기를 그만뒀어요.");
}

/**
 * 차단: 친구 관계/친한 친구/팔로우를 양방향으로 정리한다.
 * 차단된 사람은 내 공간, 글, 방명록, 검색 결과에 접근할 수 없다.
 */
export async function setBlock(input: { targetId: string; block: boolean }): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = z.object({ targetId: idSchema, block: z.boolean() }).safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { targetId, block } = parsed.data;
  if (targetId === me.id) return fail("나 자신은 차단할 수 없어요.");

  if (block) {
    if (!(await db.user.findUnique({ where: { id: targetId }, select: { id: true } }))) return fail(messages.notFound);
    const [userAId, userBId] = orderPair(me.id, targetId);
    await db.$transaction([
      db.block.upsert({
        where: { blockerId_blockedId: { blockerId: me.id, blockedId: targetId } },
        create: { blockerId: me.id, blockedId: targetId },
        update: {},
      }),
      db.friendship.deleteMany({ where: { userAId, userBId } }),
      db.closeFriend.deleteMany({
        where: { OR: [{ ownerId: me.id, friendId: targetId }, { ownerId: targetId, friendId: me.id }] },
      }),
      db.follow.deleteMany({
        where: { OR: [{ followerId: me.id, followingId: targetId }, { followerId: targetId, followingId: me.id }] },
      }),
    ]);
  } else {
    await db.block.deleteMany({ where: { blockerId: me.id, blockedId: targetId } });
  }
  const target = await db.user.findUnique({ where: { id: targetId }, select: { username: true } });
  revalidateRelation(target?.username);
  revalidatePath("/settings/privacy");
  return ok(undefined, block ? "차단했어요. 서로의 공간을 볼 수 없어요." : "차단을 해제했어요.");
}
