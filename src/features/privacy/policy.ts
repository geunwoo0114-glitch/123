/**
 * 공개 범위/권한 판단 규칙. 순수 함수만 두어 서버 어디서나 재사용하고 단위 테스트한다.
 * UI에서 버튼을 숨기는 것과 별개로 모든 서버 조회/변경은 이 규칙을 거친다.
 */
export type Visibility = "PUBLIC" | "FRIENDS" | "CLOSE_FRIENDS" | "PRIVATE";
export type GuestbookPolicy = "EVERYONE" | "FRIENDS" | "NOBODY";
export type MessagePolicy = "EVERYONE" | "FRIENDS" | "NOBODY";

export type FriendState = "SELF" | "NONE" | "REQUEST_SENT" | "REQUEST_RECEIVED" | "FRIENDS" | "BLOCKED" | "BLOCKED_BY";

/** 보는 사람(viewer)과 공간 주인(owner) 사이의 관계 */
export type Relation = {
  viewerId: string | null;
  ownerId: string;
  state: FriendState;
  /** owner가 viewer를 친한 친구로 지정했는지 */
  isCloseFriend: boolean;
  /** viewer가 owner를 팔로우 중인지 */
  isFollowing: boolean;
};

export const isSelf = (r: Relation) => r.state === "SELF";
export const isFriend = (r: Relation) => r.state === "FRIENDS";
export const isBlocked = (r: Relation) => r.state === "BLOCKED" || r.state === "BLOCKED_BY";

export function canViewContent(r: Relation, visibility: Visibility): boolean {
  if (isSelf(r)) return true;
  if (isBlocked(r)) return false;
  switch (visibility) {
    case "PUBLIC":
      return true;
    case "FRIENDS":
      return isFriend(r);
    case "CLOSE_FRIENDS":
      return isFriend(r) && r.isCloseFriend;
    case "PRIVATE":
      return false;
  }
}

/** Prisma `in` 필터에 쓰는, viewer가 볼 수 있는 공개 범위 목록 */
export function visibleLevels(r: Relation): Visibility[] {
  const all: Visibility[] = ["PUBLIC", "FRIENDS", "CLOSE_FRIENDS", "PRIVATE"];
  return all.filter((v) => canViewContent(r, v));
}

/** 공간(홈) 자체를 둘러볼 수 있는지. 불가하면 프로필 카드만 노출. */
export function canViewSpace(r: Relation, spaceVisibility: Visibility): boolean {
  return canViewContent(r, spaceVisibility);
}

export function canWriteGuestbook(r: Relation, policy: GuestbookPolicy): boolean {
  if (!r.viewerId || isSelf(r) || isBlocked(r)) return false;
  if (policy === "NOBODY") return false;
  if (policy === "FRIENDS") return isFriend(r);
  return true;
}

/**
 * 쪽지 보내기. 기본 정책은 '친구만'이라 낯선 사람의 스팸 쪽지를 막는다.
 * 이미 오간 대화가 있어도 정책/차단이 바뀌면 새 쪽지는 보낼 수 없다.
 */
export function canSendMessage(r: Relation, policy: MessagePolicy): boolean {
  if (!r.viewerId || isSelf(r) || isBlocked(r)) return false;
  if (policy === "NOBODY") return false;
  if (policy === "FRIENDS") return isFriend(r);
  return true;
}

/** 방명록 글을 볼 수 있는지 (비밀글은 주인과 작성자만) */
export function canReadGuestbookEntry(
  viewerId: string | null,
  entry: { hostId: string; authorId: string; isSecret: boolean },
): boolean {
  if (!entry.isSecret) return true;
  return viewerId !== null && (viewerId === entry.hostId || viewerId === entry.authorId);
}

/** 방명록 글 삭제: 공간 주인 또는 작성자 */
export function canDeleteGuestbookEntry(viewerId: string | null, entry: { hostId: string; authorId: string }): boolean {
  return viewerId !== null && (viewerId === entry.hostId || viewerId === entry.authorId);
}

/** 댓글 삭제: 댓글 작성자 또는 게시물 작성자 */
export function canDeleteComment(viewerId: string | null, comment: { authorId: string }, post: { authorId: string }): boolean {
  return viewerId !== null && (viewerId === comment.authorId || viewerId === post.authorId);
}

export function canInteract(r: Relation): boolean {
  return r.viewerId !== null && !isBlocked(r);
}

export const visibilityLabels: Record<Visibility, string> = {
  PUBLIC: "전체 공개",
  FRIENDS: "친구 공개",
  CLOSE_FRIENDS: "친한 친구",
  PRIVATE: "나만 보기",
};
