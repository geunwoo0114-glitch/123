"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { serviceDay } from "@/lib/dates";
import { fail, messages, ok, type ActionResult } from "@/lib/action";
import { avatarSchema } from "@/features/avatar/schema";
import { brand } from "@/config/brand";
import { josa } from "@/lib/josa";
import { economy, gameIds, games, type GameId } from "./games";
import { itemById, missingItems, missingRoomItems } from "./catalog";
import { houseSchema, validateHouse } from "@/features/house/schema";
import { roomSchema } from "@/features/room/schema";
import { attendanceStreak, grantCoins, ownedItemIds, todayGameEarnings } from "./service";
import { checkLimit } from "@/lib/rate-limit";
import { getRelation } from "@/features/relationships/queries";
import { notify } from "@/features/notifications/service";

const c = brand.currency;

export async function claimAttendance(): Promise<ActionResult<{ reward: number; streak: number }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const day = serviceDay();
  const prevStreak = await attendanceStreak(me.id);
  const streak = prevStreak + 1;
  const bonus = streak % economy.streakDays === 0 ? economy.attendanceStreakBonus : 0;
  const granted = await grantCoins(me.id, economy.attendance + bonus, "ATTENDANCE", `attendance:${day}`);
  if (!granted) return fail("오늘은 이미 출석했어요. 내일 또 만나요!");
  revalidatePath("/town", "layout");
  return ok(
    { reward: economy.attendance + bonus, streak },
    bonus ? `${streak}일 연속 출석! ${c.emoji} ${economy.attendance + bonus}개를 받았어요.` : `출석 완료! ${c.emoji} ${economy.attendance}개를 받았어요.`,
  );
}

export async function startGame(game: string): Promise<ActionResult<{ sessionId: string }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  if (!gameIds.includes(game as GameId)) return fail(messages.notFound);
  if (!(await rateLimit(`game:${me.id}`, 60, 3600))) return fail(messages.rateLimited);
  const session = await db.gameSession.create({ data: { userId: me.id, game }, select: { id: true } });
  return ok({ sessionId: session.id });
}

const finishSchema = z.object({ sessionId: z.string().min(1).max(40), score: z.number().int().min(0).max(10_000) });

/**
 * 게임 종료 + 보상. 서버 기준 경과 시간으로 점수 타당성을 검증하고,
 * 하루 상한을 넘는 보상은 지급하지 않는다(게임은 계속 즐길 수 있음).
 */
export async function finishGame(input: z.input<typeof finishSchema>): Promise<ActionResult<{ reward: number; capped: boolean }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = finishSchema.safeParse(input);
  if (!parsed.success) return fail("기록을 확인할 수 없어요.");
  const { sessionId, score } = parsed.data;

  const session = await db.gameSession.findFirst({ where: { id: sessionId, userId: me.id, finishedAt: null } });
  if (!session) return fail("이미 끝난 게임이에요.");
  const def = games[session.game as GameId];
  const elapsed = (Date.now() - session.startedAt.getTime()) / 1000;
  const valid = def && elapsed >= def.minSeconds && elapsed <= def.maxSeconds && score <= def.maxScore;

  const earned = await todayGameEarnings(me.id);
  const raw = valid ? def.reward(score) : 0;
  const reward = Math.max(0, Math.min(raw, economy.dailyGameCap - earned));

  // finishedAt이 비어 있을 때만 갱신 → 같은 세션으로 두 번 보상받을 수 없다
  const closed = await db.gameSession.updateMany({
    where: { id: sessionId, finishedAt: null },
    data: { finishedAt: new Date(), score: valid ? score : 0, reward },
  });
  if (closed.count === 0) return fail("이미 끝난 게임이에요.");
  if (reward > 0) await grantCoins(me.id, reward, "GAME", `game:${sessionId}`);
  revalidatePath("/town", "layout");
  if (!valid) return ok({ reward: 0, capped: false }, "기록이 올바르지 않아 보상이 없어요.");
  return ok({ reward, capped: raw > reward }, reward > 0 ? `${c.emoji} ${reward}개를 모았어요!` : "오늘 받을 수 있는 보상을 모두 받았어요.");
}

export async function buyItem(itemId: string): Promise<ActionResult<{ coins: number }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const item = itemById(String(itemId));
  if (!item) return fail(messages.notFound);
  if (item.price === 0) return fail("기본 아이템은 이미 갖고 있어요.");

  try {
    const coins = await db.$transaction(async (tx) => {
      // 잔액이 충분할 때만 차감 (동시 구매 race 방지)
      const paid = await tx.user.updateMany({ where: { id: me.id, coins: { gte: item.price } }, data: { coins: { decrement: item.price } } });
      if (paid.count === 0) throw new InsufficientCoins();
      await tx.userItem.create({ data: { userId: me.id, itemId: item.id } });
      await tx.coinTransaction.create({ data: { userId: me.id, amount: -item.price, reason: "PURCHASE", refId: `item:${item.id}` } });
      return (await tx.user.findUniqueOrThrow({ where: { id: me.id }, select: { coins: true } })).coins;
    });
    revalidatePath("/town", "layout");
    const where = item.kind === "house" ? "2.5D 집에 놓아 보세요." : item.kind === "room" ? "미니룸에 놓아 보세요." : "옷장에서 입어보세요.";
    return ok({ coins }, `${josa(item.name, "을", "를")} 샀어요! ${where}`);
  } catch (e) {
    if (e instanceof InsufficientCoins) return fail(`${josa(c.name, "이", "가")} 부족해요. 미니게임으로 모아보세요!`);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail("이미 갖고 있는 아이템이에요.");
    throw e;
  }
}

