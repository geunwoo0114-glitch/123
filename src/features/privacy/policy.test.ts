import { describe, expect, it } from "vitest";
import {
  canDeleteComment,
  canDeleteGuestbookEntry,
  canReadGuestbookEntry,
  canViewContent,
  canWriteGuestbook,
  visibleLevels,
  type Relation,
} from "./policy";

const rel = (state: Relation["state"], extra: Partial<Relation> = {}): Relation => ({
  viewerId: state === "NONE" && extra.viewerId === null ? null : "viewer",
  ownerId: "owner",
  state,
  isCloseFriend: false,
  isFollowing: false,
  ...extra,
});

describe("canViewContent", () => {
  it("본인은 모든 공개 범위를 볼 수 있다", () => {
    expect(visibleLevels(rel("SELF"))).toEqual(["PUBLIC", "FRIENDS", "CLOSE_FRIENDS", "PRIVATE"]);
  });
  it("비로그인/타인은 전체 공개만", () => {
    expect(visibleLevels(rel("NONE", { viewerId: null }))).toEqual(["PUBLIC"]);
    expect(visibleLevels(rel("REQUEST_SENT"))).toEqual(["PUBLIC"]);
  });
  it("친구는 친구 공개까지, 친한 친구 지정 시 친한 친구 공개까지", () => {
    expect(visibleLevels(rel("FRIENDS"))).toEqual(["PUBLIC", "FRIENDS"]);
    expect(visibleLevels(rel("FRIENDS", { isCloseFriend: true }))).toEqual(["PUBLIC", "FRIENDS", "CLOSE_FRIENDS"]);
  });
  it("친구가 아니면 친한 친구 플래그가 있어도 볼 수 없다", () => {
    expect(canViewContent(rel("NONE", { isCloseFriend: true }), "CLOSE_FRIENDS")).toBe(false);
  });
  it("차단 관계에서는 전체 공개도 볼 수 없다", () => {
    expect(canViewContent(rel("BLOCKED"), "PUBLIC")).toBe(false);
    expect(canViewContent(rel("BLOCKED_BY"), "PUBLIC")).toBe(false);
  });
  it("비공개는 본인만", () => {
    expect(canViewContent(rel("FRIENDS", { isCloseFriend: true }), "PRIVATE")).toBe(false);
  });
});

describe("guestbook", () => {
  it("정책에 따라 작성 가능 여부가 달라진다", () => {
    expect(canWriteGuestbook(rel("NONE"), "EVERYONE")).toBe(true);
    expect(canWriteGuestbook(rel("NONE"), "FRIENDS")).toBe(false);
    expect(canWriteGuestbook(rel("FRIENDS"), "FRIENDS")).toBe(true);
    expect(canWriteGuestbook(rel("FRIENDS"), "NOBODY")).toBe(false);
  });
  it("비로그인, 본인, 차단 관계는 작성할 수 없다", () => {
    expect(canWriteGuestbook(rel("NONE", { viewerId: null }), "EVERYONE")).toBe(false);
    expect(canWriteGuestbook(rel("SELF"), "EVERYONE")).toBe(false);
    expect(canWriteGuestbook(rel("BLOCKED_BY"), "EVERYONE")).toBe(false);
  });
  it("비밀글은 주인과 작성자만 읽는다", () => {
    const e = { hostId: "h", authorId: "a", isSecret: true };
    expect(canReadGuestbookEntry("h", e)).toBe(true);
    expect(canReadGuestbookEntry("a", e)).toBe(true);
    expect(canReadGuestbookEntry("x", e)).toBe(false);
    expect(canReadGuestbookEntry(null, e)).toBe(false);
    expect(canReadGuestbookEntry(null, { ...e, isSecret: false })).toBe(true);
  });
  it("삭제는 주인과 작성자만", () => {
    expect(canDeleteGuestbookEntry("h", { hostId: "h", authorId: "a" })).toBe(true);
    expect(canDeleteGuestbookEntry("x", { hostId: "h", authorId: "a" })).toBe(false);
  });
});

describe("comments", () => {
  it("댓글 작성자와 게시물 작성자만 삭제할 수 있다", () => {
    expect(canDeleteComment("c", { authorId: "c" }, { authorId: "p" })).toBe(true);
    expect(canDeleteComment("p", { authorId: "c" }, { authorId: "p" })).toBe(true);
    expect(canDeleteComment("x", { authorId: "c" }, { authorId: "p" })).toBe(false);
  });
});
