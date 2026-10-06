import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { serviceDay } from "@/lib/dates";
import { appConfig } from "@/config/app";
import { economy } from "./games";

/** 서비스 타임존 기준 오늘 0시(UTC Date) */
export function startOfServiceDay(now = new Date()): Date {
  const day = serviceDay(now);
  // 서비스 타임존 오프셋을 계산해 '그 날의 0시'를 UTC로 변환
  const tzNow = new Date(now.toLocaleString("en-US", { timeZone: appConfig.serviceTimezone }));
  const offsetMs = tzNow.getTime() - new Date(now.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(new Date(`${day}T00:00:00.000Z`).getTime() - offsetMs);
}

export async function todayGameEarnings(userId: string): Promise<number> {
  const agg = await db.coinTransaction.aggregate({
    where: { userId, reason: "GAME", createdAt: { gte: startOfServiceDay() } },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

export async function getWallet(userId: string) {
  const [user, earned, attendedToday, streak] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { coins: true } }),
    todayGameEarnings(userId),
    db.coinTransaction.findUnique({ where: { userId_refId: { userId, refId: `attendance:${serviceDay()}` } }, select: { id: true } }),
    attendanceStreak(userId),
  ]);
  return {
    coins: user?.coins ?? 0,
    gameEarnedToday: earned,
    gameCapRemaining: Math.max(0, economy.dailyGameCap - earned),
    attendedToday: !!attendedToday,
    streak,
  };
}

/** 연속 출석 일수 (오늘 포함, 오늘 안 했으면 어제까지) */
export async function attendanceStreak(userId: string): Promise<number> {
  const rows = await db.coinTransaction.findMany({
    where: { userId, reason: "ATTENDANCE", refId: { startsWith: "attendance:" } },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { refId: true },
  });
  const days = new Set(rows.map((r) => r.refId!.slice("attendance:".length)));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(serviceDay(cursor))) cursor.setTime(cursor.getTime() - 86400000);
  while (days.has(serviceDay(cursor))) {
    streak++;
    cursor.setTime(cursor.getTime() - 86400000);
  }
  return streak;
}

/** 원장 기록 + 잔액 변경을 하나의 트랜잭션으로. refId 중복이면 false */
export async function grantCoins(userId: string, amount: number, reason: "SIGNUP_BONUS" | "ATTENDANCE" | "GAME" | "ADMIN", refId: string): Promise<boolean> {
  try {
    await db.$transaction([
      db.coinTransaction.create({ data: { userId, amount, reason, refId } }),
      db.user.update({ where: { id: userId }, data: { coins: { increment: amount } } }),
    ]);
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false;
    throw e;
  }
}

export async function ownedItemIds(userId: string): Promise<Set<string>> {
  const rows = await db.userItem.findMany({ where: { userId }, select: { itemId: true } });
  return new Set(rows.map((r) => r.itemId));
}
