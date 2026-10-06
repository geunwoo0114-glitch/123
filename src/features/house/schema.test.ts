import { describe, expect, it } from "vitest";
import { WALL_ROWS, WINDOW, collides, defaultHouse, elevationOf, findFreeSpot, footprint, furniture, furnitureByKind, inBounds, parseHouse, validateHouse, type HouseConfig } from "./schema";

const free = new Set<string>();

describe("2.5D 집", () => {
  it("기본 집은 무료 가구만으로 바로 저장할 수 있다", () => {
    expect(validateHouse(defaultHouse, free)).toBeNull();
  });

  it("가구 종류가 유일하고, 모델 파일 이름과 같다", () => {
    expect(new Set(furniture.map((f) => f.kind)).size).toBe(furniture.length);
  });

  it("회전하면 발자국 가로/세로가 바뀐다", () => {
    const bed = furnitureByKind.get("bedDouble")!;
    const a = footprint(bed, 0);
    const b = footprint(bed, 1);
    expect([b.w, b.d]).toEqual([a.d, a.w]);
  });

  it("큰 가구끼리는 겹칠 수 없다", () => {
    const h: HouseConfig = { ...defaultHouse, items: [{ k: "desk", x: 0, z: 0, r: 0, c: 0 }, { k: "bookcaseOpen", x: 1, z: 1, r: 0, c: 0 }] };
    expect(collides(h.items, 1)).toBe(true);
    expect(validateHouse(h, free)).toMatch(/겹쳐요/);
  });

  it("러그 위에는 가구를 놓을 수 있다", () => {
    const items = [{ k: "rugRound", x: 0, z: 0, r: 0, c: 0 }, { k: "tableCoffee", x: 0, z: 0, r: 0, c: 0 }];
    expect(collides(items, 1)).toBe(false);
  });

  it("소품은 받침 위에 올라가고 높이가 받침 높이가 된다", () => {
    const items = [{ k: "desk", x: 0, z: 0, r: 0, c: 0 }, { k: "laptop", x: 0, z: 0, r: 0, c: 0 }];
    expect(collides(items, 1)).toBe(false);
    expect(elevationOf(items, 1)).toBeCloseTo(furnitureByKind.get("desk")!.size[1]);
    // 받침이 아닌 가구(침대) 위에는 올릴 수 없다
    expect(collides([{ k: "bedSingle", x: 0, z: 0, r: 0, c: 0 }, { k: "laptop", x: 0, z: 0, r: 0, c: 0 }], 1)).toBe(true);
  });

  it("보유하지 않은 유료 가구, 방 밖, 개수 초과를 막는다", () => {
    const paid: HouseConfig = { ...defaultHouse, items: [{ k: "bedDouble", x: 0, z: 0, r: 0, c: 0 }] };
    expect(validateHouse(paid, free)).toMatch(/갖고 있지 않아요/);
    expect(validateHouse(paid, new Set(["house.bedDouble"]))).toBeNull();
    expect(validateHouse({ ...defaultHouse, items: [{ k: "bedSingle", x: 15, z: 0, r: 0, c: 0 }] }, free)).toMatch(/방 밖/);
    const many = Array.from({ length: 5 }, (_, i) => ({ k: "pottedPlant", x: i * 2, z: 11, r: 0, c: 0 }));
    expect(validateHouse({ ...defaultHouse, items: many }, free)).toMatch(/4개까지/);
  });

  it("색을 바꿀 수 없는 가구에 색을 지정하면 거절한다", () => {
    expect(validateHouse({ ...defaultHouse, items: [{ k: "desk", x: 0, z: 0, r: 0, c: 2 }] }, free)).toMatch(/색을 바꿀 수 없어요/);
  });

  it("잘못된 데이터는 기본 집으로, 사라진 가구는 빼고 읽는다", () => {
    expect(parseHouse(null)).toEqual(defaultHouse);
    expect(parseHouse({ ...defaultHouse, items: [{ k: "spaceship", x: 0, z: 0, r: 0, c: 0 }] }).items).toEqual([]);
  });

  it("빈 자리를 찾아 겹치지 않게 놓는다", () => {
    const spot = findFreeSpot(defaultHouse.items, "bookcaseOpen")!;
    const next = [...defaultHouse.items, spot];
    expect(collides(next, next.length - 1)).toBe(false);
  });
});

describe("2.5D 집 벽걸이", () => {
  it("벽걸이는 벽 번호가 있어야 하고, 벽 안에만 걸 수 있다", () => {
    const def = furnitureByKind.get("wallPoster")!;
    expect(inBounds({ k: "wallPoster", x: 0, z: 0, r: 0, c: 0 }, def)).toBe(false);
    expect(inBounds({ k: "wallPoster", x: 0, z: 0, r: 0, c: 0, wl: 0 }, def)).toBe(true);
    // 포스터는 3칸 높이라 위쪽 끝에는 못 건다
    expect(inBounds({ k: "wallPoster", x: 0, z: WALL_ROWS - 2, r: 0, c: 0, wl: 0 }, def)).toBe(false);
    // 바닥 가구에는 벽 번호를 붙일 수 없다
    expect(inBounds({ k: "desk", x: 0, z: 0, r: 0, c: 0, wl: 1 }, furnitureByKind.get("desk")!)).toBe(false);
  });

  it("같은 벽의 장식끼리, 그리고 창문과는 겹칠 수 없다", () => {
    const items = [
      { k: "wallFrameLarge", x: 0, z: 1, r: 0, c: 0, wl: 0 },
      { k: "wallFrameSmall", x: 1, z: 2, r: 0, c: 0, wl: 0 },
    ];
    expect(collides(items, 1)).toBe(true);
    // 다른 벽이면 괜찮다
    expect(collides([items[0], { ...items[1], wl: 1 }], 1)).toBe(false);
    // 창문 자리
    expect(collides([{ k: "wallClock", x: WINDOW.x0, z: WINDOW.y0, r: 0, c: 0, wl: WINDOW.wall }], 0)).toBe(true);
  });

  it("벽걸이는 바닥 가구와는 겹침을 따지지 않는다", () => {
    const items = [
      { k: "desk", x: 0, z: 0, r: 0, c: 0 },
      { k: "wallShelf", x: 0, z: 0, r: 0, c: 0, wl: 0 },
    ];
    expect(collides(items, 0)).toBe(false);
    expect(collides(items, 1)).toBe(false);
  });

  it("빈 벽 자리를 고른 벽 순서대로 찾는다", () => {
    const spot = findFreeSpot(defaultHouse.items, "wallMirror", [1, 0])!;
    expect(spot.wl).toBe(1);
    const next = [...defaultHouse.items, spot];
    expect(collides(next, next.length - 1)).toBe(false);
  });
});
