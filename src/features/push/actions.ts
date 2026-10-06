"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { fail, messages, ok, type ActionResult } from "@/lib/action";
import { brand } from "@/config/brand";
import { sendPush } from "./service";

const subSchema = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith("https://"), "https 엔드포인트만 허용"),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** 이 기기에서 푸시 받기 */
export async function subscribePush(input: unknown): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  const parsed = subSchema.safeParse(input);
  if (!parsed.success) return fail("푸시 구독 정보를 확인할 수 없어요.");
  const { endpoint, keys } = parsed.data;
  const ua = (await headers()).get("user-agent")?.slice(0, 255) ?? null;
  // 같은 기기가 다른 계정으로 로그인했다면 구독 소유자를 바꾼다
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: me.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: ua },
    update: { userId: me.id, p256dh: keys.p256dh, auth: keys.auth, userAgent: ua },
  });
  return ok(undefined, "이 기기에서 알림을 받을게요.");
}

export async function unsubscribePush(endpoint: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  await db.pushSubscription.deleteMany({ where: { endpoint: String(endpoint), userId: me.id } });
  return ok(undefined, "이 기기의 알림을 껐어요.");
}

export async function sendTestPush(): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  await sendPush(me.id, { title: brand.name, body: "알림이 잘 도착했어요 🔔", url: "/notifications", tag: "test" });
  return ok(undefined, "테스트 알림을 보냈어요.");
}

export async function setQuietHours(on: boolean): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return fail(messages.unauthorized);
  await db.userSettings.upsert({ where: { userId: me.id }, create: { userId: me.id, pushQuietHours: !!on }, update: { pushQuietHours: !!on } });
  return ok(undefined, on ? "밤에는 조용히 할게요." : "밤에도 알림을 보낼게요.");
}
