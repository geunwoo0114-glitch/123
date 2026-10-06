import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { appConfig } from "@/config/app";
import { brand } from "@/config/brand";

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** 공개 키는 실행 시점에 읽는다 (예전 이름 NEXT_PUBLIC_…도 지원). 브라우저에는 설정 화면이 props로 넘긴다 */
const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY;

/** VAPID 키가 설정된 환경에서만 푸시를 보낸다 (없으면 조용히 비활성화) */
export const pushEnabled = Boolean(publicKey && privateKey);
/** 브라우저 구독에 쓰는 공개 키 (푸시가 꺼져 있으면 빈 문자열) */
export const vapidPublicKey = pushEnabled ? publicKey : "";
if (pushEnabled) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hello@darak.app", publicKey, privateKey!);

/** 서비스 타임존 기준 밤 11시 ~ 아침 8시 */
export function isQuietHour(now = new Date()): boolean {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: appConfig.serviceTimezone }).format(now));
  return hour >= 23 || hour < 8;
}

/**
 * 한 사용자의 모든 기기로 푸시를 보낸다. 실패해도 본 동작을 막지 않는다.
 * 만료된 구독(404/410)은 정리한다.
 */
export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  if (!pushEnabled) return;
  try {
    const [subs, settings] = await Promise.all([
      db.pushSubscription.findMany({ where: { userId } }),
      db.userSettings.findUnique({ where: { userId }, select: { pushQuietHours: true } }),
    ]);
    if (subs.length === 0) return;
    if ((settings?.pushQuietHours ?? true) && isQuietHour()) return;
    const body = JSON.stringify({ ...payload, title: payload.title || brand.name, icon: "/icons/icon-192.png", badge: "/icons/badge-72.png" });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24 });
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await db.pushSubscription.deleteMany({ where: { id: s.id } });
          else logger.warn("push send failed", { err, status });
        }
      }),
    );
  } catch (err) {
    logger.warn("sendPush failed", { err, userId });
  }
}
