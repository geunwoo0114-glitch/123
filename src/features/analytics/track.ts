import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

/** 제품 분석 이벤트 이름 (외부 analytics 연동 시 그대로 전달) */
export type EventName =
  | "signup"
  | "login"
  | "onboarding_completed"
  | "profile_updated"
  | "space_customized"
  | "friend_request"
  | "friend_accept"
  | "follow"
  | "post_created"
  | "diary_created"
  | "album_created"
  | "photos_uploaded"
  | "profile_visit"
  | "guestbook_created";

/** 실패해도 사용자 동작을 막지 않는다 */
export function track(name: EventName, userId: string | null, props?: Prisma.InputJsonObject) {
  db.activityEvent
    .create({ data: { name, userId, props } })
    .catch((err) => logger.warn("analytics.track failed", { err, name }));
}
