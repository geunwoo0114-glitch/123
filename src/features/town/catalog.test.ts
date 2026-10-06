import { describe, expect, it } from "vitest";
import { catalog, isFreeItem, isFreeRoomItem, missingItems, missingRoomItems, roomCatalog } from "./catalog";
import { defaultRoom } from "@/features/room/schema";
import { isFreeFurniture } from "@/features/house/schema";
import { defaultAvatar } from "@/features/avatar/schema";

describe("catalog", () => {
  it("모든 아이템 id가 유일하다", () => {
    expect(new Set(catalog.map((i) => i.id)).size).toBe(catalog.length);
  });
  it("무료 아이템은 가격이 0, 유료 아이템은 0보다 크다", () => {
    for (const i of catalog) {
      const free = i.kind === "avatar" ? isFreeItem(i.slot, i.index) : i.kind === "room" ? isFreeRoomItem(i.slot, i.index) : isFreeFurniture(i.id.slice("house.".length));
      expect(i.price === 0).toBe(free);
    }
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

describe("room catalog", () => {
  it("모든 슬롯의 0번(기본)은 무료이고 기본 방은 바로 쓸 수 있다", () => {
    for (const i of roomCatalog.filter((x) => x.index === 0)) expect(i.price).toBe(0);
    expect(missingRoomItems(defaultRoom, new Set())).toEqual([]);
  });
  it("유료 방 아이템은 보유해야 쓸 수 있다", () => {
    const room = { ...defaultRoom, wall: 4 };
    expect(missingRoomItems(room, new Set())).toEqual(["room.wall:4"]);
    expect(missingRoomItems(room, new Set(["room.wall:4"]))).toEqual([]);
  });
});
