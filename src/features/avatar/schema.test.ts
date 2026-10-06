import { describe, expect, it } from "vitest";
import { decodeAvatar, defaultAvatar, encodeAvatar, parseAvatar, randomAvatar } from "./schema";

describe("avatar schema", () => {
  it("encode/decode 왕복", () => {
    const c = { ...defaultAvatar, hair: 42, body: 7, glasses: 3, bg: 5 };
    expect(decodeAvatar(encodeAvatar(c))).toEqual(c);
  });
  it("범위를 벗어난 값/잘못된 코드는 거부", () => {
    expect(parseAvatar({ ...defaultAvatar, hair: 64 })).toBeNull();
    expect(decodeAvatar("1-2-3")).toBeNull();
    expect(decodeAvatar("../../etc")).toBeNull();
  });
  it("randomAvatar는 결정적이고 허용 목록 안에서만 고른다", () => {
    const onlyFree = (slot: string, i: number) => slot !== "hair" || i < 5;
    expect(randomAvatar("minji", onlyFree)).toEqual(randomAvatar("minji", onlyFree));
    for (const s of ["a", "b", "c", "d", "e", "f"]) expect(randomAvatar(s, onlyFree).hair).toBeLessThan(5);
  });
});
