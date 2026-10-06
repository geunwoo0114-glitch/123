"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { getHomeFeed } from "./queries";
import { listUserPosts } from "@/features/posts/queries";
import { listNotifications } from "@/features/notifications/queries";

/** 무한 스크롤: 홈 피드 다음 페이지 */
export async function loadFeedPage(cursor: string) {
  const me = await getCurrentUser();
  if (!me) return { items: [], nextCursor: null };
  const { items, nextCursor } = await getHomeFeed(me.id, cursor);
  return { items, nextCursor };
}

/** 무한 스크롤: 한 사람의 소식 다음 페이지 (권한 필터 포함) */
export async function loadUserPostsPage(ownerId: string, cursor: string) {
  const me = await getCurrentUser();
  return listUserPosts(ownerId, me?.id ?? null, cursor);
}

export async function loadNotificationsPage(cursor: string) {
  const me = await getCurrentUser();
  if (!me) return { items: [], nextCursor: null };
  return listNotifications(me.id, cursor);
}
