import { describe, expect, it } from "vitest";
import { catalog, isFreeItem, missingItems } from "./catalog";
import { defaultAvatar } from "@/features/avatar/schema";

describe("catalog", () => {
  it("모든 아이템 id가 유일하다", () => {
    expect(new Set(catalog.map((i) => i.id)).size).toBe(catalog.length);
  });
  it("무료 아이템은 가격이 0, 유료 아이템은 0보다 크다", () => {
    for (const i of catalog) expect(i.price === 0).toBe(isFreeItem(i.slot, i.index));
  });
  it("얼굴 파트는 항상 무료", () => {
    expect(isFreeItem("lips", 29)).toBe(true);
  });
  it("보유하지 않은 유료 아이템을 찾아낸다", () => {
    const cfg = { ...defaultAvatar, hair: 0, body: 1 };
    expect(missingItems(cfg, new Set())).toEqual(["hair:0"]);
    expect(missingItems(cfg, new Set(["hair:0"]))).toEqual([]);
  });
});