class InsufficientCoins extends Error {}

/** 옷장: 보유한 아이템으로만 미니미를 꾸밀 수 있다 */
export async function saveCloset(input: unknown): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = avatarSchema.safeParse(input);
  if (!parsed.success) return fail("캐릭터 구성을 확인해 주세요.");
  const missing = missingItems(parsed.data, await ownedItemIds(me.id));
  if (missing.length) return fail("아직 갖고 있지 않은 아이템이 있어요. 상점에서 먼저 구매해 주세요.");
  await db.profile.update({ where: { userId: me.id }, data: { avatar: parsed.data } });
  revalidatePath("/", "layout");
  return ok(undefined, "미니미를 새로 꾸몄어요!");
}

const giftSchema = z.object({
  itemId: z.string().min(1).max(40),
  toUserId: z.string().min(1).max(40),
  message: z.string().trim().max(80, "80자까지 쓸 수 있어요.").default(""),
});

/**
 * 친구에게 미니미 아이템 선물하기 (싸이월드 '선물' 감성).
 * 내 밤톨을 차감하고 친구의 옷장에 아이템을 넣는다. 친구가 이미 갖고 있으면 전체를 되돌린다.
 */
export async function giftItem(input: z.input<typeof giftSchema>): Promise<ActionResult<{ coins: number }>> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = giftSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
  const { itemId, toUserId, message } = parsed.data;
  const item = itemById(itemId);
  if (!item || item.price === 0) return fail("선물할 수 없는 아이템이에요.");
  if (toUserId === me.id) return fail("나에게는 선물할 수 없어요. 상점에서 바로 사 보세요!");
  if (!(await checkLimit("gift", me.id))) return fail(messages.rateLimited);
  const rel = await getRelation(me.id, toUserId);
  if (rel.state !== "FRIENDS") return fail("친구에게만 선물할 수 있어요.");

  try {
    const coins = await db.$transaction(async (tx) => {
      const paid = await tx.user.updateMany({ where: { id: me.id, coins: { gte: item.price } }, data: { coins: { decrement: item.price } } });
      if (paid.count === 0) throw new InsufficientCoins();
      await tx.userItem.create({ data: { userId: toUserId, itemId: item.id } });
      const gift = await tx.gift.create({ data: { senderId: me.id, recipientId: toUserId, itemId: item.id, price: item.price, message } });
      await tx.coinTransaction.create({ data: { userId: me.id, amount: -item.price, reason: "GIFT_SENT", refId: `gift:${gift.id}` } });
      return { coins: (await tx.user.findUniqueOrThrow({ where: { id: me.id }, select: { coins: true } })).coins, giftId: gift.id };
    });
    await notify({
      recipientId: toUserId,
      actorId: me.id,
      type: "GIFT",
      targetId: item.id,
      dedupeKey: `gift:${coins.giftId}`,
      preview: message ? `${item.name} · "${message}"` : item.name,
    });
    revalidatePath("/town", "layout");
    return ok({ coins: coins.coins }, `${josa(item.name, "을", "를")} 선물했어요! 🎁`);
  } catch (e) {
    if (e instanceof InsufficientCoins) return fail(`${josa(c.name, "이", "가")} 부족해요. 미니게임으로 모아보세요!`);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail("친구가 이미 갖고 있는 아이템이에요.");
    throw e;
  }
}

/** 미니룸 꾸미기 저장: 보유한(또는 기본) 아이템으로만 꾸밀 수 있다 */
export async function saveRoom(input: unknown): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = roomSchema.safeParse(input);
  if (!parsed.success) return fail("방 구성을 확인해 주세요.");
  if (missingRoomItems(parsed.data, await ownedItemIds(me.id)).length) return fail("아직 갖고 있지 않은 아이템이 있어요. 상점에서 먼저 구매해 주세요.");
  await db.spaceSettings.upsert({ where: { userId: me.id }, create: { userId: me.id, room: parsed.data }, update: { room: parsed.data } });
  revalidatePath("/", "layout");
  return ok(undefined, "미니룸을 새로 꾸몄어요!");
}

/** 2.5D 집 저장: 보유한 가구만, 방 안에, 서로 겹치지 않게 */
export async function saveHouse(input: unknown): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = houseSchema.safeParse(input);
  if (!parsed.success) return fail("집 구성을 확인해 주세요.");
  const problem = validateHouse(parsed.data, await ownedItemIds(me.id));
  if (problem) return fail(problem);
  await db.spaceSettings.upsert({ where: { userId: me.id }, create: { userId: me.id, house: parsed.data }, update: { house: parsed.data } });
  revalidatePath("/", "layout");
  return ok(undefined, "집을 새로 꾸몄어요! 🏠");
}
